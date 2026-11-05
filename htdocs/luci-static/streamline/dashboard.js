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

  var portsList = null;
  var portsDiscoveryPending = false;
  var portsUpdating = false;

  var RJ45_SVG = '<svg class="sl-port-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M5 8C5 6.89543 5.89543 6 7 6H25C26.1046 6 27 6.89543 27 8V24C27 25.1046 26.1046 26 25 26H7C5.89543 26 5 25.1046 5 24V8Z" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M9 10H23V18H20V22H12V18H9V10Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="11" y1="10" x2="11" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="13" y1="10" x2="13" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="15" y1="10" x2="15" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="17" y1="10" x2="17" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="19" y1="10" x2="19" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="21" y1="10" x2="21" y2="15" stroke="currentColor" stroke-width="1.2"/>' +
    '</svg>';

  function formatBytes(bytes) {
    var b = Number(bytes);
    if (!isFinite(b) || b <= 0) return '0 B';
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(0) + ' KB';
    return b + ' B';
  }

  function buildPortsSection(summary) {
    if (!summary || !summary.parentNode)
      return null;

    var existing = document.getElementById('streamline-ports-summary');
    if (existing)
      return existing;

    var sec = document.createElement('section');
    sec.id = 'streamline-ports-summary';
    sec.className = 'sl-ports-summary';
    sec.innerHTML = '<div class="sl-dashboard-heading"><div><span>' +
      tr('ETHERNET PORTS', 'ETHERNET PORTS') + '</span><h3>' +
      tr('Port status map', 'Port status map') + '</h3></div>' +
      '<div class="sl-live-status is-loading" role="status" aria-label="' +
      tr('Loading…', 'Loading…') + '" title="' + tr('Loading…', 'Loading…') + '"><i></i></div></div>' +
      '<div class="sl-port-grid"></div>';

    summary.parentNode.insertBefore(sec, summary.nextSibling);
    return sec;
  }

  function renderPortCards() {
    var sec = document.getElementById('streamline-ports-summary');
    if (!sec || !portsList || portsList.length === 0)
      return;

    var grid = sec.querySelector('.sl-port-grid');
    if (!grid) return;

    grid.innerHTML = '';
    portsList.forEach(function (p) {
      var card = document.createElement('article');
      card.className = 'sl-port-card is-loading role-' + p.role;
      card.setAttribute('data-device', p.device);
      card.innerHTML =
        '<div class="sl-port-header">' +
          '<span class="sl-port-badge role-' + p.role + '">' + p.label + '</span>' +
          '<span class="sl-port-led" title="' + tr('Loading…', 'Loading…') + '"></span>' +
        '</div>' +
        '<div class="sl-port-visual">' + RJ45_SVG + '</div>' +
        '<div class="sl-port-info">' +
          '<span class="sl-port-name">' + p.device + '</span>' +
          '<span class="sl-port-speed">--</span>' +
          '<span class="sl-port-duplex">' + tr('Loading…', 'Loading…') + '</span>' +
        '</div>' +
        '<div class="sl-port-traffic">' +
          '<span class="sl-port-rx" title="' + tr('Downloaded', 'Downloaded') + '">--</span>' +
          '<span class="sl-port-tx" title="' + tr('Uploaded', 'Uploaded') + '">--</span>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function discoverPorts() {
    if (portsDiscoveryPending || !window.L || typeof L.require !== 'function')
      return;

    portsDiscoveryPending = true;

    Promise.resolve(L.require('rpc')).then(function (rpc) {
      var callFileRead = rpc.declare({
        object: 'file',
        method: 'read',
        params: ['path'],
        expect: { data: '' }
      });

      var callBuiltin = rpc.declare({
        object: 'luci',
        method: 'getBuiltinEthernetPorts',
        expect: { result: [] }
      });

      var callUciGet = rpc.declare({
        object: 'uci',
        method: 'get',
        params: ['config'],
        expect: { values: {} }
      });

      return Promise.all([
        callBuiltin().catch(function () { return []; }),
        callFileRead({ path: '/etc/board.json' }).catch(function () { return { data: '' }; }),
        callUciGet({ config: 'network' }).catch(function () { return { values: {} }; })
      ]);
    }).then(function (results) {
      var builtin = results[0] || [];
      var boardData = (results[1] && results[1].data) ? results[1].data : '';
      var uciValues = (results[2] && results[2].values) ? results[2].values : {};

      var discovered = [];
      var seen = {};

      function add(dev, role, label) {
        if (!dev || typeof dev !== 'string') return;
        var cleanDev = dev.trim();
        if (!cleanDev || seen[cleanDev]) return;
        seen[cleanDev] = true;
        discovered.push({
          device: cleanDev,
          role: role || (cleanDev.indexOf('wan') !== -1 ? 'wan' : 'lan'),
          label: label || cleanDev.toUpperCase()
        });
      }

      // 1. From builtin ethernet ports (LuCI 23.05+)
      if (Array.isArray(builtin) && builtin.length > 0) {
        builtin.forEach(function (p) {
          if (p && p.device) {
            var role = p.role || (p.device.indexOf('wan') !== -1 ? 'wan' : 'lan');
            add(p.device, role, p.label || (role === 'wan' ? 'WAN' : p.device.toUpperCase()));
          }
        });
      }

      // 2. From /etc/board.json (GL.iNet & standard OpenWrt DSA)
      if (discovered.length === 0 && boardData) {
        try {
          var board = JSON.parse(boardData);
          if (board && board.network) {
            // Check WAN
            if (board.network.wan) {
              if (board.network.wan.device)
                add(board.network.wan.device, 'wan', 'WAN');
              else if (Array.isArray(board.network.wan.ports))
                board.network.wan.ports.forEach(function (p) { add(p, 'wan', 'WAN'); });
            }
            // Check LAN
            if (board.network.lan) {
              var lanPorts = board.network.lan.ports || (board.network.lan.device ? [board.network.lan.device] : []);
              if (Array.isArray(lanPorts)) {
                lanPorts.forEach(function (p, idx) {
                  var lbl = (p.match(/^lan\d+$/i)) ? p.toUpperCase().replace('LAN', 'LAN ') : ('LAN ' + (idx + 1));
                  add(p, 'lan', lbl);
                });
              }
            }
          }
        } catch (e) {}
      }

      // 3. From UCI network if still empty
      if (discovered.length === 0 && uciValues) {
        Object.keys(uciValues).forEach(function (key) {
          var s = uciValues[key];
          if (s && s['.type'] === 'device' && s.type === 'bridge' && Array.isArray(s.ports)) {
            s.ports.forEach(function (p, idx) {
              var lbl = (p.match(/^lan\d+$/i)) ? p.toUpperCase().replace('LAN', 'LAN ') : ('LAN ' + (idx + 1));
              add(p, 'lan', lbl);
            });
          }
          if (s && s['.type'] === 'interface' && (s['.name'] === 'wan' || s['.name'] === 'wan6')) {
            if (s.device) add(s.device, 'wan', 'WAN');
            else if (s.ifname) add(s.ifname, 'wan', 'WAN');
          }
        });
      }

      // 4. Default fallback probe for GL-MT6000 and standard DSA
      if (discovered.length === 0) {
        ['eth1', 'wan'].forEach(function (w) { add(w, 'wan', 'WAN'); });
        ['lan1', 'lan2', 'lan3', 'lan4', 'lan5'].forEach(function (l, i) {
          add(l, 'lan', 'LAN ' + (i + 1));
        });
      }

      // Sort: WAN first, then LAN1, LAN2, LAN3...
      discovered.sort(function (a, b) {
        if (a.role === 'wan' && b.role !== 'wan') return -1;
        if (a.role !== 'wan' && b.role === 'wan') return 1;
        return a.device.localeCompare(b.device, undefined, { numeric: true });
      });

      portsList = discovered;
      renderPortCards();
      updatePortStatus();
    }).catch(function () {
      portsDiscoveryPending = false;
    });
  }

  function updatePortStatus() {
    if (!portsList || portsList.length === 0 || portsUpdating || !window.L || typeof L.require !== 'function')
      return;

    var sec = document.getElementById('streamline-ports-summary');
    if (!sec) return;

    portsUpdating = true;

    Promise.resolve(L.require('rpc')).then(function (rpc) {
      var callDeviceStatus = rpc.declare({
        object: 'network.device',
        method: 'status',
        params: ['name'],
        expect: { '': {} }
      });

      var promises = portsList.map(function (p) {
        return callDeviceStatus({ name: p.device }).then(function (st) {
          return { device: p.device, status: st || {} };
        }).catch(function () {
          return { device: p.device, status: {} };
        });
      });

      return Promise.all(promises);
    }).then(function (results) {
      portsUpdating = false;
      var sec = document.getElementById('streamline-ports-summary');
      if (!sec) return;

      results.forEach(function (r) {
        var card = sec.querySelector('.sl-port-card[data-device="' + r.device + '"]');
        if (!card) return;

        var st = r.status || {};
        var isUp = Boolean(st.link || st.carrier || (st.up && st.speed));
        var speedNum = 0;
        if (st.speed) {
          var m = String(st.speed).match(/(\d+)/);
          if (m) speedNum = parseInt(m[1], 10);
        }
        var duplex = st.duplex ? (st.duplex === 'full' ? 'Full Duplex' : 'Half Duplex') : '';
        var stats = st.statistics || {};
        var rx = formatBytes(stats.rx_bytes);
        var tx = formatBytes(stats.tx_bytes);

        card.classList.remove('is-loading', 'is-up', 'is-down', 'speed-2500', 'speed-1000', 'speed-100', 'speed-10');

        var speedText;
        if (isUp) {
          card.classList.add('is-up');
          if (speedNum >= 2500) {
            card.classList.add('speed-2500');
            speedText = '2.5 Gbps';
          } else if (speedNum === 1000) {
            card.classList.add('speed-1000');
            speedText = '1 Gbps';
          } else if (speedNum === 100) {
            card.classList.add('speed-100');
            speedText = '100 Mbps';
          } else if (speedNum > 0) {
            speedText = speedNum + ' Mbps';
          } else {
            speedText = tr('Connected', 'Connected');
          }
          card.querySelector('.sl-port-speed').textContent = speedText;
          card.querySelector('.sl-port-duplex').textContent = duplex || tr('Connected', 'Connected');
          card.querySelector('.sl-port-rx').textContent = '↓ ' + rx;
          card.querySelector('.sl-port-tx').textContent = '↑ ' + tx;
          card.querySelector('.sl-port-led').setAttribute('title', tr('Connected', 'Connected') + ': ' + speedText + (duplex ? (' ' + duplex) : ''));
        } else {
          card.classList.add('is-down');
          card.querySelector('.sl-port-speed').textContent = tr('No Link', 'No Link');
          card.querySelector('.sl-port-duplex').textContent = '--';
          card.querySelector('.sl-port-rx').textContent = '--';
          card.querySelector('.sl-port-tx').textContent = '';
          card.querySelector('.sl-port-led').setAttribute('title', tr('No Link', 'No Link'));
        }
      });

      var live = sec.querySelector('.sl-live-status');
      if (live) {
        live.classList.remove('is-loading');
        live.setAttribute('aria-label', tr('Live', 'Live'));
        live.setAttribute('title', tr('Live', 'Live'));
      }

      // Hide native duplicate LuCI port section if present inside #view
      var nativePorts = document.querySelector('#view .cbi-section .ifacebox');
      if (nativePorts) {
        var parentSec = nativePorts.closest('.cbi-section');
        if (parentSec && parentSec.style.display !== 'none') {
          parentSec.style.display = 'none';
        }
      }
    }).catch(function () {
      portsUpdating = false;
    });
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

    // Build and manage Ethernet Ports section
    buildPortsSection(summary);
    if (!portsList && !portsDiscoveryPending) {
      discoverPorts();
    } else if (portsList) {
      updatePortStatus();
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
