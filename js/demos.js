/* Dataverse — Selected work demos.
   Each card replays what the build actually does: messages arrive, the agent works, the
   output appears. Plain DOM and CSS, no 3D. Starts when the card is on screen, loops with
   a pause between runs, and shows the finished state (no motion) for reduced-motion visitors. */
(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-demo]'));
  if (!cards.length) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Card 1: guard messages become a shift report ---------- */
  var REPORT_MSGS = [
    { who: 'Guard', time: '18:04', text: 'On site, gates locked' },
    { who: 'Guard', time: '21:35', text: 'Loud group in lot, moved along' },
    { who: 'Guard', time: '02:10', text: 'Photo: broken light, east door' }
  ];
  var REPORT_LOG = [
    ['18:00', 'Shift start. Perimeter walked, all gates secure.'],
    ['21:00', 'Group gathered in the north lot; asked to leave, complied.'],
    ['02:00', 'Exterior light out at the east door. Photo attached.']
  ];

  /* ---------- Card 2: a WhatsApp message becomes a timesheet row ---------- */
  var SHEET_MSGS = [
    { who: 'Krishna', time: '15:02', text: '3am–3pm today' },
    { who: 'Harjinder', time: '15:20', text: 'Photo: timesheet 16–22 Mar' }
  ];
  var SHEET_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var SHEET_CELLS = ['3am–3pm', '3am–3pm', '2pm–3am', '3am–2pm', '3am–3pm'];
  var SHEET_HOURS = [12, 12, 13, 11, 12];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function makeRunner(card) {
    var kind = card.dataset.demo;
    var statusEl = card.querySelector('[data-demo-status]');
    var chatEl = card.querySelector('[data-demo-chat]');
    var pill = card.querySelector('[data-demo-pill]');
    var logEl = card.querySelector('[data-demo-log]');
    var gridEl = card.querySelector('[data-demo-grid]');
    var totalEl = card.querySelector('[data-demo-total]');
    var countEl = card.querySelector('[data-demo-count]');
    var timers = [];
    var countTimer = null;

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function status(s) { statusEl.textContent = s; }

    function clear() {
      timers.forEach(clearTimeout);
      timers = [];
      clearInterval(countTimer);
      chatEl.innerHTML = '';
      if (logEl) logEl.innerHTML = '';
      if (gridEl) gridEl.innerHTML = '';
      if (totalEl) totalEl.textContent = '0.0';
      if (countEl) countEl.textContent = '0';
      card.classList.remove('is-done');
      pill.classList.remove('is-on');
    }

    function bubble(m) {
      var li = el('li', 'demo__msg');
      var head = el('div', 'demo__msg-head');
      head.appendChild(el('span', 'demo__who', m.who));
      head.appendChild(el('span', 'demo__time', m.time));
      li.appendChild(head);
      li.appendChild(el('div', 'demo__text', m.text));
      chatEl.appendChild(li);
      timers.push(setTimeout(function () { li.classList.add('is-in'); }, 20));
    }

    function countTo(node, target, ms, decimals) {
      var start = performance.now();
      clearInterval(countTimer);
      countTimer = setInterval(function () {
        var k = Math.min(1, (performance.now() - start) / ms);
        node.textContent = (target * (1 - Math.pow(1 - k, 3))).toFixed(decimals);
        if (k === 1) clearInterval(countTimer);
      }, 40);
    }

    function runReport() {
      clear();
      status('Listening');
      REPORT_MSGS.forEach(function (m, i) { at(400 + i * 900, function () { bubble(m); }); });
      at(3400, function () { status('Slotting the shift'); card.classList.add('is-working'); });
      REPORT_LOG.forEach(function (row, i) {
        at(4000 + i * 700, function () {
          var li = el('li', 'demo__log-row');
          li.appendChild(el('span', 'demo__log-time', row[0]));
          li.appendChild(el('span', 'demo__log-text', row[1]));
          logEl.appendChild(li);
          timers.push(setTimeout(function () { li.classList.add('is-in'); }, 20));
        });
      });
      at(6500, function () {
        card.classList.remove('is-working');
        card.classList.add('is-done');
        status('Report ready');
        pill.classList.add('is-on');
        countTo(countEl, 67, 900, 0);
      });
      at(12000, runReport);
    }

    function runSheet() {
      clear();
      status('Listening');
      SHEET_MSGS.forEach(function (m, i) { at(400 + i * 1100, function () { bubble(m); }); });
      at(2600, function () {
        status('Reading hours');
        card.classList.add('is-working');
        SHEET_DAYS.forEach(function (d) { gridEl.appendChild(el('span', 'demo__cell demo__cell--head', d)); });
      });
      SHEET_CELLS.forEach(function (v, i) {
        at(3200 + i * 500, function () {
          var c = el('span', 'demo__cell', v);
          gridEl.appendChild(c);
          timers.push(setTimeout(function () { c.classList.add('is-in'); }, 20));
          countTo(totalEl, SHEET_HOURS.slice(0, i + 1).reduce(function (a, b) { return a + b; }, 0), 420, 1);
        });
      });
      at(5900, function () {
        card.classList.remove('is-working');
        card.classList.add('is-done');
        status('Reminder sent');
        pill.classList.add('is-on');
      });
      at(11000, runSheet);
    }

    function finalFrame() {
      clear();
      REPORT_MSGS.slice(0, 2).forEach(bubble);
      if (kind === 'report') {
        REPORT_LOG.forEach(function (row) {
          var li = el('li', 'demo__log-row is-in');
          li.appendChild(el('span', 'demo__log-time', row[0]));
          li.appendChild(el('span', 'demo__log-text', row[1]));
          logEl.appendChild(li);
        });
        status('Report ready');
        countEl.textContent = '67';
      } else {
        chatEl.innerHTML = '';
        SHEET_MSGS.forEach(bubble);
        SHEET_DAYS.forEach(function (d) { gridEl.appendChild(el('span', 'demo__cell demo__cell--head', d)); });
        SHEET_CELLS.forEach(function (v) { gridEl.appendChild(el('span', 'demo__cell is-in', v)); });
        totalEl.textContent = '60.0';
        status('Reminder sent');
      }
      card.classList.add('is-done');
      pill.classList.add('is-on');
    }

    return {
      start: function () { (kind === 'report' ? runReport : runSheet)(); },
      stop: clear,
      still: finalFrame
    };
  }

  cards.forEach(function (card) {
    var run = makeRunner(card);
    if (reduced) { run.still(); return; }
    run.start();
    // Pause while the card is off screen; it restarts from the top when it comes back.
    // The observer's first call reports the current state — ignore it so the run isn't
    // cancelled before it begins.
    var running = true;
    var first = true;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (first) { first = false; return; }
        if (en.isIntersecting && !running) { running = true; run.start(); }
        else if (!en.isIntersecting && running) { running = false; run.stop(); }
      });
    }, { threshold: 0.2 }).observe(card);
  });
})();
