/* Runs in <head> before paint: restores saved light/dark mode so there's no flash. */
(function () {
  try {
    var mode = localStorage.getItem('dv-mode');
    if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-mode', mode);
  } catch (e) {}
})();
