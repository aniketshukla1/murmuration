/*
 * Vesper demo: the departure board's letters flip into place once when it comes into
 * view, and the booking button opens a note saying the company is made up. The board
 * reads correctly before, during and after the flip (the real text stays for screen
 * readers), and nothing flips under reduced motion.
 */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const board = document.querySelector('[data-board]');
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function flip() {
    const items = Array.from(board.querySelectorAll('[data-flap]')).map((cell) => {
      const text = cell.textContent;
      const real = document.createElement('span');
      real.className = 'sr-only';
      real.textContent = text;
      const shown = document.createElement('span');
      shown.setAttribute('aria-hidden', 'true');
      cell.replaceChildren(real, shown);
      return { cell, text, shown };
    });
    const start = performance.now();
    const tick = (now) => {
      let done = true;
      items.forEach((item, i) => {
        // One letter settles every 45 ms, each cell a little after the one before it.
        const settled = Math.floor((now - start - i * 90) / 45);
        if (settled < item.text.length) done = false;
        item.shown.textContent = Array.from(item.text, (ch, j) => (ch === ' ' || j < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      });
      if (done) items.forEach((item) => { item.cell.textContent = item.text; });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (board && !reduce && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      flip();
    }, { threshold: 0.5 });
    observer.observe(board);
  }

  const note = document.querySelector('[data-note]');
  document.querySelectorAll('[data-book]').forEach((button) => {
    button.addEventListener('click', () => {
      if (note && typeof note.showModal === 'function') note.showModal();
      else window.location.href = 'https://github.com/aniketshukla1/murmuration';
    });
  });
})();
