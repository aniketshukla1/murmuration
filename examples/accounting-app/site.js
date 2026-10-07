/*
 * Page behaviour for Ledgerly: theme toggle (with a view transition), moments
 * that play once as they arrive ([data-play] gets .play; [data-count-to] counts
 * up to the number already printed), the statement that fills as it is read
 * ([data-fill]), the footer wordmark glow, and the quiet zones where the 3D
 * desk dims behind text ([data-quiet], and everything after the hero on
 * phones). The page is complete without any of it; the desk is ledger-scene.js.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const narrow = window.matchMedia('(max-width: 860px)');
  const hasObserver = 'IntersectionObserver' in window;
  const THEME_KEY = 'ledgerly-theme'; // match the boot script in <head>

  /* ---------- Theme ---------- */
  const themeNow = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const mode = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
    if (themeMeta) themeMeta.setAttribute('content', mode === 'dark' ? '#0f1613' : '#f6f2ea');
    window.dispatchEvent(new CustomEvent('ledgerly:theme', { detail: mode }));
  }
  function setTheme(next) {
    const apply = () => { root.dataset.theme = next; };
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

  /* ---------- Counters: the printed number is the real one; on arrival it counts up to it ---------- */
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const host = el.closest('[data-play]');
    if (!host || !hasObserver || reduce.matches) return;
    const to = Number(el.dataset.countTo);
    const final = el.textContent;
    host.addEventListener('scene:play', () => {
      const start = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - start) / 900);
        el.textContent = k < 1 ? Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US') : final;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { once: true });
  });

  /* ---------- Moments that play once, when their card arrives ---------- */
  const plays = document.querySelectorAll('[data-play]');
  const fire = (el) => { el.classList.add('play'); el.dispatchEvent(new CustomEvent('scene:play')); };
  if (!hasObserver) plays.forEach(fire);
  else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        fire(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.35 });
    plays.forEach((el) => observer.observe(el));
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

  /* ---------- Scroll: the statement, and where the desk should go quiet ---------- */
  const quiet = Array.from(document.querySelectorAll('[data-quiet]'));
  const hero = document.querySelector('.hero');
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
    // Text wins: the desk dims while a quiet section covers the middle band of the screen.
    const mid = vh * 0.5;
    let isQuiet = quiet.some((el) => {
      const r = el.getBoundingClientRect();
      return r.top < mid + vh * 0.2 && r.bottom > mid - vh * 0.2;
    });
    if (!isQuiet && narrow.matches && hero) isQuiet = hero.getBoundingClientRect().bottom < vh * 0.55;
    document.body.classList.toggle('scene-quiet', isQuiet);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  onScroll();

  /* ---------- The footer wordmark lights under the pointer ---------- */
  const glow = document.querySelector('.site-footer [data-glow]');
  if (glow && !reduce.matches && window.matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    let last = null;
    glow.closest('.site-footer').addEventListener('pointermove', (event) => {
      last = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = glow.getBoundingClientRect();
        glow.style.setProperty('--fx', `${last.clientX - r.left}px`);
        glow.style.setProperty('--fy', `${last.clientY - r.top}px`);
      });
    }, { passive: true });
  }
})();
