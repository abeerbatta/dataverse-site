/* Dataverse — call request form.
   Counts completed fields, lights a dot per field, runs the segmented choices, and moves
   a soft glow with the cursor across the panel. With no backend yet, submitting opens a
   prefilled email; in Webflow a native Form Block replaces that step. */
(function () {
  var form = document.querySelector('[data-book-form]');
  if (!form) return;

  var fields = Array.prototype.slice.call(form.querySelectorAll('[data-book-field]'));
  var countEl = form.querySelector('[data-book-count]');
  var dotsEl = form.querySelector('[data-book-dots]');

  /* One dot per field, filling as the form is completed */
  var dots = fields.map(function () {
    var d = document.createElement('span');
    d.className = 'bform__dot';
    dotsEl.appendChild(d);
    return d;
  });

  function filled(el) {
    return String(el.value || '').trim() !== '';
  }

  function update() {
    var done = 0;
    fields.forEach(function (el, i) {
      var ok = filled(el);
      if (ok) done++;
      dots[i].classList.toggle('is-on', ok);
      var wrap = el.closest('.bf');
      if (wrap) wrap.classList.toggle('is-filled', ok);
    });
    countEl.textContent = done + ' / ' + fields.length;
    form.classList.toggle('is-complete', done === fields.length);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);

  /* Segmented choices write to the hidden input beside them */
  form.querySelectorAll('[data-book-seg]').forEach(function (group) {
    var input = group.parentElement.querySelector('input[type="hidden"]');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.seg__btn');
      if (!btn) return;
      group.querySelectorAll('.seg__btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      input.value = btn.textContent.trim();
      update();
    });
  });

  /* Glow follows the cursor across the panel */
  form.addEventListener('pointermove', function (e) {
    var r = form.getBoundingClientRect();
    form.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    form.style.setProperty('--my', (e.clientY - r.top) + 'px');
    form.classList.add('is-lit');
  });
  form.addEventListener('pointerleave', function () {
    form.classList.remove('is-lit');
  });
  form.addEventListener('focusin', function (e) {
    var wrap = e.target.closest('.bf');
    if (!wrap) return;
    var r = form.getBoundingClientRect();
    var f = wrap.getBoundingClientRect();
    form.style.setProperty('--mx', (f.left - r.left + f.width / 2) + 'px');
    form.style.setProperty('--my', (f.top - r.top + f.height / 2) + 'px');
    form.classList.add('is-lit');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var get = function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      return el ? String(el.value || '').trim() : '';
    };
    var name = get('name');
    var email = get('email');
    if (!name || !email) {
      form.classList.add('is-invalid');
      (name ? form.querySelector('[name="email"]') : form.querySelector('[name="name"]')).focus();
      return;
    }
    var body = [
      'Name: ' + name,
      'Business: ' + get('business'),
      'Email: ' + email,
      'Phone: ' + get('phone'),
      'Line of work: ' + get('industry'),
      'Preferred call time: ' + get('callTime'),
      'Team size: ' + get('size'),
      '',
      'What wastes the most time:',
      get('message')
    ].join('\n');
    window.location.href = 'mailto:hello@dataverse.ca?subject=' +
      encodeURIComponent('Call request — ' + name) + '&body=' + encodeURIComponent(body);
  });

  update();
})();
