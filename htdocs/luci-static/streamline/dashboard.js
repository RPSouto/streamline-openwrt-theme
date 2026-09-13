(function () {
  'use strict';

  var page = document.body && document.body.getAttribute('data-page');
  var timer;
  var attempts = 0;

  if (page !== 'admin-status-overview')
    return;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function rows() {
    return document.querySelectorAll('#maincontent .tr');
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

      if (bar && pattern.test(label)) {
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

      if (/storage|disk|filesystem|mount|flash/i.test(context)) {
        var title = clean(bars[i].getAttribute('title'));
        var match = title.match(/\((\d+(?:\.\d+)?)%\)/);
        return { text: match ? match[1] + '%' : title, percent: match ? Number(match[1]) : 0 };
      }
    }

    return progressValue(/root|disk|storage|flash/i);
  }

  function metric(label, className) {
    var card = document.createElement('article');
    card.className = 'sl-metric ' + className;
    card.innerHTML = '<div class="sl-gauge"><div class="sl-gauge-value">--</div><div class="sl-gauge-label"></div></div>' +
      '<div class="sl-metric-detail">Waiting for data</div>';
    card.querySelector('.sl-gauge-label').textContent = label;
    return card;
  }

  function build() {
    var main = document.getElementById('maincontent');
    var firstSection = main && main.querySelector('.cbi-section, .network-status-table');
    var summary = document.getElementById('streamline-overview-summary');

    if (!main || !firstSection)
      return null;

    if (summary)
      return summary;

    summary = document.createElement('section');
    summary.id = 'streamline-overview-summary';
    summary.className = 'sl-dashboard-summary';
    summary.innerHTML = '<div class="sl-dashboard-heading"><div><span>ROUTER HEALTH</span><h3>System overview</h3></div>' +
      '<div class="sl-live-status"><i></i> Live</div></div><div class="sl-metric-grid"></div>';

    var grid = summary.querySelector('.sl-metric-grid');
    grid.appendChild(metric('1 MIN LOAD', 'sl-load'));
    grid.appendChild(metric('MEMORY USED', 'sl-memory'));
    grid.appendChild(metric('STORAGE USED', 'sl-storage'));
    grid.appendChild(metric('UPTIME', 'sl-uptime'));
    firstSection.parentNode.insertBefore(summary, firstSection);
    main.classList.add('streamline-overview');
    return summary;
  }

  function setMetric(summary, selector, value, percent, detail) {
    var card = summary.querySelector(selector);
    var available = value && value !== '--';
    var bounded = Math.max(0, Math.min(100, Number(percent) || 0));

    card.classList.toggle('is-empty', !available);
    card.style.setProperty('--sl-gauge', available ? bounded : 0);
    card.querySelector('.sl-gauge-value').textContent = available ? value : '--';
    card.querySelector('.sl-metric-detail').textContent = available ? detail : 'Unavailable';
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

    loadText = rowValue(/load average/i).split(/[ ,]/)[0];
    loadNumber = Number(loadText.replace(',', '.'));
    memory = progressValue(/^used$/i);
    storage = storageValue();
    uptime = rowValue(/^uptime$/i);

    setMetric(summary, '.sl-load', loadText, isNaN(loadNumber) ? 0 : loadNumber * 100, 'Current system load');
    setMetric(summary, '.sl-memory', memory && memory.text, memory && memory.percent, 'Physical memory');
    setMetric(summary, '.sl-storage', storage && storage.text, storage && storage.percent, 'Local storage');
    setMetric(summary, '.sl-uptime', uptime, uptime ? 100 : 0, 'Since last restart');
  }

  update();
  timer = window.setInterval(update, 3000);
  window.addEventListener('beforeunload', function () { window.clearInterval(timer); });
}());
