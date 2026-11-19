/* Experience page motion — a constructivist blueprint after an event PV (0:12–0:13 and 0:24–0:26):
   things are taken apart into numbered pieces and put back together on construction lines.
   - opening (1.7 s): hard cuts on a two-frame beat — negative, cobalt, paper — onto a construction
     plate (circles on axes, tangent circles on a baseline, numbered blades round a crosshair);
     serrated cobalt fills grow a frame at a time with stacked echo contours; the plate datamoshes
     into level streaks (one column stretched, unsmoothed) and tears away in bands; underneath, the
     title slices and the scaffold glide back together
   - scaffold: construction pieces built from the layout (orbits round the title, a compass on the
     title rule, a station per entry on a margin axis, a ray fan, serrated fills — inked for
     professional entries, a dashed outline for the rest — and a cobalt slab cut at each joint),
     all numbered. The title is cut into numbered slices; the slice under the pointer steps aside
   - reading (scroll position, continuous): a reading line runs from mid-screen at the top of the
     page to the page's end at the bottom. The slab (or, on narrow screens, the rig) inks down to
     it; a tracer rides the margin axis, inking it and each station it passes; the title orbits
     turn as the title leaves; the ray fan opens as the reading line nears it; a point travels round
     the great circle while its ruler ticks slide
   - pointer: a drafting compass placed whole on the nearest dot-grid node — construction lines
     through it, a 2px ring, an orange centre, the node's coordinates, and a dotted arc that runs
     counter-clockwise from +x to the far end of the ring's gap
   - click / tap on open paper: the ring's next sixth breaks off into shards (counter-clockwise from
     +x); after the sixth click, a 0.1 s pause, then the ring regrows in one turn (see strike/ringAt)
   - entry selection (hover or keyboard focus): CSS — a serrated cobalt flood rises up the plate and
     echo contours open out behind it
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, reading motion,
   shards or regrowth turn; the scaffold stands assembled and fully inked, the compass remains, its
   ring loses sectors and returns instantly, the title slice under the pointer shows its number,
   and the plate fill is instant (CSS).
   The dot grid is CSS in page coordinates and the scaffold is page-anchored DOM, so both scroll
   natively. One requestAnimationFrame per frame; the loop sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExperienceScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, NODE = 62, OFF = 31, BEAT = 84, FRAME = 42, INTRO_MS = 1700;
  // Opening timeline (ms): three hard cuts a beat apart, then the fills grow and the plate moshes
  // a frame (24 fps) at a time.
  const CUT_NEG = BEAT, CUT_COBALT = 2 * BEAT, CUT_BAR = 3 * BEAT;
  const GROW_STEPS = 12, GROW_END = CUT_BAR + GROW_STEPS * FRAME;
  const MOSH_STEPS = 8, MOSH_END = GROW_END + MOSH_STEPS * FRAME;
  const TEAR_START = MOSH_END, TEAR_END = 1560, BAND_DELAY = 260;
  const ASSEMBLE_START = 1000, ASSEMBLE_MS = 400;
  const COBALT = '29,68,200', PAPER = '205,212,212', ORANGE = '255,90,31', INK = '16,16,16', WHITE = '243,243,237';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);
  const inOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  // Nearest dot-grid node to a page coordinate (dots at OFF + NODE·k, as drawn by the CSS).
  const node = v => OFF + NODE * Math.round((v - OFF) / NODE);
  // Small deterministic generator, so the opening and the scaffold look the same on every visit.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }
  // Horizontal bands that exactly cover height h: y, height, direction (±1), start delay (ms) and
  // how far across the screen its datamosh streak reaches (0.35..1).
  function bands(h, n = 16, seed = 6) {
    const r = rng(seed), weights = Array.from({length: n}, () => .35 + r());
    const sum = weights.reduce((a, b) => a + b, 0), list = [];
    let y = 0;
    weights.forEach((wt, i) => {
      const bh = i === n - 1 ? h - y : Math.round(h * wt / sum);
      list.push({y, h: bh, dir: r() < .5 ? -1 : 1, delay: Math.round(r() * BAND_DELAY), reach: .35 + r() * .65});
      y += bh;
    });
    return list;
  }
  // Opening state at t ms. Cuts land on the beat, growth and mosh on frames: no easing until the tear.
  function intro(t) {
    const stepIn = (start, n) => t < start ? 0 : Math.min(n, Math.floor((t - start) / FRAME) + 1) / n;
    return {
      ground: t < CUT_NEG ? 'neg' : t < CUT_COBALT ? 'cobalt' : 'paper',
      bar: t >= CUT_COBALT && t < CUT_BAR,
      grow: stepIn(CUT_BAR, GROW_STEPS),
      mosh: stepIn(GROW_END, MOSH_STEPS),
      tearing: t >= TEAR_START,
      done: t >= INTRO_MS
    };
  }
  const tearAt = (t, band) => inOut((t - TEAR_START - band.delay) / (TEAR_END - TEAR_START - BAND_DELAY));
  // Datamosh streak of a band at mosh m (0..1): the source column `src` stretched over [x, x+len],
  // growing in from the band's side of the screen.
  function moshAt(m, band, w) {
    const len = Math.round(w * band.reach * clamp(m));
    return band.dir > 0 ? {src: Math.min(w - 1, w - len), x: w - len, len} : {src: Math.min(w - 1, len), x: 0, len};
  }
  // Opening reassembly of piece i: apart (1) until its start, then gliding home over ASSEMBLE_MS.
  function assemble(t, i) {
    const s = ASSEMBLE_START + Math.min(i, 8) * 32;
    return t < s ? 1 : 1 - out((t - s) / ASSEMBLE_MS);
  }
  // Reading line (page y) for a scroll position: half-way down the screen at the top of the page,
  // reaching the page's end when scrolled to the bottom.
  function readLine(sy, h, docH) {
    const max = docH - h, k = max > 0 ? clamp(sy / max) : 1;
    return sy + h * (.5 + .5 * k);
  }
  // How far the reading line has inked a span [top, bottom] (0..1).
  const inkAt = (y, top, bottom) => bottom > top ? clamp((y - top) / (bottom - top)) : (y >= top ? 1 : 0);
  // A fan ray's angle as the fan opens (q 0..1): from near-vertical (a quarter open) to its own angle.
  const fanAngle = (base, q) => -Math.PI / 2 + (base + Math.PI / 2) * (.25 + .75 * clamp(q));
  // The title's slices: top and bottom (% of the line box, contiguous 0..100), displacement in cells
  // (alternating sides, 1..4), and the number each one carries.
  function slices(n = 7, seed = 24) {
    const r = rng(seed), wts = Array.from({length: n}, () => .5 + r()), sum = wts.reduce((a, b) => a + b, 0);
    let y = 0;
    return wts.map((wt, i) => {
      const t = y;
      y = i === n - 1 ? 100 : Math.round((y + wt / sum * 100) * 10) / 10;
      return {t, b: y, amp: (i % 2 ? 1 : -1) * (1 + Math.floor(r() * 4)), n: i + 1};
    });
  }
  // A w×h block with a sawtooth edge on one side ('left' | 'right' | 'top' | 'bottom'), as the PV's
  // feathered fills: teeth `tooth` px apart and `depth` px deep; with `slant`, the far corner at
  // the start of the edge is cut off on a slant. Polygon points inside the box.
  function serrate(w, h, side = 'left', tooth = 10, depth = 7, slant = true) {
    const vertical = side === 'left' || side === 'right', len = vertical ? h : w, across = vertical ? w : h;
    const d = Math.min(depth, across), cut = slant ? Math.round(Math.min(across, len) * .45) : 0;
    const uv = cut ? [[across - cut, 0], [across, cut], [across, len], [0, len]] : [[across, 0], [across, len], [0, len]];
    for (let v = len; v > 0;) { v = Math.max(0, v - tooth); uv.push([d, v], [0, v]); }
    const map = {left: ([u, v]) => [u, v], right: ([u, v]) => [w - u, v], top: ([u, v]) => [v, u], bottom: ([u, v]) => [v, h - u]}[side];
    return uv.map(map);
  }

  // Construction scaffold for a layout (page px): w viewport width, docH page height, right the
  // content column's right edge, head {left, top, bottom (title rule), textRight}, plates
  // [{top, bottom, pro}]. Pieces have a page origin (x, y), a deconstruction displacement in cells
  // (dx, dy) and spin (12° steps), and parts relative to the origin. Margin pieces stay right of the
  // content column; only the orbits pass behind the title, faintly.
  function scaffold(L) {
    const {w, right, head, plates} = L, list = [];
    let n = 0;
    const piece = (kind, x, y, dx, dy, parts, extra) => { const p = Object.assign({kind, x: Math.round(x), y: Math.round(y), dx, dy, spin: 0, parts}, extra); list.push(p); return p; };
    const num = (x, y) => ({t: 'num', x: Math.round(x), y: Math.round(y), n: ++n});
    const rad = d => d * Math.PI / 180;
    // On an ellipse rotated by rot°, the point at parameter angle th°, pushed out by k px.
    const onEllipse = (e, th, k) => {
      const c = Math.cos(rad(th)), s = Math.sin(rad(th)), cr = Math.cos(rad(e.rot)), sr = Math.sin(rad(e.rot));
      const x = (e.rx + k) * c, y = (e.ry + k) * s;
      return [e.cx + x * cr - y * sr, e.cy + x * sr + y * cr];
    };
    // Orbits round the title.
    const tl = head.left, tr = Math.max(head.textRight, tl + 160), span = tr - tl, th = head.bottom - head.top;
    const e1 = {t: 'ellipse', cx: 0, cy: 0, rx: Math.round(span * .6), ry: Math.round(th * .38), rot: -12};
    const e2 = {t: 'ellipse', cx: Math.round(span * .06), cy: 6, rx: Math.round(span * .64), ry: Math.round(th * .27), rot: 8};
    piece('orbit', tl + span * .52, (head.top + head.bottom) / 2 - 6, -1, -1,
      [e1, e2, num(...onEllipse(e1, 250, 10)), num(...onEllipse(e2, 108, 12))], {spin: 2});
    // A compass standing on the title rule, right of the word.
    const space = right - tr, R0 = Math.round(Math.min(96, th * .42, space * .28));
    if (R0 >= 40) {
      const r = Math.round(R0 * .32), cx = tr + space * .58, cy = head.bottom - 2 * r - R0;
      piece('compass', cx, cy, 2, -1, [
        {t: 'v', x: 0, y: -R0 - 40, len: 2 * R0 + 2 * r + 80},
        {t: 'circle', cx: 0, cy: 0, r: R0}, {t: 'circle', cx: 0, cy: R0 + r, r},
        {t: 'node', cx: 0, cy: R0}, num(R0 * .74 + 8, -R0 * .74 - 10)]);
    }
    // Margin column: an axis through the page, a station (circle, tangent circle, baseline back to
    // the plate) per entry, a serrated fill on professional ones, and a ray fan to a vertex below.
    const m = w - right;
    if (m >= 200 && plates.length) {
      const Rm = Math.round(Math.min(150, Math.max(70, m * .36))), ax = Math.round(right + Math.max(m * .46, Rm + 36));
      piece('axis', ax, 0, 0, 0, [{t: 'v', x: 0, y: 0, len: L.docH}], {fixed: true});
      plates.forEach((p, i) => {
        const R = Math.round(Math.min(Rm, (p.bottom - p.top) * .5)), r = Math.round(R * .3);
        const parts = [
          {t: 'circle', cx: 0, cy: 0, r: R, dash: !p.pro}, {t: 'circle', cx: 0, cy: R + r, r, dash: !p.pro},
          {t: 'h', x: right - ax, y: R + 2 * r, len: w - right}, {t: 'node', cx: 0, cy: R}, num(R * .74 + 8, -R * .74 - 10)];
        // Professional entries get an inked fill; the others its dashed outline, not yet inked.
        const bw = p.pro ? 2 * CELL : CELL + 10, bh = Math.round(R * (p.pro ? 1.5 : 1.1)), bx = -Math.round(R * .95), by = -Math.round(R * (p.pro ? .62 : .4));
        parts.push({t: 'block', x: bx, y: by, w: bw, h: bh, side: 'left', echo: p.pro ? 3 : 1, ghost: !p.pro}, num(bx + bw + 8, by + bh + 12));
        piece('station', ax, (p.top + p.bottom) / 2 - r, 1 + i % 2, i % 2 ? 2 : -2, parts);
      });
      // Wide margins: a great circle cropped by the screen edge on a ticked measuring line, and a
      // serrated fill hanging from the top.
      if (m >= 420) {
        const RB = Math.round(m * .5), bx = Math.round(w - m * .08), by = Math.round((plates[0].top + plates[plates.length - 1].bottom) / 2);
        piece('arc', bx, by, 2, 1, [
          {t: 'circle', cx: 0, cy: 0, r: RB}, {t: 'v', x: 0, y: -RB - 62, len: 2 * RB + 124},
          {t: 'ticks', x: ax - bx, y: 0, len: bx - ax + RB}, {t: 'node', cx: -RB, cy: 0}, num(-RB - 40, -16)]);
        const hx = Math.round(w - m * .3), hh = 6 * CELL;
        piece('hang', hx, L.bar, 1, -2, [{t: 'block', x: 0, y: 0, w: 2 * CELL, h: hh, side: 'left', echo: 3, flip: true}, num(2 * CELL + 10, hh + 14)]);
      }
      const last = plates[plates.length - 1], vx = Math.round(ax + Rm * .35), vy = Math.round(last.bottom + 48);
      const top = Math.round(plates[0].top - 24), k = 5, rays = [];
      for (let j = 0; j < k; j++) {
        const x = right + 24 + (w - 12 - right - 24) * j / (k - 1);
        rays.push({t: 'ray', x1: 0, y1: 0, x2: Math.round(x - vx), y2: top - vy});
      }
      piece('fan', vx, vy, 1, 2, [...rays, num(10, 10)]);
    }
    return list;
  }
  // Page-space bounds of a piece as assembled: [x0, y0, x1, y1]. Numbers count as 28×14.
  function bounds(p) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
    for (const q of p.parts) {
      if (q.t === 'circle') add(q.cx - q.r, q.cy - q.r, q.cx + q.r, q.cy + q.r);
      else if (q.t === 'ellipse') {
        const a = q.rot * Math.PI / 180, ex = Math.hypot(q.rx * Math.cos(a), q.ry * Math.sin(a)), ey = Math.hypot(q.rx * Math.sin(a), q.ry * Math.cos(a));
        add(q.cx - ex, q.cy - ey, q.cx + ex, q.cy + ey);
      } else if (q.t === 'v') add(q.x, q.y, q.x + 1, q.y + q.len);
      else if (q.t === 'h') add(q.x, q.y, q.x + q.len, q.y + 1);
      else if (q.t === 'ticks') add(q.x, q.y - 4, q.x + q.len, q.y + 5);
      else if (q.t === 'ray') add(Math.min(q.x1, q.x2), Math.min(q.y1, q.y2), Math.max(q.x1, q.x2), Math.max(q.y1, q.y2));
      else if (q.t === 'node') add(q.cx - 5, q.cy - 5, q.cx + 5, q.cy + 5);
      else if (q.t === 'num') add(q.x, q.y - 7, q.x + 28, q.y + 7);
      else if (q.t === 'block') add(q.x - q.echo * 5, q.y, q.x + q.w, q.y + q.h + q.echo * 7);
    }
    return [p.x + x0, p.y + y0, p.x + x1, p.y + y1];
  }

  // Breakable compass ring (after the PV's halo shatter, 0:33.3). The ring is six sectors. Each
  // click breaks the next one, counter-clockwise from +x, into shards. Once all six are gone the
  // ring waits REGEN_WAIT, then regrows in one counter-clockwise turn from +x. The outer dotted arc
  // always runs counter-clockwise from +x to the far end of the gap (or of the regrowing ring).
  // Angles here are counter-clockwise magnitudes from +x; on screen (y down) they are negated.
  const TAU = Math.PI * 2, SECTOR = TAU / 6, REGEN_WAIT = 100, REGEN_MS = 520, SHARD_MS = 420, SHARD_SOLID = 60;
  const fresh = () => ({broken: 0, regen: -1});
  // A click: break the next sector; ignored while the ring is fully broken or regrowing.
  function strike(state, now) {
    if (state.broken >= 6) return state;
    const broken = state.broken + 1;
    return {broken, regen: broken === 6 ? now + REGEN_WAIT : -1};
  }
  // What to draw at `now`: the ring arc [from, to], the dotted arc's extent, and the state after
  // (regrowth finished → fresh). `instant` (reduced tier) regrows without the turn.
  function ringAt(state, now, instant) {
    if (state.broken < 6) return {from: state.broken * SECTOR, to: TAU, dotted: state.broken * SECTOR, state};
    if (now < state.regen) return {from: 0, to: 0, dotted: TAU, state};
    const k = instant ? 1 : out((now - state.regen) / REGEN_MS);
    if (k >= 1) return {from: 0, to: TAU, dotted: 0, state: fresh()};
    return {from: 0, to: k * TAU, dotted: k * TAU, state};
  }
  // Shards for sector i: irregular polygons (4–6 vertices) along that sector of a ring of radius r,
  // each drifting outward. Points are relative to the shard's centre.
  function sectorShards(i, r, n = 8) {
    const g = rng(97 + i * 31);
    return Array.from({length: n}, (_, j) => {
      const a = i * SECTOR + SECTOR * ((j + .15 + g() * .7) / n), size = 1.6 + g() * 2.6, k = 4 + Math.floor(g() * 3);
      const pts = Array.from({length: k}, (_, m) => {
        const q = (m / k) * TAU + g() * .6, s = size * (.6 + g() * .6);
        return [Math.cos(q) * s, Math.sin(q) * s];
      });
      return {a, r: r + (g() - .5) * 4, drift: 3 + g() * 10, pts};
    });
  }
  const api = {CELL, NODE, OFF, BEAT, FRAME, INTRO_MS, GROW_END, MOSH_END, TEAR_START, TEAR_END, ASSEMBLE_MS, TAU, SECTOR, REGEN_WAIT, REGEN_MS, SHARD_MS,
    node, rng, bands, intro, tearAt, moshAt, assemble, readLine, inkAt, fanAngle, slices, serrate, scaffold, bounds,
    fresh, strike, ringAt, sectorShards};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), veilEl = document.querySelector('.veil');
  const ctx = field && field.getContext('2d'), vtx = veilEl && veilEl.getContext('2d');
  if (!ctx || !vtx) { html.classList.remove('is-intro'); return api; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const live = () => !reduce.matches;
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const MONO = '14px ui-monospace, Consolas, "Courier New", monospace';
  const R = NODE / 2;   // compass ring radius; the dotted arc runs at 2R
  const SHARDS = Array.from({length: 6}, (_, i) => sectorShards(i, R));

  let w = 0, h = 0, dpr = 1, raf = 0;
  let introOn = html.classList.contains('is-intro') && !reduce.matches, t0 = -1;
  const pointer = {x: 0, y: 0, on: false};
  const compass = {nx: NaN, ny: NaN};
  let ringState = fresh(), shatters = [], selected = null;
  const dirty = {field: true, place: true, build: true, read: true};
  if (!introOn) { html.classList.remove('is-intro'); veilEl.hidden = true; }

  // --- title slices ----------------------------------------------------------------------------
  // The word stays in the heading (transparent once the slices draw it); the slices are copies,
  // each clipped to its band, moved only by transform.
  const h1 = document.querySelector('.head h1'), headEl = document.querySelector('.head');
  const bar = document.querySelector('.bar'), endEl = document.querySelector('.end');
  const word = h1.textContent.trim();
  const wordEl = document.createElement('span');
  wordEl.className = 'w'; wordEl.textContent = word;
  h1.textContent = ''; h1.append(wordEl);
  const SL = slices();
  const cuts = SL.map((s, i) => {
    const el = document.createElement('span');
    el.className = 'sl'; el.setAttribute('aria-hidden', 'true'); el.textContent = word;
    el.dataset.n = String(s.n).padStart(2, '0');
    el.style.setProperty('--t', i === 0 ? '-60%' : s.t + '%');
    el.style.setProperty('--b', i === SL.length - 1 ? '-60%' : (100 - s.b) + '%');
    el.style.setProperty('--m', ((s.t + s.b) / 2).toFixed(1) + '%');
    h1.append(el);
    return {el, s, key: '', off: false};
  });
  h1.classList.add('cut');
  let title = {left: 0, top: 0, right: 0, bottom: 0, mid: 0}, hoverSlice = -1;

  // --- scaffold --------------------------------------------------------------------------------
  const scaf = document.createElement('div');
  scaf.className = 'scaffold'; scaf.setAttribute('aria-hidden', 'true');
  document.body.prepend(scaf);
  let pieces = [];

  function measure() {
    const sy = scrollY, rect = el => el.getBoundingClientRect();
    const lis = [...document.querySelectorAll('.log li')], hb = rect(headEl), wb = rect(wordEl), tb = rect(h1);
    return {
      w: html.clientWidth, docH: Math.ceil(rect(endEl).bottom + sy), bar: Math.round(rect(bar).bottom + sy),
      right: lis.length ? Math.round(rect(lis[0]).right) : Math.round(hb.right),
      head: {left: Math.round(hb.left), top: Math.round(hb.top + sy), bottom: Math.round(hb.bottom + sy), textRight: Math.round(wb.right)},
      title: {left: wb.left, right: wb.right, top: tb.top + sy, bottom: tb.bottom + sy},
      plates: lis.map(li => { const b = rect(li); return {top: Math.round(b.top + sy), bottom: Math.round(b.bottom + sy), pro: !!li.closest('.pro')}; }),
      joints: [...document.querySelectorAll('.joint')].map(j => { const b = rect(j); return {x: Math.round(b.left), y: Math.round((b.top + b.bottom) / 2 + sy)}; }),
      logs: [...document.querySelectorAll('.log')].map(el => { const b = rect(el); return {el, top: b.top + sy, bottom: b.bottom + sy}; })
    };
  }
  const box = (cls, x, y, wd, ht) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.cssText = `left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(wd)}px;height:${Math.round(ht)}px`;
    return el;
  };
  // A serrated cobalt fill with stacked echo contours behind it, drawn once into a small canvas.
  function block(q) {
    const ex = -5, ey = 7, pad = q.echo * 5, c = document.createElement('canvas'), k = dpr;
    c.className = 'blk';
    c.width = Math.ceil((q.w + pad + 2) * k); c.height = Math.ceil((q.h + q.echo * ey + 2) * k);
    c.style.cssText = `left:${q.x - pad - 1}px;top:${q.y - 1}px;width:${c.width / k}px;height:${c.height / k}px`;
    const g = c.getContext('2d'), pts = serrate(q.w, q.h, q.side, 10, 7).map(([x, y]) => [x, q.flip ? q.h - y : y]);
    g.setTransform(k, 0, 0, k, (pad + 1) * k, k);
    const path = (ox, oy) => { g.beginPath(); pts.forEach(([x, y], j) => j ? g.lineTo(x + ox, y + oy) : g.moveTo(x + ox, y + oy)); g.closePath(); };
    g.lineWidth = 1;
    if (q.ghost) g.setLineDash([4, 3]);
    for (let e = q.echo; e >= 1; e--) {
      path(ex * e, ey * e);
      if (!q.ghost) { g.fillStyle = rgba(PAPER, 1); g.fill(); }
      g.strokeStyle = rgba(COBALT, .75 - e * .15); g.stroke();
    }
    path(0, 0);
    if (q.ghost) { g.fillStyle = rgba(PAPER, .9); g.fill(); g.strokeStyle = rgba(COBALT, .85); g.stroke(); }
    else { g.fillStyle = rgba(COBALT, 1); g.fill(); }
    return c;
  }
  function part(q) {
    switch (q.t) {
      case 'circle': return box('c' + (q.dash ? ' dash' : ''), q.cx - q.r, q.cy - q.r, 2 * q.r, 2 * q.r);
      case 'ellipse': { const el = box('c', q.cx - q.rx, q.cy - q.ry, 2 * q.rx, 2 * q.ry); el.style.transform = `rotate(${q.rot}deg)`; return el; }
      case 'v': return box('ln', q.x, q.y, 1, q.len);
      case 'h': return box('ln', q.x, q.y, q.len, 1);
      case 'ticks': return box('tk', q.x, q.y - 4, q.len, 9);
      case 'ray': { const el = box('ln', q.x1, q.y1, Math.hypot(q.x2 - q.x1, q.y2 - q.y1), 1); el.style.transform = `rotate(${Math.atan2(q.y2 - q.y1, q.x2 - q.x1)}rad)`; return el; }
      case 'node': return box('nd', q.cx - 5, q.cy - 5, 10, 10);
      case 'num': { const el = document.createElement('span'); el.className = 'num'; el.style.cssText = `left:${q.x}px;top:${q.y - 7}px`; el.textContent = String(q.n).padStart(2, '0'); return el; }
      case 'block': return block(q);
    }
    return document.createElement('i');
  }
  function build() {
    const L = measure();                                          // all reads first …
    title = {left: L.title.left, right: L.title.right, top: L.title.top, bottom: L.title.bottom, mid: (L.title.top + L.title.bottom) / 2};
    const list = scaffold(L), frag = document.createDocumentFragment();
    pieces = [];
    track = {docH: L.docH, logs: L.w >= 1100 ? [] : L.logs, orbits: [], stations: [], rays: [], fan: null, arc: null, axis: null, slab: null};
    list.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'pc pc-' + p.kind; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      const els = p.parts.map(part);
      els.forEach(e => el.appendChild(e));
      frag.appendChild(el);
      const b = bounds(p);
      if (!p.fixed) pieces.push({el, i: i + 2, dx: p.dx, dy: p.dy, spin: p.spin, key: ''});
      // What answers the reading line: the orbits turn, the axis inks down to a tracer, stations
      // ink as it passes, the fan opens, a point travels round the great circle on sliding ticks.
      if (p.kind === 'orbit') p.parts.forEach((q, k) => { if (q.t === 'ellipse') track.orbits.push({el: els[k], rot: q.rot, turn: track.orbits.length ? 12 : -16}); });
      if (p.kind === 'axis') {
        const ink = box('ink', -1, 0, 3, L.docH), tr = box('tr', -16, -6, 33, 12);
        el.append(ink, tr);
        track.axis = {ink, tr};
      }
      if (p.kind === 'station') track.stations.push({el, mid: (b[1] + b[3]) / 2, on: null});
      if (p.kind === 'fan') {
        p.parts.forEach((q, k) => { if (q.t === 'ray') track.rays.push({el: els[k], base: Math.atan2(q.y2 - q.y1, q.x2 - q.x1)}); });
        track.fan = {top: b[1], bottom: p.y};
      }
      if (p.kind === 'arc') {
        const k = p.parts.findIndex(q => q.t === 'node'), R0 = -p.parts[k].cx;
        track.arc = {node: els[k], ticks: els[p.parts.findIndex(q => q.t === 'ticks')], R: R0, top: p.y - R0, bottom: p.y + R0};
      }
    });
    // Slab down the left edge, cut by a paper bar at the title rule and at each joint; each cut
    // runs on as a construction line to what it marks. It inks down to the reading line.
    html.classList.toggle('has-slab', L.w >= 1100);
    if (L.w >= 1100) {
      const slab = box('slab', 0, L.bar, CELL, L.docH - L.bar), ink = box('ink', 0, 0, CELL, L.docH - L.bar);
      slab.appendChild(ink);
      track.slab = {ink, top: L.bar};
      for (const y of [L.head.bottom, ...L.joints.map(j => j.y)]) slab.appendChild(box('cut', 0, y - L.bar - 3, CELL, 6));
      frag.appendChild(slab);
      frag.appendChild(box('pc ln', CELL, L.head.bottom, L.head.left - CELL, 1));
      for (const j of L.joints) frag.appendChild(box('pc ln', CELL, j.y, j.x - CELL, 1));
    }
    scaf.textContent = '';                                         // … then writes
    scaf.style.height = L.docH + 'px';
    scaf.classList.toggle('reading', live());
    scaf.appendChild(frag);
    for (const c of cuts) c.key = '';
    for (const l of L.logs) { l.v = ''; l.el.style.removeProperty('--ink'); }
  }
  // Place the title slices and scaffold pieces: the opening's reassembly and the title slice under
  // the pointer stepping aside. Writes only on change.
  function place(now) {
    const ti = introOn ? (t0 < 0 ? 0 : now - t0) : -1, motion = live();
    cuts.forEach((c, i) => {
      const a = ti >= 0 ? assemble(ti, i) : 0;
      const near = hoverSlice < 0 ? Infinity : Math.abs(i - hoverSlice), nudge = motion && near < 2 ? (2 - near) * Math.sign(c.s.amp) * CELL : 0;
      const x = Math.round(a * c.s.amp * CELL) + nudge, key = String(x), off = x !== 0 || i === hoverSlice;
      if (key !== c.key) { c.key = key; c.el.style.transform = x ? `translateX(${x}px)` : ''; }
      if (off !== c.off) { c.off = off; c.el.classList.toggle('off', off); }
    });
    for (const p of pieces) {
      const a = ti >= 0 ? assemble(ti, p.i) : 0;
      const x = Math.round(a * p.dx * CELL), y = Math.round(a * p.dy * CELL), r = Math.round(a * p.spin * 120) / 10, key = x + ',' + y + ',' + r;
      if (key !== p.key) { p.key = key; p.el.style.transform = key === '0,0,0' ? '' : `translate(${x}px,${y}px)` + (r ? ` rotate(${r}deg)` : ''); }
    }
  }
  // The background answers reading (full tier): continuous with the scroll position, written only
  // when a value changes; every moving element is its own layer (CSS will-change).
  let track = null;
  const set = (el, prop, v) => { if (el._v !== v) { el._v = v; el.style[prop] = v; } };
  function read() {
    if (!track || !live()) return;
    const sy = scrollY, y = readLine(sy, h, track.docH), k = clamp(sy / h);
    for (const l of track.logs) {
      const v = inkAt(y, l.top, l.bottom).toFixed(3);
      if (l.v !== v) { l.v = v; l.el.style.setProperty('--ink', v); }
    }
    if (track.slab) set(track.slab.ink, 'transform', `scaleY(${inkAt(y, track.slab.top, track.docH).toFixed(4)})`);
    for (const o of track.orbits) set(o.el, 'transform', `rotate(${(o.rot + o.turn * k).toFixed(2)}deg)`);
    if (track.axis) {
      set(track.axis.ink, 'transform', `scaleY(${clamp(y / track.docH).toFixed(4)})`);
      set(track.axis.tr, 'transform', `translateY(${Math.round(y)}px)`);
      for (const st of track.stations) { const on = y >= st.mid; if (on !== st.on) { st.on = on; st.el.classList.toggle('on', on); } }
    }
    if (track.fan) {
      const q = inkAt(y, track.fan.top, track.fan.bottom);
      for (const r of track.rays) set(r.el, 'transform', `rotate(${fanAngle(r.base, q).toFixed(4)}rad)`);
    }
    if (track.arc) {
      const a = track.arc, th = Math.PI + inkAt(y, a.top, a.bottom) * Math.PI * .75;
      set(a.node, 'transform', `translate(${(a.R * Math.cos(th) + a.R).toFixed(1)}px,${(a.R * Math.sin(th)).toFixed(1)}px)`);
      set(a.ticks, 'backgroundPosition', `0 4px,${-Math.round(sy * .5)}px 0`);
    }
  }

  // --- opening ---------------------------------------------------------------------------------
  let dia = null, plate = null, moshed = null, plateBands = null, veilKey = '';
  // The construction plate for this viewport: two circles on vertical axes with tangent circles on
  // a baseline, a crosshair over a staff, numbered blades fanning down from it, and three fills.
  function diagram() {
    const tall = h > w, R0 = Math.round(Math.min(w * (tall ? .2 : .15), h * .27)), r = Math.round(R0 * .3), cy = Math.round(h * .4);
    const xs = [Math.round(w * .2), Math.round(w * .8)], cx = Math.round(w / 2), sy = Math.round(h * .5), L = Math.min(w * (tall ? .26 : .14), h * .26);
    const blades = [];
    [-14, 6, 26, 46, 66].forEach((deg, j) => [-1, 1].forEach(side => {
      const a = deg * Math.PI / 180, len = L * (1 - j * .1), rx = cx + side * (w * .025 + j * 4), ry = sy + 6 + j * h * .018;
      const ux = side * Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, wd = 7 + j * 1.5;
      const tip = [rx + ux * len, ry + uy * len];
      blades.push({pts: [[rx + nx * wd, ry + ny * wd], [rx - nx * wd * .4, ry - ny * wd * .4], [tip[0] - nx * wd * .5, tip[1] - ny * wd * .5], tip],
        label: [rx + ux * len * .55 + nx * 14, ry + uy * len * .55 + ny * 14], n: 2 * j + (side < 0 ? 1 : 2)});
    }));
    const fw = Math.round(Math.max(40, R0 * .5));
    return {R: R0, r, cy, xs, base: cy + R0 + 2 * r, cx, sy, staff: L * 1.25, headY: Math.round(h * .3), blades, fills: [
      {x: xs[0] - Math.round(R0 * .45), y: cy - Math.round(R0 * .55), w: fw, h: Math.round(R0 * 1.8), side: 'right', from: 'top'},
      {x: Math.round(w * .63), y: 0, w: fw, h: Math.round(Math.min(h * .34, cy - R0 * .4)), side: 'left', from: 'top'},
      {x: xs[1] + Math.round(R0 * .35), y: cy - Math.round(R0 * .2), w: Math.round(fw * .8), h: Math.round(R0 * .8), side: 'right', from: 'bottom'}]};
  }
  function drawPlate(c, s) {
    const g = dia, neg = s.ground === 'neg', cob = s.ground === 'cobalt';
    const ground = neg ? rgba(INK, 1) : cob ? rgba(COBALT, 1) : rgba(PAPER, 1), ink = neg ? WHITE : cob ? PAPER : COBALT;
    c.fillStyle = ground; c.fillRect(0, 0, w, h);
    c.fillStyle = rgba(ink, .55);
    const oy = OFF - (scrollY % NODE);
    for (let y = oy; y < h; y += NODE) for (let x = OFF; x < w; x += NODE) c.fillRect(x - .75, y - .75, 1.5, 1.5);
    c.strokeStyle = rgba(ink, .9); c.lineWidth = 1;
    c.beginPath();
    for (const x of g.xs) { c.moveTo(x + .5, 0); c.lineTo(x + .5, h); }
    c.moveTo(0, g.base + .5); c.lineTo(w, g.base + .5);
    c.moveTo(g.cx - 12, g.headY + .5); c.lineTo(g.cx + 12, g.headY + .5); c.moveTo(g.cx + .5, g.headY - 12); c.lineTo(g.cx + .5, g.headY + 12);
    c.moveTo(g.cx + .5, g.headY + 30); c.lineTo(g.cx + .5, h);
    c.stroke();
    for (const x of g.xs) {
      c.beginPath(); c.arc(x, g.cy, g.R, 0, TAU); c.stroke();
      c.beginPath(); c.arc(x, g.cy + g.R + g.r, g.r, 0, TAU); c.stroke();
      c.beginPath(); c.arc(x, g.cy + g.R, 5, 0, TAU); c.fillStyle = ground; c.fill(); c.stroke();
    }
    c.strokeRect(Math.round(g.cx - g.staff) + .5, g.sy - 4.5, Math.round(g.staff * 2), 8);
    c.font = MONO; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const b of g.blades) {
      c.beginPath(); b.pts.forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      c.fillStyle = ground; c.fill(); c.stroke();
      c.fillStyle = rgba(ink, 1); c.fillText(String(b.n), b.label[0], b.label[1]);
    }
    if (s.grow > 0 && s.ground === 'paper') {
      for (const f of g.fills) {
        const fh = Math.max(1, Math.round(f.h * s.grow)), fy = f.from === 'top' ? f.y : f.y + f.h - fh, pts = serrate(f.w, fh, f.side, 10, 7, false);
        const path = (ox, oy) => { c.beginPath(); pts.forEach(([x, y], j) => j ? c.lineTo(f.x + x + ox, fy + y + oy) : c.moveTo(f.x + x + ox, fy + y + oy)); c.closePath(); };
        for (let e = 3; e >= 1; e--) { path(-5 * e, 7 * e); c.fillStyle = ground; c.fill(); c.strokeStyle = rgba(COBALT, .8 - e * .15); c.stroke(); }
        path(0, 0); c.fillStyle = rgba(COBALT, 1); c.fill();
      }
    }
    if (s.bar) { c.fillStyle = rgba(COBALT, 1); c.fillRect(Math.round(w * .955), 0, Math.ceil(w * .045), h); }
  }
  const offscreen = () => { const c = document.createElement('canvas'); c.width = veilEl.width; c.height = veilEl.height; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
  // Streak each band of `src` into `g` (device px) at mosh m: the column at the streak's inner
  // edge is stretched across it, unsmoothed, so every streak and every gap is level; then a light
  // cobalt cast.
  function mosh(g, src, m) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0);
    for (const b of plateBands) {
      const s = moshAt(m, b, w), sy = Math.round(b.y * dpr), sh = Math.max(1, Math.round(b.h * dpr));
      if (s.len > 0) g.drawImage(src, Math.round(s.src * dpr), sy, 1, sh, Math.round(s.x * dpr), sy, Math.round(s.len * dpr), sh);
    }
    g.imageSmoothingEnabled = true;
    g.fillStyle = rgba(COBALT, .22 * m); g.fillRect(0, 0, src.width, src.height);
  }
  function drawVeil(t) {
    const s = intro(t);
    if (!s.tearing) {
      const key = s.ground + s.bar + s.grow + ':' + s.mosh;
      if (key === veilKey) return;
      veilKey = key;
      if (s.mosh === 0) { vtx.setTransform(dpr, 0, 0, dpr, 0, 0); drawPlate(vtx, s); return; }
      if (!plate) { let g; [plate, g] = offscreen(); drawPlate(g, {ground: 'paper', bar: false, grow: 1}); }
      mosh(vtx, plate, s.mosh);
      return;
    }
    if (!moshed) {   // freeze the fully moshed plate once, then tear it away in bands
      if (!plate) { let g; [plate, g] = offscreen(); drawPlate(g, {ground: 'paper', bar: false, grow: 1}); }
      let g; [moshed, g] = offscreen(); mosh(g, plate, 1);
    }
    vtx.setTransform(1, 0, 0, 1, 0, 0); vtx.clearRect(0, 0, veilEl.width, veilEl.height);
    for (const b of plateBands) {
      const k = tearAt(t, b);
      if (k >= 1) continue;
      const sy = Math.round(b.y * dpr), sh = Math.round(b.h * dpr);
      vtx.drawImage(moshed, 0, sy, moshed.width, sh, Math.round(b.dir * k * w * 1.1 * dpr), sy, moshed.width, sh);
    }
  }
  function endIntro() {
    introOn = false; html.classList.remove('is-intro');
    veilEl.hidden = true; veilEl.width = veilEl.height = 0; plate = moshed = null;
    dirty.place = true;
  }

  // --- field: compass, shards, streaks ----------------------------------------------------------
  function fit(c, x) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawCompass(now) {
    const ring = ringAt(ringState, now, reduce.matches);
    ringState = ring.state;
    if (!pointer.on || selected || isNaN(compass.nx)) return;
    const x = compass.nx, y = compass.ny - scrollY;
    ctx.fillStyle = rgba(COBALT, .16);
    ctx.fillRect(0, Math.round(y), w, 1); ctx.fillRect(Math.round(x), 0, 1, h);   // construction lines
    // Ring (2px): what remains counter-clockwise from the gap's far end round to +x.
    ctx.strokeStyle = rgba(COBALT, .9); ctx.lineWidth = 2; ctx.lineCap = 'butt';
    if (ring.to > ring.from) { ctx.beginPath(); ctx.arc(x, y, R, -ring.from, -ring.to, true); ctx.stroke(); }
    ctx.lineWidth = 1;
    ctx.beginPath();                                                                  // crosshair ticks
    ctx.moveTo(x - 14, y + .5); ctx.lineTo(x - 5, y + .5); ctx.moveTo(x + 5, y + .5); ctx.lineTo(x + 14, y + .5);
    ctx.moveTo(x + .5, y - 14); ctx.lineTo(x + .5, y - 5); ctx.moveTo(x + .5, y + 5); ctx.lineTo(x + .5, y + 14);
    ctx.stroke();
    // Dotted arc at 2R: from +x counter-clockwise to the gap's far end, closed by a radial tick.
    ctx.fillStyle = rgba(COBALT, .7);
    for (let a = 0; a <= ring.dotted + 1e-6; a += .2) ctx.fillRect(x + Math.cos(-a) * R * 2 - .75, y + Math.sin(-a) * R * 2 - .75, 1.5, 1.5);
    ctx.strokeStyle = rgba(COBALT, .8);
    for (const a of ring.dotted > 0 ? [0, ring.dotted] : [0]) {
      ctx.beginPath(); ctx.moveTo(x + Math.cos(-a) * (R * 2 - 4), y + Math.sin(-a) * (R * 2 - 4)); ctx.lineTo(x + Math.cos(-a) * (R * 2 + 4), y + Math.sin(-a) * (R * 2 + 4)); ctx.stroke();
    }
    ctx.fillStyle = rgba(ORANGE, 1); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    // Coordinates of the node, boxed on paper so they stay legible over anything.
    const label = String((compass.nx - OFF) / NODE).padStart(2, '0') + ' · ' + String((compass.ny - OFF) / NODE).padStart(2, '0');
    ctx.font = MONO; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tw = ctx.measureText(label).width, bx = Math.round(x + R * .72 + 6), by = Math.round(y + R * .72 + 6);
    ctx.fillStyle = rgba(PAPER, .94); ctx.fillRect(bx, by - 11, tw + 10, 22);
    ctx.fillStyle = rgba(COBALT, 1); ctx.fillText(label, bx + 5, by + 1);
  }
  // Shards of a broken sector, where it broke: solid cobalt for a beat, then outlines drifting
  // outward and fading.
  function drawShatters(now) {
    shatters = shatters.filter(s => now - s.t0 < SHARD_MS);
    for (const s of shatters) {
      const t = now - s.t0, k = clamp((t - SHARD_SOLID) / (SHARD_MS - SHARD_SOLID)), solid = t < SHARD_SOLID;
      ctx.globalAlpha = 1 - k * k; ctx.lineWidth = 1; ctx.strokeStyle = rgba(COBALT, 1);
      ctx.fillStyle = solid ? rgba(COBALT, 1) : rgba(PAPER, 1);
      for (const sh of SHARDS[s.i]) {
        const r = sh.r + sh.drift * out(k), cx = s.x + Math.cos(-sh.a) * r, cy = s.y - scrollY + Math.sin(-sh.a) * r;
        ctx.beginPath();
        sh.pts.forEach(([px, py], j) => j ? ctx.lineTo(cx + px, cy + py) : ctx.moveTo(cx + px, cy + py));
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    if (introOn) return;
    drawCompass(now); drawShatters(now);
  }

  // --- one scheduler ----------------------------------------------------------------------------
  function frame(now) {
    raf = 0;
    if (dirty.build) { dirty.build = false; build(); dirty.place = dirty.read = true; }
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const t = now - t0;
      if (intro(t).done) endIntro();
      else if (t < TEAR_END) drawVeil(t);
      else vtx.clearRect(0, 0, veilEl.width, veilEl.height);
      dirty.place = true;
    }
    if (dirty.place) { dirty.place = false; place(now); }
    if (dirty.read) { dirty.read = false; read(); }
    const busy = shatters.length || ringState.broken >= 6;
    if (dirty.field || busy) { dirty.field = false; draw(now); }
    if (introOn || busy) raf = requestAnimationFrame(frame);
  }
  function request(...keys) {
    for (const k of keys) dirty[k] = true;
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function compassTo() { compass.nx = node(pointer.x); compass.ny = node(pointer.y + scrollY); }
  // Which title slice the pointer is over (page coordinates), or -1.
  function sliceAt(x, y) {
    if (x < title.left || x > title.right || y < title.top || y > title.bottom) return -1;
    const p = (y - title.top) / (title.bottom - title.top) * 100;
    return Math.max(0, SL.findIndex(s => p < s.b));
  }
  function hover() {
    const k = pointer.on ? sliceAt(pointer.x, pointer.y + scrollY) : -1;
    if (k !== hoverSlice) { hoverSlice = k; dirty.place = true; }
  }
  function select(li) { if (selected !== li) { selected = li; request('field'); } }
  function deselect(li) { if (selected === li) { selected = null; request('field'); } }
  // A click on open paper (where the compass shows) breaks the ring's next sector.
  function breakRing() {
    if (introOn || !pointer.on || selected || ringState.broken >= 6) return;
    const now = performance.now(), i = ringState.broken;
    ringState = strike(ringState, now);
    if (live()) {
      if (shatters.length > 6) shatters.shift();
      shatters.push({i, x: compass.nx, y: compass.ny, t0: now});
    }
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    compassTo(); hover(); request('field');
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    compassTo(); hover(); breakRing(); request('field');
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; hover(); request('field'); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; hover(); request('field'); });

  addEventListener('scroll', () => {
    if (pointer.on) { compassTo(); hover(); }
    request('field', 'place', 'read');
  }, {passive: true});

  // Entry selection: hover and keyboard focus share one response (the flood itself is CSS).
  document.querySelectorAll('.log li').forEach(li => {
    li.addEventListener('pointerenter', () => select(li));
    li.addEventListener('pointerleave', () => { if (!li.matches(':focus-visible, :has(:focus-visible)')) deselect(li); });
    li.addEventListener('focusin', () => { if (li.matches(':focus-visible') || li.querySelector(':focus-visible')) select(li); });
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget)) deselect(li); });
  });

  function resize() {
    w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    fit(field, ctx);
    if (introOn) { fit(veilEl, vtx); dia = diagram(); plate = moshed = null; plateBands = bands(h); veilKey = ''; }
    request('build', 'field');
  }
  addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => request('build'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request('field'); });
  reduce.addEventListener?.('change', () => {
    shatters = [];
    if (introOn) endIntro();
    request('build', 'field', 'place');
  });
  resize();
  return api;
});
