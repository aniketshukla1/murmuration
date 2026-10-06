/*
 * Image sequence scrubbed by scroll: a pinned stage draws the frame that matches how far its
 * section has been scrolled. For a product assembling, a crane lifting, a pour, a door opening.
 *
 *   <section class="sequence" style="height: 320vh">
 *     <div class="sequence-stage">                       position: sticky; top: 0; height: 100vh
 *       <img class="sequence-still" src="frames/lift-060.webp" alt="What the moment shows">
 *       <canvas data-sequence="frames/lift-{i}.webp" data-frames="120" data-pad="3"></canvas>
 *     </div>
 *   </section>
 *
 *   data-sequence  URL pattern; {i} is the frame number
 *   data-frames    how many frames; data-start is the first number (default 1); data-pad zero-pads
 *   data-fit       cover (default) or contain
 *   data-range     "start end": the share of the section's scroll the sequence uses (default "0 1")
 *
 * Frames load first and last, then every 8th, 4th and 2nd, then the rest, so scrubbing works
 * early; the nearest loaded frame is drawn meanwhile. The stage gets .is-live once a frame is
 * drawn, and the section gets --p (0 to 1). Without JS, and under reduced motion, the still
 * image stays: make it the most telling frame. Loading starts two screens before the section.
 */
(() => {
  'use strict';

  const canvases = Array.from(document.querySelectorAll('canvas[data-sequence]'));
  if (!canvases.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sequences = canvases.map((canvas) => {
    const count = Math.max(1, Number(canvas.dataset.frames) || 1);
    const start = Number(canvas.dataset.start || 1);
    const pad = Number(canvas.dataset.pad || 0);
    const [r0, r1] = (canvas.dataset.range || '0 1').split(/\s+/).map(Number);
    const url = (k) => canvas.dataset.sequence.replace('{i}', String(start + k).padStart(pad, '0'));
    // Coarse to fine: the ends, then every 8th, 4th, 2nd frame, then the rest.
    const order = [0, count - 1];
    [8, 4, 2, 1].forEach((step) => { for (let k = 0; k < count; k += step) if (!order.includes(k)) order.push(k); });
    return {
      canvas,
      ctx: canvas.getContext('2d'),
      section: canvas.closest('section') || canvas.parentElement,
      stage: canvas.parentElement,
      count,
      url,
      order,
      range: [Number.isFinite(r0) ? r0 : 0, Number.isFinite(r1) ? r1 : 1],
      fit: canvas.dataset.fit === 'contain' ? 'contain' : 'cover',
      frames: new Array(count),
      next: 0,
      loading: 0,
      started: false,
      drawn: -1,
      progress: 0,
    };
  });

  function load(seq) {
    while (seq.loading < 6 && seq.next < seq.order.length) {
      const k = seq.order[seq.next++];
      const img = new Image();
      img.decoding = 'async';
      seq.loading++;
      img.onload = () => {
        seq.loading--;
        seq.frames[k] = img;
        if (seq.drawn < 0 || Math.abs(k - target(seq)) < Math.abs(seq.drawn - target(seq))) queue();
        load(seq);
      };
      img.onerror = () => { seq.loading--; load(seq); };
      img.src = seq.url(k);
    }
  }

  const target = (seq) => Math.round(seq.progress * (seq.count - 1));

  // The loaded frame nearest the one scroll asks for.
  function nearest(seq, k) {
    for (let d = 0; d < seq.count; d++) {
      if (seq.frames[k - d]) return k - d;
      if (seq.frames[k + d]) return k + d;
    }
    return -1;
  }

  function size(seq) {
    const r = seq.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (seq.canvas.width !== w || seq.canvas.height !== h) {
      seq.canvas.width = w;
      seq.canvas.height = h;
      seq.drawn = -1;
    }
  }

  function draw(seq) {
    const k = nearest(seq, target(seq));
    if (k < 0 || k === seq.drawn) return;
    const img = seq.frames[k];
    const { width: cw, height: ch } = seq.canvas;
    const scale = seq.fit === 'cover' ? Math.max(cw / img.naturalWidth, ch / img.naturalHeight) : Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    seq.ctx.clearRect(0, 0, cw, ch);
    seq.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    seq.drawn = k;
    seq.stage.classList.add('is-live');
  }

  let queued = false;
  function frame() {
    queued = false;
    const vh = window.innerHeight || 1;
    sequences.forEach((seq) => {
      const r = seq.section.getBoundingClientRect();
      const travel = Math.max(1, r.height - vh);
      const raw = Math.min(1, Math.max(0, -r.top / travel));
      seq.section.style.setProperty('--p', raw.toFixed(4));
      const [a, b] = seq.range;
      seq.progress = Math.min(1, Math.max(0, (raw - a) / Math.max(0.0001, b - a)));
      if (!seq.started && r.top < vh * 3 && r.bottom > -vh * 2) { seq.started = true; load(seq); }
      if (r.bottom > 0 && r.top < vh) draw(seq);
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  const resize = new ResizeObserver(() => { sequences.forEach(size); queue(); });
  sequences.forEach((seq) => { size(seq); resize.observe(seq.canvas); });
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  queue();
})();
