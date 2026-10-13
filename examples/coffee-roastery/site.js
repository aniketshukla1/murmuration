/*
 * Page behaviour for Ember & Ash (no WebGL needed for any of it):
 * the theme toggle (with a view transition), the roast dates computed from today,
 * the roast steps (the active step, and the profile curve drawn up to it),
 * the night statement that fills in as it is read ([data-fill]),
 * and the footer wordmark that warms under the pointer ([data-glow]).
 * Everything only adds to a page that is already complete; the 3D roaster is roastery.js.
 * The inline boot script in <head> sets data-theme from storage and adds the .js class.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const narrow = window.matchMedia('(max-width: 860px)');
  const THEME_KEY = 'ember-ash-theme'; // match the boot script in <head>

  /* ---------- Theme: Ash (light) and Ember (dark) ---------- */
  const themeNow = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const mode = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.dataset.mode = mode;
      button.setAttribute('aria-label', mode === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
    });
    if (themeMeta) themeMeta.setAttribute('content', mode === 'dark' ? '#100c0a' : '#efebe5');
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

  /* ---------- Roast dates: orders close Monday 23:59, roast Tuesday, post Thursday ---------- */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortDate = (d) => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  const longDate = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const today = new Date();
  const roast = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  do roast.setDate(roast.getDate() + 1); while (roast.getDay() !== 2); // the next Tuesday after today
  const close = new Date(roast.getFullYear(), roast.getMonth(), roast.getDate() - 1);
  const post = new Date(roast.getFullYear(), roast.getMonth(), roast.getDate() + 2);
  const dates = {
    roast: shortDate(roast),
    'roast-long': longDate(roast),
    'roast-short': `the ${roast.getDate()} ${MONTHS[roast.getMonth()].slice(0, 3)} roast`,
    close: `${shortDate(close)} · 23:59`,
    'close-long': `on ${longDate(close)} at 23:59`,
    post: shortDate(post),
  };
  document.querySelectorAll('[data-date]').forEach((el) => {
    if (dates[el.dataset.date]) el.textContent = dates[el.dataset.date];
  });

  /* ---------- The roast steps: the active one, and the profile drawn up to it ---------- */
  const steps = Array.from(document.querySelectorAll('.step[data-roast]'));
  const profile = document.querySelector('[data-profile]');
  const marks = profile ? Array.from(profile.querySelectorAll('.mark-pt')) : [];
  let active = null;
  function trackSteps(vh) {
    if (!steps.length) return;
    const line = vh * (narrow.matches ? 0.8 : 0.56);
    let index = -1;
    steps.forEach((step, i) => { if (step.getBoundingClientRect().top < line) index = i; });
    if (index === active) return;
    active = index;
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    if (!profile) return;
    const shown = reduce.matches ? steps.length - 1 : Math.max(0, index);
    if (!reduce.matches) {
      profile.dataset.drawing = '';
      profile.style.setProperty('--drawn', steps[shown].dataset.draw);
    }
    marks.forEach((mark, i) => mark.classList.toggle('on', i <= shown));
  }

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

  /* ---------- Scroll-linked: the statement and the roast steps ---------- */
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
    trackSteps(vh);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();

  /* ---------- The footer wordmark warms like an ember under the pointer ---------- */
  const footer = document.querySelector('.site-footer');
  const glow = footer && footer.querySelector('[data-glow]');
  if (glow && !reduce.matches && window.matchMedia('(pointer: fine)').matches) {
    let pending = null;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const r = glow.getBoundingClientRect();
      glow.style.setProperty('--fx', `${pending.clientX - r.left}px`);
      glow.style.setProperty('--fy', `${pending.clientY - r.top}px`);
    };
    footer.addEventListener('pointermove', (event) => {
      pending = event;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  }
})();
