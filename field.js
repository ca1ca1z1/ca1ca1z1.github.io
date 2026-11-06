/* Home background: a lattice in the entrance's 31px cell grid that answers input.
   - pointer move: the cell under the pointer opens from its vertical centreline, then fades
   - click / tap / keyboard focus: a ring wave expands by Manhattan distance (the entrance's corner wave)
   - wheel: the lattice rolls one whole cell per notch and a streak runs down the pointer's column
   - idle: sparse single-cell flickers
   Pure canvas, no dependencies. Sleeps when nothing moves; off under prefers-reduced-motion. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioField = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, OPEN_MS = 180;
  const WHITE = '243,243,237', ORANGE = '255,90,31';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);

  // Cells at Manhattan distance 0..R from (c, r), nearest first.
  function ring(c, r, R) {
    const cells = [];
    for (let d = 0; d <= R; d++) {
      if (d === 0) { cells.push({c, r, d}); continue; }
      for (let i = 0; i < d; i++) {
        cells.push({c: c + i, r: r - d + i, d}, {c: c + d - i, r: r + i, d},
                   {c: c - i, r: r + d - i, d}, {c: c - d + i, r: r - i, d});
      }
    }
    return cells;
  }
  // Lattice column/row under a viewport point, given lattice origin and vertical roll.
  function cellAt(x, y, ox, oy) {
    return {c: Math.floor((x - ox) / CELL), r: Math.floor((y - oy) / CELL)};
  }
  const api = {CELL, ring, cellAt};
  if (typeof document === 'undefined') return api;

  const canvas = document.querySelector('.field');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return api;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0, h = 0, ox = 0, oy = 0, target = 0, wheelAcc = 0;
  let pulses = [], raf = 0, lastInput = 0, intro = 0, introStart = 0, idleTimer = 0;
  let pointer = {x: -1, y: -1, c: null, r: null};

  const entering = () => document.body.classList.contains('is-entering');
  const live = () => !reduce.matches && !document.hidden && !entering();

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox = Math.round((w / 2) % CELL);  // lattice centred on the viewport, like the entrance grid
    draw(performance.now());
  }

  function pulse(c, r, delay, alpha, life, orange) {
    if (pulses.length > 700) pulses.splice(0, pulses.length - 700);
    pulses.push({c, r, t0: performance.now() + delay, alpha, life, orange});
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const ga = reduce.matches ? 1 : intro;
    if (ga <= 0) return;
    // Lattice: a dot at every intersection, a cross every fifth cell (the entrance's 5×5 block).
    const y0 = ((oy % CELL) + CELL) % CELL, r0 = Math.round((oy - y0) / CELL);
    ctx.globalAlpha = ga;
    for (let x = ox - CELL, c = -1; x < w + CELL; x += CELL, c++) {
      for (let y = y0 - CELL, r = -1; y < h + CELL; y += CELL, r++) {
        const major = ((c % 5) + 5) % 5 === 0 && (((r - r0) % 5) + 5) % 5 === 0;
        ctx.fillStyle = major ? '#3d3d3a' : '#262624';
        if (major) { ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); }
        else ctx.fillRect(x, y, 1, 1);
      }
    }
    // Pulses: open from the centreline over OPEN_MS, then fade for the rest of their life.
    pulses = pulses.filter(p => now - p.t0 < p.life);
    for (const p of pulses) {
      const age = now - p.t0;
      if (age < 0) continue;
      const open = out(age / OPEN_MS), fade = 1 - clamp((age - OPEN_MS) / (p.life - OPEN_MS));
      const cw = (CELL - 1) * open, cx = ox + p.c * CELL + CELL / 2, cy = oy + p.r * CELL;
      ctx.fillStyle = `rgba(${p.orange ? ORANGE : WHITE},${p.alpha * fade * ga})`;
      ctx.fillRect(cx - cw / 2, cy + 1, cw, CELL - 1);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (intro < 1) intro = out((now - introStart) / 900);
    const diff = target - oy;
    oy = Math.abs(diff) < .3 ? target : oy + diff * .22;
    draw(now);
    if (pulses.length || oy !== target || intro < 1) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !reduce.matches) raf = requestAnimationFrame(frame); };

  function wave(x, y, R, strength) {
    const {c, r} = cellAt(x, y, ox, oy);
    for (const cell of ring(c, r, R))
      pulse(cell.c, cell.r, cell.d * 38, strength * (1 - cell.d / (R + 1)), 760, cell.d === 0 || cell.d === R);
    wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (!live()) return;
    const {c, r} = cellAt(e.clientX, e.clientY, ox, oy);
    if (c === pointer.c && r === pointer.r) return;
    pointer.c = c; pointer.r = r; lastInput = performance.now();
    pulse(c, r, 0, .16, 1100, false); wake();
  }, {passive: true});

  addEventListener('pointerdown', e => {
    if (!live()) return;
    lastInput = performance.now();
    wave(e.clientX, e.clientY, 7, .5);
  }, {passive: true});

  addEventListener('wheel', e => {
    if (!live()) return;
    lastInput = performance.now();
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    if (Math.abs(wheelAcc) < 60) return;
    const dir = Math.sign(wheelAcc); wheelAcc = 0;
    target -= dir * CELL;
    const x = pointer.x >= 0 ? pointer.x : w / 2, y = pointer.y >= 0 ? pointer.y : h / 2;
    const {c, r} = cellAt(x, y, ox, target);
    for (let i = 0; i < 9; i++) pulse(c, r + dir * i, i * 28, .3 * (1 - i / 10), 900, i === 0);
    wake();
  }, {passive: true});

  // Keyboard parity: focusing a link sends a small wave from its centre.
  document.addEventListener('focusin', e => {
    if (!live() || !e.target.matches?.(':focus-visible')) return;
    const b = e.target.getBoundingClientRect();
    wave(b.left + b.width / 2, b.top + b.height / 2, 3, .35);
  });

  function idle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(idle, 1300 + Math.random() * 1400);
    if (!live() || performance.now() - lastInput < 3000) return;
    pulse(Math.floor(Math.random() * w / CELL), Math.floor((Math.random() * h - oy) / CELL), 0, .1, 1500, Math.random() < .15);
    wake();
  }

  function start() {
    if (entering()) return;
    observer.disconnect();
    introStart = performance.now(); intro = reduce.matches ? 1 : 0;
    resize(); wake(); idle();
  }
  const observer = new MutationObserver(start);
  observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduce.addEventListener?.('change', () => { pulses = []; draw(performance.now()); });
  // entrance.js runs first (both deferred); if it is playing, wait for it to finish.
  start();
  return api;
});
