(function () {
  'use strict';

  var timer;
  var attempts = 0;
  var storageInfo = null;
  var storageRequested = false;

  var LOAD_PATTERN = /load(\s*average)?|carga\s*m[eé]dia|durchschnittliche\s*last|charge\s*moyenne|carga\s*media|средняя\s*загрузка|平均负载/i;
  var UPTIME_PATTERN = /uptime|tempo(\s*de)?\s*atividade|laufzeit|temps\s*d.activit|tiempo\s*de\s*actividad|tempo\s*ativo|время\s*работы|运行时间/i;
  var MEMORY_PATTERN = /memory|used|mem[oó]ria|speicher|m[eé]moire|память|内存/i;
  var STORAGE_PATTERN = /storage|disk|filesystem|mount|flash|root|overlay|disco|armazenamento|sistema\s*de\s*arquivos/i;

  function tr(text, fallback) {
    if (typeof window._ === 'function') {
      try {
        var translated = window._(text);
        if (translated) return translated;
      } catch (e) {}
    }
    return fallback || text;
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function compactUptime(value) {
    var v = clean(value);
    var days = v.match(/(\d+)\s*d/i);
    var hours = v.match(/(\d+)\s*h/i);
    var mins = v.match(/(\d+)\s*m/i);

    if (days)
      return days[1] + 'd' + (hours ? ' ' + hours[1] + 'h' : '');
    if (hours)
      return hours[1] + 'h' + (mins ? ' ' + mins[1] + 'm' : '');
    if (mins)
      return mins[1] + 'm';
    return v ? '<1m' : '';
  }

  function rows() {
    return document.querySelectorAll('#maincontent .tr');
  }

  function isOverview() {
    var page = document.body && document.body.getAttribute('data-page');
    var path = window.location.pathname.replace(/\/+$/, '');

    if (page === 'admin-status-overview' || /\/admin\/status\/overview$/.test(path))
      return true;

    /* GL.iNet 21.02 may render the overview directly at /cgi-bin/luci/. */
    if (/\/cgi-bin\/luci$/.test(path))
      return true;

    return false;
  }

  function rowValue(pattern) {
    var list = rows();

    for (var i = 0; i < list.length; i++) {
      var cells = list[i].querySelectorAll('.td');
      var label = cells.length ? clean(cells[0].textContent) : '';

      if (cells.length > 1 && pattern.test(label))
        return clean(cells[cells.length - 1].textContent);
    }

    return '';
  }

  function progressValue(pattern) {
    var list = rows();

    for (var i = 0; i < list.length; i++) {
      var cells = list[i].querySelectorAll('.td');
      var label = cells.length ? clean(cells[0].textContent) : '';
      var bar = list[i].querySelector('.cbi-progressbar');

      if (bar && (pattern.test(label) || (cells.length > 1 && pattern.test(clean(cells[1].textContent))))) {
        var title = clean(bar.getAttribute('title'));
        var match = title.match(/\((\d+(?:\.\d+)?)%\)/);
        return {
          text: match ? match[1] + '%' : (title || clean(cells[cells.length - 1].textContent)),
          percent: match ? Number(match[1]) : 0
        };
      }
    }

    return null;
  }

  function storageValue() {
    var bars = document.querySelectorAll('#maincontent .cbi-progressbar');

    for (var i = 0; i < bars.length; i++) {
      var section = bars[i].closest ? bars[i].closest('.cbi-section') : null;
      var heading = section && section.querySelector('h3, h4');
      var context = clean(heading && heading.textContent);

      if (STORAGE_PATTERN.test(context)) {
        var title = clean(bars[i].getAttribute('title'));
        var match = title.match(/\((\d+(?:\.\d+)?)%\)/);
        return { text: match ? match[1] + '%' : title, percent: match ? Number(match[1]) : 0 };
      }
    }

    return progressValue(STORAGE_PATTERN) || storageInfo;
  }

  function requestStorage() {
    if (storageRequested || !window.L || typeof L.require !== 'function')
      return;

    storageRequested = true;
    Promise.resolve(L.require('rpc')).then(function (rpc) {
      var callMountPoints = rpc.declare({
        object: 'luci',
        method: 'getMountPoints',
        expect: { result: [] }
      });

      return callMountPoints().then(function (mounts) {
        var root = null;

        for (var i = 0; i < mounts.length; i++) {
          if (mounts[i].mount === '/overlay') {
            root = mounts[i];
            break;
          }
          if (!root && mounts[i].mount === '/')
            root = mounts[i];
        }

        if (root && Number(root.size) > 0)
          return { root: { total: root.size, free: root.free } };

        return rpc.declare({ object: 'system', method: 'info' })();
      });
    }).then(function (info) {
      var root = info && info.root;
      var total = Number(root && root.total);
      var used = Number(root && root.used);
      var free = Number(root && root.free);

      if (!isFinite(used) && isFinite(total) && isFinite(free))
        used = total - free;

      if (isFinite(total) && total > 0 && isFinite(used)) {
        var percent = Math.max(0, Math.min(100, Math.round(used * 100 / total)));
        storageInfo = { text: percent + '%', percent: percent };
        update();
      }
    }).catch(function () {
      /* The card remains unavailable only if both LuCI storage APIs fail. */
    });
  }

  function metric(label, className) {
    var card = document.createElement('article');
    card.className = 'sl-metric is-loading ' + className;
    card.innerHTML = '<div class="sl-gauge"><div class="sl-gauge-value">--</div><div class="sl-gauge-label"></div></div>' +
      '<div class="sl-metric-detail">Loading…</div>';
    card.querySelector('.sl-gauge-label').textContent = label;
    return card;
  }

  function build() {
    var main = document.getElementById('maincontent');
    var firstSection = main && main.querySelector('.cbi-section, .network-status-table');
    var view = main && main.querySelector('#view');
    var summary = document.getElementById('streamline-overview-summary');

    if (!main || !isOverview())
      return null;

    if (summary)
      return summary;

    summary = document.createElement('section');
    summary.id = 'streamline-overview-summary';
    summary.className = 'sl-dashboard-summary';
    summary.innerHTML = '<div class="sl-dashboard-heading"><div><span>' +
      tr('ROUTER HEALTH', 'ROUTER HEALTH') + '</span><h3>' +
      tr('System overview', 'System overview') + '</h3></div>' +
      '<div class="sl-live-status is-loading" role="status" aria-label="' +
      tr('Loading…', 'Loading…') + '" title="' + tr('Loading…', 'Loading…') + '"><i></i></div></div><div class="sl-metric-grid"></div>';

    var grid = summary.querySelector('.sl-metric-grid');
    grid.appendChild(metric(tr('1 MIN LOAD', '1 MIN LOAD'), 'sl-load'));
    grid.appendChild(metric(tr('MEMORY USED', 'MEMORY USED'), 'sl-memory'));
    grid.appendChild(metric(tr('STORAGE USED', 'STORAGE USED'), 'sl-storage'));
    grid.appendChild(metric(tr('UPTIME', 'UPTIME'), 'sl-uptime'));
    /*
     * Keep this shell outside #view. LuCI replaces #view after its asynchronous
     * RPC requests finish; placing the shell beside it makes the gauges visible
     * immediately and prevents them from disappearing during a refresh.
    */
    if (view) {
      main.insertBefore(summary, view);
    } else if (firstSection) {
      firstSection.parentNode.insertBefore(summary, firstSection);
    } else {
      main.appendChild(summary);
    }
    main.classList.add('streamline-overview');
    return summary;
  }

  function setMetric(summary, selector, value, percent, detail) {
    var card = summary.querySelector(selector);
    var available = value && value !== '--';
    var bounded = Math.max(0, Math.min(100, Number(percent) || 0));

    card.classList.toggle('is-loading', !available);
    card.classList.toggle('is-empty', !available);
    card.style.setProperty('--sl-gauge', available ? bounded : 0);
    card.querySelector('.sl-gauge-value').textContent = available ? value : '--';
    card.querySelector('.sl-metric-detail').textContent = available ? detail : tr('Loading…', 'Loading…');
  }

  function update() {
    var summary = build();
    var loadText;
    var loadNumber;
    var memory;
    var storage;
    var uptime;

    attempts++;
    if (!summary) {
      if (attempts > 24)
        window.clearInterval(timer);
      return;
    }

    loadText = rowValue(LOAD_PATTERN).split(/[ ,]/)[0];
    loadNumber = Number(loadText.replace(',', '.'));
    memory = progressValue(MEMORY_PATTERN);
    storage = storageValue();
    uptime = rowValue(UPTIME_PATTERN);

    if (!storage)
      requestStorage();

    setMetric(summary, '.sl-load', loadText, isNaN(loadNumber) ? 0 : loadNumber * 100, tr('Current system load', 'Current system load'));
    setMetric(summary, '.sl-memory', memory && memory.text, memory && memory.percent, tr('Physical memory', 'Physical memory'));
    setMetric(summary, '.sl-storage', storage && storage.text, storage && storage.percent, tr('Overlay storage', 'Overlay storage'));
    setMetric(summary, '.sl-uptime', compactUptime(uptime), uptime ? 100 : 0, tr('Since last restart', 'Since last restart'));

    if (loadText || memory || storage || uptime) {
      var live = summary.querySelector('.sl-live-status');
      live.classList.remove('is-loading');
      live.setAttribute('aria-label', tr('Live', 'Live'));
      live.setAttribute('title', tr('Live', 'Live'));
    }
  }

  update();
  timer = window.setInterval(update, 3000);
  window.addEventListener('beforeunload', function () { window.clearInterval(timer); });
}());
