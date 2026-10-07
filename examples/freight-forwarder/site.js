/*
 * Northline page behaviour: theme toggle (with a view transition), the night
 * statement that fills in as it is read ([data-fill]), --p (0 to 1) on
 * [data-progress] (the lane ruled on the chart), and the voyage rail that
 * follows the section in view ([data-leg]). The 3D voyage lives in scene.js.
 * Everything here only adds to a page that is already complete.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const THEME_KEY = 'northline-theme'; // match the boot script in <head>

  /* ---------- Theme ---------- */
  const themeNow = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  function syncTheme() {
    const mode = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    window.dispatchEvent(new CustomEvent('northline:theme', { detail: mode }));
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
  syncTheme();

  /* ---------- The statement fills in as you read it ---------- */
  const fills = Array.from(document.querySelectorAll('[data-fill]'));
  fills.forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (part === '') return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = part;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.words = Array.from(el.querySelectorAll('.word'));
    el.lit = 0;
  });

  /* ---------- Voyage rail: one dot per leg, the readout for the section in view ---------- */
  const legs = Array.from(document.querySelectorAll('[data-leg]'));
  const rail = document.querySelector('.voyage-rail');
  const readPlace = document.querySelector('[data-read-place]');
  const readPos = document.querySelector('[data-read-pos]');
  const readDay = document.querySelector('[data-read-day]');
  const dots = legs.map(() => {
    const li = document.createElement('li');
    if (rail) rail.appendChild(li);
    return li;
  });
  let activeLeg = -1;
  function setLeg(index) {
    if (index === activeLeg || index < 0) return;
    activeLeg = index;
    const [place, pos, day] = legs[index].dataset.leg.split('|');
    if (readPlace) readPlace.textContent = place;
    if (readPos) readPos.textContent = pos;
    if (readDay) readDay.textContent = day;
    dots.forEach((dot, i) => {
      dot.classList.toggle('on', i === index);
      dot.classList.toggle('done', i < index);
    });
  }

  /* ---------- Scroll-linked: the statement, --p, the rail ---------- */
  const tracked = Array.from(document.querySelectorAll('[data-progress]'));
  let queued = false;
  function onScroll() {
    queued = false;
    const vh = window.innerHeight || 1;
    fills.forEach((el) => {
      const r = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh * 0.86 - r.top) / (r.height + vh * 0.36)));
      const count = reduce.matches ? el.words.length : Math.round(progress * el.words.length);
      for (; el.lit < count; el.lit++) el.words[el.lit].classList.add('on');
      for (; el.lit > count; el.lit--) el.words[el.lit - 1].classList.remove('on');
    });
    tracked.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = reduce.matches ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty('--p', p.toFixed(3));
    });
    const mid = vh / 2;
    let current = 0;
    legs.forEach((el, i) => { if (el.getBoundingClientRect().top <= mid) current = i; });
    setLeg(current);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();
})();
