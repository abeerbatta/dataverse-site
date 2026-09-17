/* Dataverse — shared behaviour: light/dark toggle and scroll reveals. */
(function () {
  var root = document.documentElement;
  function syncModeLabel() {
    var light = root.getAttribute('data-mode') === 'light';
    document.querySelectorAll('[data-toggle-mode]').forEach(function (b) {
      b.textContent = light ? 'Dark' : 'Light';
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-toggle-mode]')) return;
    var next = root.getAttribute('data-mode') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-mode', next);
    syncModeLabel();
    try { localStorage.setItem('dv-mode', next); } catch (err) {}
  });
  syncModeLabel();

  /* Scroll reveals — elements stay visible if JS or IntersectionObserver is unavailable. */
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduced) {
    nodes.forEach(function (n) {
      n.style.opacity = '0';
      n.style.transform = 'translateY(16px)';
      n.style.transition = 'opacity 700ms cubic-bezier(.22,.7,.3,1), transform 700ms cubic-bezier(.22,.7,.3,1)';
      n.style.transitionDelay = (Math.min(Number(n.dataset.reveal) || 1, 6) - 1) * 70 + 'ms';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    nodes.forEach(function (n) { io.observe(n); });
  }

})();
