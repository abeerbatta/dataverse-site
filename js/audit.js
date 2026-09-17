/* Dataverse — five-minute time audit calculator. Self-contained; mounts on [data-audit]. */
(function () {
  var el = document.querySelector('[data-audit]');
  if (!el) return;

  var INDUSTRIES = [
    { key: 'trades', label: 'Trades & home services', factor: 1 },
    { key: 'pro', label: 'Law / accounting', factor: 0.92 },
    { key: 'clinic', label: 'Clinic', factor: 0.88 },
    { key: 'realty', label: 'Brokerage', factor: 0.95 },
    { key: 'food', label: 'Restaurant', factor: 0.9 }
  ];

  var TASKS = [
    { key: 'quote', label: 'Quoting & estimates', hours: 5, on: true, auto: 0.6, build: 'A quote builder that prices from a phone form and follows up' },
    { key: 'intake', label: 'Client intake & paperwork', hours: 4, on: true, auto: 0.75, build: 'Intake forms that file themselves before day one' },
    { key: 'sched', label: 'Scheduling & reminders', hours: 3, on: false, auto: 0.8, build: 'Booking and reminder flows that cut no-shows' },
    { key: 'invoice', label: 'Invoicing & chasing payment', hours: 3, on: true, auto: 0.7, build: 'Invoices raised on job completion, with a polite escalation ladder' },
    { key: 'retype', label: 'Re-typing data between systems', hours: 4, on: true, auto: 0.85, build: 'A single sync so nothing gets typed twice' },
    { key: 'enquiry', label: 'Answering the same enquiries', hours: 5, on: false, auto: 0.6, build: 'An after-hours agent that answers your top 20 questions' }
  ];

  var state = {
    industry: 'trades',
    rate: 55,
    pain: '',
    tasks: TASKS.map(function (t) { return { key: t.key, hours: t.hours, on: t.on }; })
  };

  var $ = function (s) { return el.querySelector(s); };
  var chipsEl = $('[data-audit-industries]');
  var tasksEl = $('[data-audit-tasks]');
  var rateEl = $('[data-audit-rate]');
  var painEl = $('[data-audit-pain]');

  /* Build static controls once */
  INDUSTRIES.forEach(function (i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = i.label;
    b.dataset.key = i.key;
    b.addEventListener('click', function () { state.industry = i.key; render(); });
    chipsEl.appendChild(b);
  });

  TASKS.forEach(function (t) {
    var row = document.createElement('div');
    row.className = 'task';
    row.dataset.key = t.key;
    row.innerHTML =
      '<button type="button" class="task__check" aria-label="Include ' + t.label + '"></button>' +
      '<span class="task__label"></span>' +
      '<input class="task__range" type="range" min="0" max="25" step="1" aria-label="Hours per week">' +
      '<span class="task__hours"></span>';
    row.querySelector('.task__label').textContent = t.label;
    row.querySelector('.task__check').addEventListener('click', function () {
      var s = find(t.key); s.on = !s.on; render();
    });
    row.querySelector('.task__range').addEventListener('input', function (e) {
      var s = find(t.key); s.hours = Number(e.target.value); s.on = true; render();
    });
    tasksEl.appendChild(row);
  });

  rateEl.addEventListener('input', function (e) { state.rate = e.target.value; render(); });
  painEl.addEventListener('input', function (e) { state.pain = e.target.value; render(); });

  function find(key) {
    return state.tasks.filter(function (x) { return x.key === key; })[0];
  }

  function audit() {
    var ind = INDUSTRIES.filter(function (i) { return i.key === state.industry; })[0] || INDUSTRIES[0];
    var rows = TASKS.map(function (t) {
      var s = find(t.key);
      return Object.assign({}, t, { hours: s.hours, on: s.on, saved: s.on ? s.hours * t.auto * ind.factor : 0 });
    });
    var saved = rows.reduce(function (a, r) { return a + r.saved; }, 0);
    var picked = rows.filter(function (r) { return r.on && r.hours > 0; })
      .sort(function (a, b) { return b.saved - a.saved; }).slice(0, 3);
    return { ind: ind, rows: rows, saved: saved, picked: picked };
  }

  function render() {
    var a = audit();
    var money = Math.round(a.saved * (Number(state.rate) || 0) * 48 / 100) * 100;
    var tier = a.saved < 4 ? 'Starter — from $2,400'
      : a.saved < 11 ? 'Growth — from $6,500 + $1,200/mo'
      : 'Custom — priced per phase';

    chipsEl.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('is-active', c.dataset.key === state.industry);
    });

    a.rows.forEach(function (t) {
      var row = tasksEl.querySelector('[data-key="' + t.key + '"]');
      row.classList.toggle('is-on', t.on);
      var range = row.querySelector('.task__range');
      if (Number(range.value) !== t.hours) range.value = t.hours;
      row.querySelector('.task__hours').textContent = t.on ? t.hours + ' hrs' : 'skipped';
    });

    $('[data-audit-industry-label]').textContent = a.ind.label;
    $('[data-audit-hours]').textContent = a.saved.toFixed(1);
    $('[data-audit-money]').textContent = '$' + money.toLocaleString('en-CA');
    $('[data-audit-tier]').textContent = tier;

    var builds = a.picked.length
      ? a.picked.map(function (p, i) { return { n: '0' + (i + 1), text: p.build }; })
      : [{ n: '00', text: "Tick a task above to see what we'd build first." }];
    var ul = $('[data-audit-builds]');
    ul.innerHTML = '';
    builds.forEach(function (b) {
      var li = document.createElement('li');
      var n = document.createElement('span'); n.className = 'builds__n'; n.textContent = b.n;
      var tx = document.createElement('span'); tx.textContent = b.text;
      li.appendChild(n); li.appendChild(tx); ul.appendChild(li);
    });

    var body = 'Industry: ' + a.ind.label + '\n' +
      'Hours/week reclaimable: ' + a.saved.toFixed(1) + '\n' +
      'Loaded hourly cost: $' + state.rate + '\n' +
      'Annual value: $' + money.toLocaleString('en-CA') + '\n' +
      'Task they hate most: ' + (state.pain || '—') + '\n\nTop builds:\n' +
      a.picked.map(function (p, i) { return (i + 1) + '. ' + p.build; }).join('\n');
    $('[data-audit-mailto]').href = 'mailto:hello@dataverse.ca?subject=' +
      encodeURIComponent('Time audit brief — ' + a.ind.label) + '&body=' + encodeURIComponent(body);
  }

  render();
})();
