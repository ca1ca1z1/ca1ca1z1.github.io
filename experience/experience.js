/* Experience page motion, after an event PV's blueprint sequences.
   - opening (≤1.5 s): on the paper veil a construction circle and crosshair draw; the plate inverts
     to cobalt for one beat; then the veil tears away in horizontal bands (datamosh), each band
     trailing a cobalt smear
   - pointer: a drafting compass placed whole on the nearest dot-grid node — construction lines
     through it, a 2px ring, an orange centre, the node's coordinates, and a dotted arc that runs
     counter-clockwise from +x to the far end of the ring's gap
   - click / tap on open paper: the ring's next sixth breaks off into shards (counter-clockwise from
     +x); after the sixth click, a 0.1 s pause, then the ring regrows in one turn (see strike/ringAt)
   - entry selection (hover or keyboard focus): the plate floods cobalt (CSS) while echo copies of
     its frame collapse onto it (canvas; dashed for draft plates)
   - scroll: horizontal smear bands, length set by scroll speed
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, echo, shards,
   regrowth turn or smear; the compass remains, its ring loses sectors and returns instantly, and
   the plate fill is instant (CSS).
   The dot grid itself is CSS in page coordinates, so it scrolls natively. No dependencies;
   the loop sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExperienceScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, NODE = 62, OFF = 31, INTRO_MS = 1500;
  const DRAW_MS = 360, INVERT_MS = 440, TEAR_MS = 1100, ECHO_MS = 320, SMEAR_MS = 260;
  const COBALT = '29,68,200', PAPER = '205,212,212', ORANGE = '255,90,31';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);
  const inOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  // Nearest dot-grid node to a page coordinate (dots at OFF + NODE·k, as drawn by the CSS).
  const node = v => OFF + NODE * Math.round((v - OFF) / NODE);
  // Small deterministic generator, so the opening and shards look the same on every visit.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }
  // Horizontal bands that exactly cover height h: y, height, direction (±1), start delay (ms).
  function bands(h, n = 16, seed = 6) {
    const r = rng(seed), weights = Array.from({length: n}, () => .35 + r());
    const sum = weights.reduce((a, b) => a + b, 0), out = [];
    let y = 0;
    weights.forEach((wt, i) => {
      const bh = i === n - 1 ? h - y : Math.round(h * wt / sum);
      out.push({y, h: bh, dir: r() < .5 ? -1 : 1, delay: Math.round(r() * 260)});
      y += bh;
    });
    return out;
  }
  // Opening state at t ms: circle draw 0..1, inverted beat, tear progress of band b (0..1), done.
  function intro(t) {
    return {
      circle: out(t / DRAW_MS),
      invert: t >= DRAW_MS && t < INVERT_MS,
      tearing: t >= INVERT_MS,
      done: t >= INTRO_MS
    };
  }
  const tearAt = (t, band) => inOut((t - INVERT_MS - band.delay) / (TEAR_MS - INVERT_MS - 260));
  // Echo offset of copy k (1..n) at t ms after selection: starts at 7k px, collapses to 0.
  const echo = (t, k) => 7 * k * (1 - out(t / ECHO_MS));
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
  // Smear length (px) for a scroll speed (px/ms).
  const smear = v => Math.round(Math.max(40, Math.min(600, Math.abs(v) * 160)));
  const api = {CELL, NODE, OFF, INTRO_MS, TEAR_MS, TAU, SECTOR, REGEN_WAIT, REGEN_MS, SHARD_MS,
    node, rng, bands, intro, tearAt, echo, fresh, strike, ringAt, sectorShards, smear};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), veilEl = document.querySelector('.veil');
  const ctx = field && field.getContext('2d'), vtx = veilEl && veilEl.getContext('2d');
  if (!ctx || !vtx) { html.classList.remove('is-intro'); return api; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const MONO = '14px ui-monospace, Consolas, "Courier New", monospace';
  const R = NODE / 2;   // compass ring radius; the dotted arc runs at 2R
  const SHARDS = Array.from({length: 6}, (_, i) => sectorShards(i, R));

  let w = 0, h = 0, dpr = 1, raf = 0;
  let introOn = html.classList.contains('is-intro') && !reduce.matches, t0 = -1, plate = null, plateBands = null;
  const pointer = {x: 0, y: 0, on: false};
  // Compass: the page-coordinate grid node it sits on (placed whole), and its ring's break state.
  const compass = {nx: NaN, ny: NaN};
  let ringState = fresh(), shatters = [];
  let selected = null, echoT = -1, smears = [], lastScroll = {y: scrollY, t: performance.now()};
  if (!introOn) { html.classList.remove('is-intro'); veilEl.hidden = true; }

  function fit(c, x) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resize() {
    w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    fit(field, ctx);
    if (introOn) { fit(veilEl, vtx); plate = null; plateBands = bands(h); }
    draw(performance.now());
  }

  // --- opening -------------------------------------------------------------------------------
  // The drawing on the veil: construction circle, crosshair, a small node, dotted guide arc.
  function drawPlate(c, p, ink, ground) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .26;
    c.fillStyle = ground; c.fillRect(0, 0, w, h);
    c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1;
    const L = out(p * 1.2);
    c.beginPath();
    c.moveTo(cx - w * .5 * L, cy); c.lineTo(cx + w * .5 * L, cy);
    c.moveTo(cx, cy - h * .5 * L); c.lineTo(cx, cy + h * .5 * L);
    c.stroke();
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
    c.beginPath(); c.arc(cx, cy + R, R * .22, 0, Math.PI * 2 * p); c.stroke();
    for (let a = 0; a < p * 1.4; a += .045) c.fillRect(cx + Math.cos(a - 2.6) * R * 1.45, cy + Math.sin(a - 2.6) * R * 1.45, 1.5, 1.5);
    c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fill();
  }
  function drawVeil(t) {
    const s = intro(t);
    if (!s.tearing) {
      vtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (s.invert) drawPlate(vtx, 1, rgba(PAPER, 1), rgba(COBALT, 1));
      else drawPlate(vtx, s.circle, rgba(COBALT, .85), rgba(PAPER, 1));
      return;
    }
    if (!plate) {   // freeze the finished drawing once, then tear it in bands
      plate = document.createElement('canvas'); plate.width = veilEl.width; plate.height = veilEl.height;
      const pc = plate.getContext('2d'); pc.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPlate(pc, 1, rgba(COBALT, .85), rgba(PAPER, 1));
    }
    vtx.setTransform(1, 0, 0, 1, 0, 0); vtx.clearRect(0, 0, veilEl.width, veilEl.height);
    for (const b of plateBands) {
      const k = tearAt(t, b), dx = b.dir * k * w * 1.1;
      if (k >= 1) continue;
      const sy = Math.round(b.y * dpr), sh = Math.round(b.h * dpr);
      vtx.drawImage(plate, 0, sy, plate.width, sh, Math.round(dx * dpr), sy, plate.width, sh);
      if (k > 0) {   // datamosh trail: a cobalt smear behind the moving band
        const edge = b.dir > 0 ? dx : w + dx, len = Math.min(w * .5, Math.abs(dx) * .6);
        vtx.fillStyle = rgba(COBALT, .55 * (1 - k));
        vtx.fillRect(Math.round((b.dir > 0 ? edge - len : edge) * dpr), sy + Math.round(sh * .35), Math.round(len * dpr), Math.max(1, Math.round(sh * .3)));
      }
    }
  }
  function endIntro() {
    introOn = false; html.classList.remove('is-intro');
    veilEl.hidden = true; veilEl.width = veilEl.height = 0; plate = null;
  }

  // --- field ---------------------------------------------------------------------------------
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
    ctx.font = MONO; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width, bx = Math.round(x + R * .72 + 6), by = Math.round(y + R * .72 + 6);
    ctx.fillStyle = rgba(PAPER, .94); ctx.fillRect(bx, by - 11, tw + 10, 22);
    ctx.fillStyle = rgba(COBALT, 1); ctx.fillText(label, bx + 5, by + 1);
  }
  function drawEcho(now) {
    if (!selected || echoT < 0) return;
    const t = now - echoT;
    if (t > ECHO_MS) { echoT = -1; return; }
    const b = selected.getBoundingClientRect();
    if (selected.closest('.draft')) ctx.setLineDash([4, 4]);   // draft plates echo in construction dashes
    for (let k = 1; k <= 4; k++) {
      const d = echo(t, k);
      ctx.strokeStyle = rgba(COBALT, .5 * (1 - k / 5) * (1 - t / ECHO_MS));
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(b.left + d) + .5, Math.round(b.top + d) + .5, Math.round(b.width), Math.round(b.height));
    }
    ctx.setLineDash([]);
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
  function drawSmears(now) {
    smears = smears.filter(s => now - s.t0 < SMEAR_MS);
    for (const s of smears) {
      const k = (now - s.t0) / SMEAR_MS;
      ctx.fillStyle = rgba(COBALT, .22 * (1 - k));
      ctx.fillRect(Math.round(s.x + s.dir * s.len * out(k) * .4), Math.round(s.y), s.len, s.h);
    }
  }
  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    if (introOn) return;
    drawSmears(now); drawEcho(now); drawCompass(now); drawShatters(now);
  }

  function frame(now) {
    raf = 0;
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const t = now - t0;
      if (intro(t).done) endIntro(); else if (t < TEAR_MS) drawVeil(t); else vtx.clearRect(0, 0, veilEl.width, veilEl.height);
    }
    draw(now);
    if (introOn || echoT >= 0 || shatters.length || smears.length || ringState.broken >= 6) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const live = () => !reduce.matches;

  function compassTo() {
    compass.nx = node(pointer.x); compass.ny = node(pointer.y + scrollY);
  }
  function select(li) {
    if (selected === li) return;
    selected = li; echoT = live() ? performance.now() : -1; wake();
  }
  function deselect(li) { if (selected === li) { selected = null; echoT = -1; draw(performance.now()); } }
  // A click on open paper (where the compass shows) breaks the ring's next sector.
  function breakRing() {
    if (introOn || !pointer.on || selected || ringState.broken >= 6) return;
    const now = performance.now(), i = ringState.broken;
    ringState = strike(ringState, now);
    if (live()) {
      if (shatters.length > 6) shatters.shift();
      shatters.push({i, x: compass.nx, y: compass.ny, t0: now});
    }
    draw(now); wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    compassTo(); draw(performance.now()); wake();
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    compassTo(); breakRing(); draw(performance.now());
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; draw(performance.now()); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; draw(performance.now()); });

  addEventListener('scroll', () => {
    const now = performance.now(), v = (scrollY - lastScroll.y) / Math.max(1, now - lastScroll.t);
    lastScroll = {y: scrollY, t: now};
    if (live() && Math.abs(v) > .15 && smears.length < 30) {
      for (let i = 0; i < 3; i++) smears.push({x: Math.random() * w * .8, y: Math.random() * h, h: 1 + Math.round(Math.random() * 5),
        len: smear(v) * (.5 + Math.random() * .5), dir: Math.sign(v) || 1, t0: now});
    }
    if (pointer.on) compassTo();
    draw(now); wake();   // redrawn in the scroll event itself, so the compass keeps to its node
  }, {passive: true});

  // Entry selection: hover and keyboard focus share one response.
  document.querySelectorAll('.log li').forEach(li => {
    li.addEventListener('pointerenter', () => select(li));
    li.addEventListener('pointerleave', () => { if (!li.matches(':focus-within')) deselect(li); });
    li.addEventListener('focusin', () => { if (li.matches(':focus-visible') || li.querySelector(':focus-visible')) select(li); });
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget)) deselect(li); });
  });

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && introOn) wake(); });
  reduce.addEventListener?.('change', () => {
    shatters = []; smears = []; echoT = -1;
    if (introOn) endIntro();
    draw(performance.now());
  });
  resize();
  if (introOn) wake();
  return api;
});
