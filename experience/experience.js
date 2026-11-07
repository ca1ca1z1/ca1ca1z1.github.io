/* Experience page motion, after an event PV's blueprint sequences.
   - opening (≤1.5 s): on the paper veil a construction circle and crosshair draw; the plate inverts
     to cobalt for one beat; then the veil tears away in horizontal bands (datamosh), each band
     trailing a cobalt smear
   - pointer: a drafting compass snaps to the nearest dot-grid node — construction lines through it,
     a circle drawing round it, a dotted arc, an orange centre, the node's coordinates
   - entry selection (hover or keyboard focus): the plate floods cobalt (CSS) while echo copies of
     its frame collapse onto it (canvas)
   - click / tap / keyboard focus: a halo ring prints solid cobalt, then breaks into shards
   - scroll: horizontal smear bands, length set by scroll speed
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, echo, halo or
   smear; the compass remains, placed instantly, and the plate fill is instant (CSS).
   The dot grid itself is CSS in page coordinates, so it scrolls natively. No dependencies;
   the loop sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExperienceScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, NODE = 62, OFF = 31, INTRO_MS = 1500;
  const DRAW_MS = 360, INVERT_MS = 440, TEAR_MS = 1100, ECHO_MS = 320, HALO_MS = 720, SMEAR_MS = 260;
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
  // Halo shards: n fragments shed from the left of the ring, with drift and spin.
  function shards(n = 22, seed = 13) {
    const r = rng(seed);
    return Array.from({length: n}, () => ({
      a: Math.PI * (.55 + r() * .7), dx: -(20 + r() * 70), dy: (r() - .3) * 40, size: 3 + r() * 7, spin: (r() - .5) * 4
    }));
  }
  // Smear length (px) for a scroll speed (px/ms).
  const smear = v => Math.round(Math.max(40, Math.min(600, Math.abs(v) * 160)));
  const api = {CELL, NODE, OFF, INTRO_MS, TEAR_MS, node, rng, bands, intro, tearAt, echo, shards, smear};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), veilEl = document.querySelector('.veil');
  const ctx = field && field.getContext('2d'), vtx = veilEl && veilEl.getContext('2d');
  if (!ctx || !vtx) { html.classList.remove('is-intro'); return api; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const MONO = '14px ui-monospace, Consolas, "Courier New", monospace';
  const SHARDS = shards();

  let w = 0, h = 0, dpr = 1, raf = 0;
  let introOn = html.classList.contains('is-intro') && !reduce.matches, t0 = -1, plate = null, plateBands = null;
  const pointer = {x: 0, y: 0, on: false};
  // Compass: page-coordinate node, draw progress of its circle (restarts on node change).
  const compass = {nx: NaN, ny: NaN, p: 1, t: 0};
  let selected = null, echoT = -1, halos = [], smears = [], lastScroll = {y: scrollY, t: performance.now()};
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
    if (!pointer.on || selected || isNaN(compass.nx)) return;
    const x = compass.nx, y = compass.ny - scrollY, R = NODE, p = compass.p;
    ctx.fillStyle = rgba(COBALT, .16);
    ctx.fillRect(0, Math.round(y), w, 1); ctx.fillRect(Math.round(x), 0, 1, h);   // construction lines
    ctx.strokeStyle = rgba(COBALT, .85); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    ctx.beginPath();                                                                  // crosshair ticks
    ctx.moveTo(x - 14, y + .5); ctx.lineTo(x - 5, y + .5); ctx.moveTo(x + 5, y + .5); ctx.lineTo(x + 14, y + .5);
    ctx.moveTo(x + .5, y - 14); ctx.lineTo(x + .5, y - 5); ctx.moveTo(x + .5, y + 5); ctx.lineTo(x + .5, y + 14);
    ctx.stroke();
    ctx.fillStyle = rgba(COBALT, .7);                                                 // dotted guide arc
    for (let a = -1.9; a < -1.9 + 1.7 * p; a += .07) ctx.fillRect(x + Math.cos(a) * R * 2, y + Math.sin(a) * R * 2, 1.5, 1.5);
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
    for (let k = 1; k <= 4; k++) {
      const d = echo(t, k);
      ctx.strokeStyle = rgba(COBALT, .5 * (1 - k / 5) * (1 - t / ECHO_MS));
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(b.left + d) + .5, Math.round(b.top + d) + .5, Math.round(b.width), Math.round(b.height));
    }
  }
  function drawHalos(now) {
    halos = halos.filter(o => now - o.t0 < HALO_MS);
    for (const o of halos) {
      const t = now - o.t0, x = o.x, y = o.y - scrollY, rx = 93, ry = 24;
      if (t < 90) {   // the inverted beat: a solid cobalt ring
        ctx.strokeStyle = rgba(COBALT, o.k); ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      const k = (t - 90) / (HALO_MS - 90), f = 1 - k;
      ctx.strokeStyle = rgba(COBALT, .8 * f * o.k); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, -Math.PI * .45, Math.PI * .45 + Math.PI * (1 - out(k)) * .9); ctx.stroke();
      ctx.fillStyle = rgba(COBALT, .75 * f * o.k);
      for (const s of SHARDS) {
        const e = out(k), sx = x + Math.cos(s.a) * rx + s.dx * e, sy = y + Math.sin(s.a) * ry + s.dy * e;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(s.spin * e);
        ctx.fillRect(-s.size / 2, -s.size / 3, s.size, s.size * .66); ctx.restore();
      }
    }
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
    drawSmears(now); drawHalos(now); drawEcho(now); drawCompass(now);
  }

  function frame(now) {
    raf = 0;
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const t = now - t0;
      if (intro(t).done) endIntro(); else if (t < TEAR_MS) drawVeil(t); else vtx.clearRect(0, 0, veilEl.width, veilEl.height);
    }
    if (compass.p < 1) compass.p = reduce.matches ? 1 : out((now - compass.t) / 280);
    draw(now);
    if (introOn || compass.p < 1 || echoT >= 0 || halos.length || smears.length) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const live = () => !reduce.matches;

  function compassTo() {
    const nx = node(pointer.x), ny = node(pointer.y + scrollY);
    if (nx !== compass.nx || ny !== compass.ny) {
      compass.nx = nx; compass.ny = ny;
      compass.p = live() ? 0 : 1; compass.t = performance.now();
    }
  }
  function select(li) {
    if (selected === li) return;
    selected = li; echoT = live() ? performance.now() : -1; wake();
  }
  function deselect(li) { if (selected === li) { selected = null; echoT = -1; draw(performance.now()); } }
  function halo(x, y, k) {
    if (!live()) return;
    if (halos.length > 6) halos.shift();
    halos.push({x: node(x), y: node(y + scrollY), t0: performance.now(), k}); wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    compassTo(); draw(performance.now()); wake();
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    compassTo(); halo(e.clientX, e.clientY, 1); draw(performance.now()); wake();
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
  // Keyboard parity for the halo: focusing anything prints a small one at its centre.
  document.addEventListener('focusin', e => {
    if (!e.target.matches?.(':focus-visible')) return;
    const b = e.target.getBoundingClientRect();
    halo(b.left + Math.min(b.width / 2, 120), b.top + Math.min(b.height / 2, 40), .6);
  });

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && introOn) wake(); });
  reduce.addEventListener?.('change', () => {
    halos = []; smears = []; echoT = -1; compass.p = 1;
    if (introOn) endIntro();
    draw(performance.now());
  });
  resize();
  if (introOn) wake();
  return api;
});
