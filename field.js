/* Home background: a lattice in the entrance's 31px cell grid that answers input.
   - pointer position: a lens follows the pointer cell by cell (eased whole-cell jumps). Lattice
     points inside it grow into crosses, guide lines run through its cell, a readout names the cell.
   - pointer move: cells left behind open from their centreline, then fade (trail)
   - index selection (hover or keyboard focus on a page tile): the lens yields to two orange rails
     on the tile's edges, ticked every cell
   - click / tap / keyboard focus: a ring wave expands by Manhattan distance (the entrance's corner wave)
   - wheel: the lattice rolls one whole cell per notch and a streak runs down the pointer's column
   - idle: sparse single-cell flickers
   Pure canvas, no dependencies. Sleeps when nothing moves; off under prefers-reduced-motion. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioField = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, OPEN_MS = 180, LENS = 5.5 * CELL;
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
  // Lens strength at distance d: 1 at the centre, 0 at the rim, quadratic falloff.
  function lensAt(d, radius = LENS) {
    const k = 1 - clamp(d / radius);
    return k * k;
  }
  // Eased approach that settles exactly (no endless sub-pixel drift).
  function approach(value, goal, rate, epsilon = .3) {
    return Math.abs(goal - value) < epsilon ? goal : value + (goal - value) * rate;
  }
  const api = {CELL, LENS, ring, cellAt, lensAt, approach};
  if (typeof document === 'undefined') return api;

  const canvas = document.querySelector('.field');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return api;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0, h = 0, ox = 0, oy = 0, target = 0, wheelAcc = 0;
  let pulses = [], raf = 0, lastInput = 0, intro = 0, introStart = 0, idleTimer = 0;
  const pointer = {x: -1, y: -1, c: null, r: null, inside: false};
  // Lens: eased centre (x, y) chasing the centre of the pointer's cell (tx, ty); a = visibility.
  const lens = {x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0, placed: false};
  // Rails for the selected index tile: eased left/right edges and visibility.
  const rails = {l: 0, r: 0, tl: 0, tr: 0, a: 0, ta: 0, el: null};

  const entering = () => document.body.classList.contains('is-entering');
  const live = () => !reduce.matches && !document.hidden && !entering();

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox = Math.round((w / 2) % CELL);  // lattice centred on the viewport, like the entrance grid
    if (rails.el) railsTo(rails.el, true);
    draw(performance.now());
  }

  function pulse(c, r, delay, alpha, life, orange) {
    if (pulses.length > 700) pulses.splice(0, pulses.length - 700);
    pulses.push({c, r, t0: performance.now() + delay, alpha, life, orange});
  }
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const ga = reduce.matches ? 1 : intro;
    if (ga <= 0) return;
    const la = lens.a * ga;
    // Lattice: a dot at every intersection, a cross every fifth cell (the entrance's 5×5 block).
    // Inside the lens, points grow into crosses and brighten with proximity.
    const y0 = ((oy % CELL) + CELL) % CELL, r0 = Math.round((oy - y0) / CELL);
    for (let x = ox - CELL, c = -1; x < w + CELL; x += CELL, c++) {
      for (let y = y0 - CELL, r = -1; y < h + CELL; y += CELL, r++) {
        const major = ((c % 5) + 5) % 5 === 0 && (((r - r0) % 5) + 5) % 5 === 0;
        const k = la > 0 ? lensAt(Math.hypot(x - lens.x, y - lens.y)) * la : 0;
        const arm = (major ? 3 : 0) + Math.round(k * 5);
        ctx.fillStyle = k > .02 ? rgba(WHITE, (major ? .22 : .15) + k * .65) : (major ? '#3d3d3a' : '#262624');
        if (arm) { ctx.fillRect(x - arm, y, arm * 2 + 1, 1); ctx.fillRect(x, y - arm, 1, arm * 2 + 1); }
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
      ctx.fillStyle = rgba(p.orange ? ORANGE : WHITE, p.alpha * fade * ga);
      ctx.fillRect(cx - cw / 2, cy + 1, cw, CELL - 1);
    }
    // Lens furniture: guide lines through the cell (broken around it), an orange frame, a readout.
    if (la > .01) {
      const half = CELL / 2, gap = CELL * 1.5;
      ctx.fillStyle = rgba(WHITE, .12 * la);
      ctx.fillRect(Math.round(lens.x), 0, 1, Math.max(0, lens.y - gap));
      ctx.fillRect(Math.round(lens.x), lens.y + gap, 1, Math.max(0, h - lens.y - gap));
      ctx.fillRect(0, Math.round(lens.y), Math.max(0, lens.x - gap), 1);
      ctx.fillRect(lens.x + gap, Math.round(lens.y), Math.max(0, w - lens.x - gap), 1);
      ctx.strokeStyle = rgba(ORANGE, .75 * la); ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(lens.x - half) + .5, Math.round(lens.y - half) + .5, CELL - 1, CELL - 1);
      const c = Math.round((lens.x - ox - half) / CELL), r = Math.round((lens.y - oy - half) / CELL);
      ctx.font = '700 14px "Courier New", monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillStyle = rgba(WHITE, .5 * la);
      ctx.fillText(String(c).padStart(2, '0') + ' / ' + String(r).padStart(2, '0'), lens.x + half + 8, lens.y + half + 6);
    }
    // Selection rails: the chosen tile's edges extended across the viewport, ticked every cell.
    const ra = rails.a * ga;
    if (ra > .01) {
      for (const x of [Math.round(rails.l), Math.round(rails.r) - 1]) {
        ctx.fillStyle = rgba(ORANGE, .45 * ra); ctx.fillRect(x, 0, 1, h);
        ctx.fillStyle = rgba(ORANGE, .7 * ra);
        for (let y = y0; y < h; y += CELL) ctx.fillRect(x - 3, Math.round(y), 7, 1);
      }
    }
  }

  function frame(now) {
    raf = 0;
    if (intro < 1) intro = out((now - introStart) / 900);
    oy = approach(oy, target, .22);
    if (lens.placed) { lens.x = approach(lens.x, lens.tx, .28); lens.y = approach(lens.y, lens.ty, .28); }
    lens.a = approach(lens.a, lens.ta, .14, .01);
    rails.l = approach(rails.l, rails.tl, .3); rails.r = approach(rails.r, rails.tr, .3);
    rails.a = approach(rails.a, rails.ta, .18, .01);
    draw(now);
    const moving = oy !== target || lens.x !== lens.tx || lens.y !== lens.ty || lens.a !== lens.ta ||
      rails.l !== rails.tl || rails.r !== rails.tr || rails.a !== rails.ta;
    if (pulses.length || moving || intro < 1) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !reduce.matches) raf = requestAnimationFrame(frame); };

  function lensTo(x, y) {
    const {c, r} = cellAt(x, y, ox, oy);
    lens.tx = ox + c * CELL + CELL / 2; lens.ty = oy + r * CELL + CELL / 2;
    if (!lens.placed) { lens.x = lens.tx; lens.y = lens.ty; lens.placed = true; }
    lens.ta = rails.el ? 0 : 1;
  }
  function railsTo(el, instant) {
    const b = el.getBoundingClientRect();
    rails.tl = b.left; rails.tr = b.right; rails.ta = 1;
    if (instant || !rails.el || rails.a < .05) { rails.l = rails.tl; rails.r = rails.tr; }
    rails.el = el; lens.ta = 0;
  }
  function railsOff(el) {
    if (rails.el !== el) return;
    rails.el = null; rails.ta = 0; lens.ta = pointer.inside ? 1 : 0;
  }

  function wave(x, y, R, strength) {
    const {c, r} = cellAt(x, y, ox, oy);
    for (const cell of ring(c, r, R))
      pulse(cell.c, cell.r, cell.d * 38, strength * (1 - cell.d / (R + 1)), 760, cell.d === 0 || cell.d === R);
    wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = e.pointerType === 'mouse' || e.pointerType === 'pen';
    if (!live()) return;
    if (pointer.inside) lensTo(e.clientX, e.clientY);
    const {c, r} = cellAt(e.clientX, e.clientY, ox, oy);
    if (c !== pointer.c || r !== pointer.r) {
      pointer.c = c; pointer.r = r; lastInput = performance.now();
      pulse(c, r, 0, .12, 1000, false);
    }
    wake();
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; lens.ta = 0; wake(); });

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
    if (lens.placed) { lens.ty -= dir * CELL; }  // the lens rides the lattice
    wake();
  }, {passive: true});

  // Index selection: hover and keyboard focus share one response.
  const tiles = document.querySelectorAll('.index a');
  tiles.forEach(el => {
    el.addEventListener('pointerenter', () => { if (live()) { railsTo(el); wake(); } });
    el.addEventListener('pointerleave', () => { railsOff(el); wake(); });
    el.addEventListener('focus', () => { if (live() && el.matches(':focus-visible')) { railsTo(el); wake(); } });
    el.addEventListener('blur', () => { railsOff(el); wake(); });
  });
  addEventListener('scroll', () => { if (rails.el) { railsTo(rails.el, true); wake(); } }, {passive: true});

  // Keyboard parity for the wave: focusing any link sends a small wave from its centre.
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
  reduce.addEventListener?.('change', () => { pulses = []; lens.a = lens.ta = rails.a = rails.ta = 0; draw(performance.now()); });
  // entrance.js runs first (both deferred); if it is playing, wait for it to finish.
  start();
  return api;
});
