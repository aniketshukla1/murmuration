/*
 * Page behaviour for Lowtide (from the murmuration starter's site.js, trimmed to
 * what MOTION.md names): the theme toggle (with a view transition), the story
 * value u that tells the 3D bay which section stop it is at, --tide for the
 * header mark's waterline, --p (0 to 1) on [data-progress] elements as they
 * cross the screen (the lineup sway and the tide chart), and the Pause the
 * beat button. Everything only adds to a page that is already complete. The
 * inline boot script in <head> sets data-theme from storage and adds .js.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_KEY = 'site-theme'; // match the boot script in <head>

  /* ---------- Theme ---------- */
  const themeNow = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const mode = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.dataset.mode = mode;
      button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    if (themeMeta) themeMeta.setAttribute('content', mode === 'dark' ? '#07091a' : '#2c66c9');
  }
  function setTheme(next) {
    const apply = () => { root.dataset.theme = next; syncTheme(); };
    if (document.startViewTransition && !reduce.matches) document.startViewTransition(apply);
    else apply();
    try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* storage can be blocked; the choice lasts for this visit */ }
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest && event.target.closest('[data-theme-toggle]');
    if (button) setTheme(themeNow() === 'dark' ? 'light' : 'dark');
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncTheme);
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  syncTheme();

  /* ---------- The story: which section stop the page is at ----------
   * u counts the section boundaries the reader has crossed. A boundary counts
   * while the next section's top climbs from 85% to 25% of the screen, so the
   * scene holds still while a section is read and hops between sections.
   * Under reduced motion it snaps instead of scrubbing. */
  const stops = Array.from(document.querySelectorAll('[data-stop]'));
  const tides = stops.map((s) => Number(s.dataset.tide));
  function storyU() {
    const vh = window.innerHeight || 1;
    let u = 0;
    for (let i = 1; i < stops.length; i++) {
      const k = Math.min(1, Math.max(0, (vh * 0.85 - stops[i].getBoundingClientRect().top) / (vh * 0.6)));
      u += reduce.matches ? (k >= 0.5 ? 1 : 0) : k * k * (3 - 2 * k);
    }
    return u;
  }
  function tideAt(u) {
    const i = Math.min(stops.length - 2, Math.max(0, Math.floor(u)));
    return tides[i] + (tides[i + 1] - tides[i]) * Math.min(1, u - i);
  }
  window.lowtide = { storyU };

  /* ---------- Scroll-linked: --tide on the root, --p on [data-progress] ---------- */
  const tracked = Array.from(document.querySelectorAll('[data-progress]'));
  let queued = false;
  function onScroll() {
    queued = false;
    const vh = window.innerHeight || 1;
    if (stops.length > 1) root.style.setProperty('--tide', tideAt(storyU()).toFixed(3));
    if (reduce.matches) return; // the sway and the chart rest in their finished state
    tracked.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--p', Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))).toFixed(3));
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();

  /* ---------- Pause the beat: freezes the scene's waves and kick ---------- */
  document.querySelectorAll('[data-beat-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const pause = root.dataset.beat !== 'paused';
      if (pause) root.dataset.beat = 'paused';
      else delete root.dataset.beat;
      button.setAttribute('aria-pressed', String(pause));
      button.querySelector('.beat-label').textContent = pause ? 'Play the beat' : 'Pause the beat';
      document.dispatchEvent(new CustomEvent('lowtide:beat'));
    });
  });
})();
