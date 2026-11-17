// Runs before first paint (classic script in <head>) so the page never flashes the wrong theme.
// Stored values: "light" | "dark"; anything else (or nothing) = auto, which follows the OS.
(function () {
  try {
    var t = localStorage.getItem('muse-atlas:theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    var l = localStorage.getItem('muse-atlas:lang');
    if (l === 'en') document.documentElement.setAttribute('lang', 'en');
  } catch (e) { /* storage blocked: auto theme, Ukrainian */ }
})();
