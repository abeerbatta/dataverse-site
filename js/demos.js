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

  /* ---------- Card 3: a phone call becomes a booked job ---------- */
  var CALL_LINES = [
    ['Caller', "Hi, my water heater's leaking all over the basement."],
    ['Agent', 'Sorry to hear that. I can get someone out today. What\'s the address?'],
    ['Caller', '14 Birchmount Road.'],
    ['Agent', "Got it. Marcus can be there at 2:30 this afternoon. I'll text you a confirmation now."]
  ];
  var CALL_CHIPS = [
    ['Job', 'Water heater leak'],
    ['Urgency', 'Emergency'],
    ['Booked', 'Today 2:30 PM']
  ];

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
    var linesEl = card.querySelector('[data-demo-lines]');
    var chipsEl = card.querySelector('[data-demo-chips]');
    var doneEl = card.querySelector('[data-demo-done]');
    var timerEl = card.querySelector('[data-demo-timer]');
    var answerEl = card.querySelector('[data-demo-answer]');
    var tick = null;
    var timers = [];
    var countTimer = null;

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function status(s) { statusEl.textContent = s; }

    function clear() {
      timers.forEach(clearTimeout);
      timers = [];
      clearInterval(countTimer);
      clearInterval(tick);
      if (chatEl) chatEl.innerHTML = '';
      if (linesEl) linesEl.innerHTML = '';
      if (chipsEl) chipsEl.innerHTML = '';
      if (doneEl) doneEl.classList.remove('is-on');
      if (timerEl) timerEl.textContent = '00:00';
      if (answerEl) answerEl.textContent = 'Incoming call';
      if (logEl) logEl.innerHTML = '';
      if (gridEl) gridEl.innerHTML = '';
      if (totalEl) totalEl.textContent = '0.0';
      if (countEl) countEl.textContent = '0';
      card.classList.remove('is-done');
      if (pill) pill.classList.remove('is-on');
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

    function runCall() {
      clear();
      status('Ringing');
      at(900, function () {
        status('On the call');
        answerEl.textContent = 'Answered in 2s';
        card.classList.add('is-working');
        var secs = 0;
        tick = setInterval(function () {
          secs++;
          timerEl.textContent = '00:' + (secs < 10 ? '0' : '') + secs;
        }, 900);
      });
      CALL_LINES.forEach(function (row, i) {
        at(1500 + i * 1300, function () {
          var li = el('li', 'demo__line');
          li.appendChild(el('span', 'demo__line-who' + (row[0] === 'Agent' ? ' is-agent' : ''), row[0]));
          li.appendChild(el('span', 'demo__line-text', row[1]));
          linesEl.appendChild(li);
          timers.push(setTimeout(function () { li.classList.add('is-in'); }, 20));
        });
      });
      at(6600, function () {
        clearInterval(tick);
        card.classList.remove('is-working');
        status('Job booked');
        CALL_CHIPS.forEach(function (c, i) {
          timers.push(setTimeout(function () {
            var chip = el('span', 'demo__chip' + (i === 2 ? ' is-accent' : ''));
            chip.appendChild(el('span', 'demo__chip-key', c[0]));
            chip.appendChild(el('span', 'demo__chip-val', c[1]));
            chipsEl.appendChild(chip);
            timers.push(setTimeout(function () { chip.classList.add('is-in'); }, 20));
          }, i * 320));
        });
      });
      at(7900, function () {
        doneEl.classList.add('is-on');
        card.classList.add('is-done');
      });
      at(13000, runCall);
    }

    function finalFrame() {
      clear();
      if (kind === 'call') {
        status('Job booked');
        answerEl.textContent = 'Answered in 2s';
        timerEl.textContent = '00:09';
        CALL_LINES.forEach(function (row) {
          var li = el('li', 'demo__line is-in');
          li.appendChild(el('span', 'demo__line-who' + (row[0] === 'Agent' ? ' is-agent' : ''), row[0]));
          li.appendChild(el('span', 'demo__line-text', row[1]));
          linesEl.appendChild(li);
        });
        CALL_CHIPS.forEach(function (c, i) {
          var chip = el('span', 'demo__chip is-in' + (i === 2 ? ' is-accent' : ''));
          chip.appendChild(el('span', 'demo__chip-key', c[0]));
          chip.appendChild(el('span', 'demo__chip-val', c[1]));
          chipsEl.appendChild(chip);
        });
        doneEl.classList.add('is-on');
        card.classList.add('is-done');
        return;
      }
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

    var runners = { report: runReport, sheet: runSheet, call: runCall };
    return {
      start: function () { (runners[kind] || runReport)(); },
      stop: clear,
      still: finalFrame
    };
  }

  /* A card plays while it is on screen — including horizontally, inside the rail. */
  function onScreen(node) {
    var r = node.getBoundingClientRect();
    return r.right > 40 && r.left < window.innerWidth - 40 && r.bottom > 0 && r.top < window.innerHeight;
  }

  var runners = cards.map(function (card) {
    var run = makeRunner(card);
    if (reduced) { run.still(); return null; }
    return { card: card, run: run, playing: false };
  }).filter(Boolean);

  function sync() {
    runners.forEach(function (r) {
      var vis = onScreen(r.card);
      if (vis && !r.playing) { r.playing = true; r.run.start(); }
      else if (!vis && r.playing) { r.playing = false; r.run.stop(); }
    });
  }

  if (runners.length) {
    var rail = document.querySelector('.work');
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    if (rail) rail.addEventListener('scroll', sync, { passive: true });
    // Observers cover the cases a scroll event does not (lazy layout, anchor jumps)
    runners.forEach(function (r) {
      new IntersectionObserver(sync, { threshold: 0.2 }).observe(r.card);
    });
    sync();
  }
})();
