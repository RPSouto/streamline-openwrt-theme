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

  function normalizeText(value) {
    var text = clean(value);
    if (typeof text.normalize === 'function')
      text = text.normalize('NFD');
    return text.replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .toLowerCase();
  }

  function firstNumericToken(value) {
    var text = clean(value);
    if (!text)
      return '';

    var match = text.match(/-?\d+(?:[.,]\d+)?/);
    if (!match)
      return '';

    return match[0].replace(/\s+/g, '');
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

  function matchesPattern(label, pattern) {
    if (!label)
      return false;

    var normalized = normalizeText(label);
    try {
      return pattern.test(normalized);
    } catch (error) {
      return pattern.test(label);
    }
  }

  function rowValue(pattern) {
    var list = rows();

    for (var i = 0; i < list.length; i++) {
      var cells = list[i].querySelectorAll('.td');
      var label = cells.length ? clean(cells[0].textContent) : '';
      var valueText = cells.length > 1 ? clean(cells[cells.length - 1].textContent) : '';

      if (cells.length > 1 && matchesPattern(label, pattern))
        return valueText;

      if (cells.length > 1 && matchesPattern(valueText, pattern))
        return valueText;
    }

    return '';
  }

  function parseProgressPercent(title, fallbackText) {
    var text = clean(title || fallbackText || '');
    var match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (match)
      return { text: match[1] + '%', percent: Number(String(match[1]).replace(',', '.')) };

    var numeric = firstNumericToken(text);
    if (numeric) {
      return {
        text: numeric + '%',
        percent: Number(String(numeric).replace(',', '.'))
      };
    }

    return { text: text || '', percent: 0 };
  }

  function progressValue(pattern) {
    var list = rows();

    for (var i = 0; i < list.length; i++) {
      var cells = list[i].querySelectorAll('.td');
      var label = cells.length ? clean(cells[0].textContent) : '';
      var bar = list[i].querySelector('.cbi-progressbar');
      var cellText = cells.length > 1 ? clean(cells[1].textContent) : '';

      if (bar && (matchesPattern(label, pattern) || matchesPattern(cellText, pattern))) {
        var title = clean(bar.getAttribute('title'));
        var parsed = parseProgressPercent(title, cells.length ? clean(cells[cells.length - 1].textContent) : '');
        return {
          text: parsed.text || title || clean(cells[cells.length - 1].textContent),
          percent: parsed.percent
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

      if (matchesPattern(context, STORAGE_PATTERN)) {
        var title = clean(bars[i].getAttribute('title'));
        var parsed = parseProgressPercent(title, title);
        return { text: parsed.text || title, percent: parsed.percent };
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
      tr('Loading…', 'Loading…') + '" title="' + tr('Loading…', 'Loading…') + '"><i></i></div></div>' +
      '<div class="sl-metric-grid"></div>' +
      '<div class="sl-traffic-strip">' +
        '<div class="sl-traffic-item sl-traffic-rx">' +
          '<span class="sl-traffic-icon">&darr;</span>' +
          '<div class="sl-traffic-meta">' +
            '<span class="sl-traffic-label">' + tr('WAN DOWNLOAD', 'WAN DOWNLOAD') + '</span>' +
            '<strong class="sl-traffic-val">--</strong>' +
          '</div>' +
        '</div>' +
        '<div class="sl-traffic-item sl-traffic-tx">' +
          '<span class="sl-traffic-icon">&uarr;</span>' +
          '<div class="sl-traffic-meta">' +
            '<span class="sl-traffic-label">' + tr('WAN UPLOAD', 'WAN UPLOAD') + '</span>' +
            '<strong class="sl-traffic-val">--</strong>' +
          '</div>' +
        '</div>' +
        '<div class="sl-traffic-item sl-traffic-clients">' +
          '<span class="sl-traffic-icon">&#9673;</span>' +
          '<div class="sl-traffic-meta">' +
            '<span class="sl-traffic-label">' + tr('ACTIVE CLIENTS', 'ACTIVE CLIENTS') + '</span>' +
            '<strong class="sl-traffic-val">--</strong>' +
          '</div>' +
        '</div>' +
      '</div>';

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

  var lastWanStats = null;
  var lastWanTime = null;

  function formatRate(bps) {
    if (!isFinite(bps) || bps < 0) return '0 B/s';
    if (bps >= 1048576) {
      return (bps / 1048576).toFixed(1) + ' MB/s';
    } else if (bps >= 1024) {
      return (bps / 1024).toFixed(0) + ' KB/s';
    }
    return Math.round(bps) + ' B/s';
  }

  function updateWanTraffic(summary) {
    if (!summary || !window.L || typeof L.require !== 'function') return;
    Promise.resolve(L.require('network')).then(function (network) {
      if (!network || typeof network.getWAN !== 'function') return null;
      return network.getWAN();
    }).then(function (wan) {
      if (!wan || typeof wan.getStats !== 'function') return null;
      return wan.getStats();
    }).then(function (stats) {
      if (!stats) return;
      var now = Date.now();
      if (lastWanStats && lastWanTime) {
        var dt = (now - lastWanTime) / 1000;
        if (dt >= 1.0) {
          var rxDiff = Number(stats.rx_bytes) - Number(lastWanStats.rx_bytes);
          var txDiff = Number(stats.tx_bytes) - Number(lastWanStats.tx_bytes);
          if (rxDiff >= 0 && txDiff >= 0) {
            var rxVal = summary.querySelector('.sl-traffic-rx .sl-traffic-val');
            var txVal = summary.querySelector('.sl-traffic-tx .sl-traffic-val');
            if (rxVal) rxVal.textContent = formatRate(rxDiff / dt);
            if (txVal) txVal.textContent = formatRate(txDiff / dt);
          }
        }
      }
      lastWanStats = stats;
      lastWanTime = now;
    }).catch(function () {});
  }

  function updateClientCount(summary) {
    if (!summary) return;
    var tables = document.querySelectorAll('#maincontent table, #maincontent .table');
    var macRegex = /([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i;
    var macSet = {};
    for (var i = 0; i < tables.length; i++) {
      var rows = tables[i].querySelectorAll('tr, .tr');
      for (var r = 0; r < rows.length; r++) {
        var txt = rows[r].textContent || '';
        var match = txt.match(macRegex);
        if (match) {
          macSet[match[0].toLowerCase()] = true;
        }
      }
    }
    var count = Object.keys(macSet).length;
    var clientsVal = summary.querySelector('.sl-traffic-clients .sl-traffic-val');
    if (clientsVal) {
      clientsVal.textContent = count > 0 ? String(count) : (attempts > 3 ? '0' : '--');
    }
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

    loadText = firstNumericToken(rowValue(LOAD_PATTERN));
    loadNumber = Number(String(loadText).replace(',', '.'));
    memory = progressValue(MEMORY_PATTERN);
    storage = storageValue();
    uptime = rowValue(UPTIME_PATTERN);

    if (!storage)
      requestStorage();

    setMetric(summary, '.sl-load', loadText, isNaN(loadNumber) ? 0 : loadNumber * 100, tr('Current system load', 'Current system load'));
    setMetric(summary, '.sl-memory', memory && memory.text, memory && memory.percent, tr('Physical memory', 'Physical memory'));
    setMetric(summary, '.sl-storage', storage && storage.text, storage && storage.percent, tr('Overlay storage', 'Overlay storage'));
    setMetric(summary, '.sl-uptime', compactUptime(uptime), uptime ? 100 : 0, tr('Since last restart', 'Since last restart'));

    updateWanTraffic(summary);
    updateClientCount(summary);

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
