/*
 * Page behaviour for the Murmuration site. Everything here adds to a page that
 * is already complete without it: the header backdrop after the hero, the
 * manifesto filling in as it is read ([data-fill]), each example's prompt
 * typing itself once as it arrives ([data-type]), and copy buttons. The flock
 * lives in flock.js.
 */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: paper backdrop once the hero is behind us. */
  const top = document.querySelector('[data-top]');
  const onScrollTop = () => top.classList.toggle('scrolled', window.scrollY > 40);
  onScrollTop();
  window.addEventListener('scroll', onScrollTop, { passive: true });

  /* Split an element's text into word spans, keeping the text readable to assistive tech. */
  function words(el) {
    const parts = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return parts.map((word, i) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      el.append(span);
      if (i < parts.length - 1) el.append(' ');
      return span;
    });
  }

  /* The manifesto fills in word by word as it crosses the screen. */
  const fills = [...document.querySelectorAll('[data-fill]')].map((el) => ({ el, w: words(el) }));
  function fill() {
    const vh = window.innerHeight;
    for (const { el, w } of fills) {
      const r = el.getBoundingClientRect();
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.86 - r.top) / (r.height + vh * 0.3)));
      const n = Math.round(p * w.length);
      w.forEach((span, i) => span.classList.toggle('lit', i < n));
    }
  }
  fill();
  window.addEventListener('scroll', fill, { passive: true });
  window.addEventListener('resize', fill);

  /* Each prompt types itself once, as the example arrives. */
  const prompts = [...document.querySelectorAll('[data-type]')];
  function type(el) {
    if (el.dataset.typed) return;
    el.dataset.typed = '1';
    const w = el._words;
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    let i = 0;
    const step = () => {
      if (i < w.length) {
        w[i].classList.add('on');
        w[i].after(caret);
        i += 1;
        setTimeout(step, 22 + Math.random() * 30);
      } else {
        setTimeout(() => el.classList.add('done'), 900);
      }
    };
    step();
  }
  for (const el of prompts) {
    el._words = words(el);
    if (reduce || !('IntersectionObserver' in window)) {
      el._words.forEach((span) => span.classList.add('on'));
      el.classList.add('done');
    }
  }
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { type(e.target); io.unobserve(e.target); }
    }, { threshold: 0.5 });
    prompts.forEach((el) => io.observe(el));
  }

  /* Copy buttons. */
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select it';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    });
  });
})();
