/* Record page motion, after an event PV's operator-file sequence.
   - opening (≤1.6 s): a black frame parts from its horizontal centreline in whole-cell steps while an
     acid line draws outward along it; the altitude ruler then extends down cell by cell
   - background: three trajectory arcs; scrolling swings them around an off-screen pivot (ascent)
   - altitude ruler on the left, ticked every 31px cell of page height (one cell = 10 m, 0000 at the
     bottom band, the "ground")
   - pointer: an altimeter mark — crosshair on the pointer's cell, a guide back to the ruler, the
     reading boxed on the ruler — jumping whole cells
   - entry selection (hover or keyboard focus): an orange bracket spans the entry on the ruler, with
     its altitude; the slab itself is CSS
   - click / tap / keyboard focus: diamonds (Manhattan rings) step outward cell by cell
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, no arc swing, no
   diamonds; the altimeter mark and the bracket remain and are placed instantly.
   Pure canvas, no dependencies. Sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecordScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, METRES = 10, INTRO_MS = 1600, RINGS = 6, RING_STEP = 45, RING_LIFE = 420;
  const INK = '16,16,16', ACID = '200,214,58', ORANGE = '255,90,31', PAPER = '229,228,215';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);

  // Top edge of the page cell that contains document y.
  const snap = y => Math.floor(y / CELL) * CELL;
  // Altitude reading at document y on a page of height pageH: whole cells above the bottom, 10 m each.
  function altitude(y, pageH) {
    return String(Math.max(0, Math.floor((pageH - y) / CELL)) * METRES).padStart(4, '0');
  }
  // Manhattan ring of radius R cells around (x, y): a diamond, vertices top, right, bottom, left.
  const diamond = (x, y, R) => [[x, y - R * CELL], [x + R * CELL, y], [x, y + R * CELL], [x - R * CELL, y]];
  // Opening state at t ms in a viewport of height h.
  //   line: centreline length 0..1 · lineAlpha · panel: each black half's height, whole cells
  //   ruler: ruler reveal 0..1 · done
  function veil(t, h) {
    const half = Math.ceil(h / 2 / CELL) * CELL;
    return {
      line: out(t / 320),
      lineAlpha: 1 - clamp((t - 760) / 260),
      panel: Math.min(half, Math.ceil(half * (1 - out((t - 280) / 620)) / CELL) * CELL),
      ruler: clamp((t - 700) / 600),
      done: t >= INTRO_MS
    };
  }
  // Arc swing (radians) for a scroll offset.
  const sweep = scrollY => scrollY * .00035;
  // Eased approach that settles exactly.
  function approach(value, goal, rate, epsilon = .3) {
    return Math.abs(goal - value) < epsilon ? goal : value + (goal - value) * rate;
  }
  const api = {CELL, METRES, INTRO_MS, snap, altitude, diamond, veil, sweep, approach};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const scene = document.querySelector('.scene'), veilEl = document.querySelector('.veil');
  const ctx = scene && scene.getContext('2d'), vtx = veilEl && veilEl.getContext('2d');
  if (!ctx || !vtx) { html.classList.remove('is-intro'); return api; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  let w = 0, h = 0, rail = 88, pageH = 0, raf = 0;
  let introOn = html.classList.contains('is-intro') && !reduce.matches, t0 = -1;
  let angle = 0, goal = 0, rings = [];
  const pointer = {x: 0, y: 0, on: false};
  // Altimeter mark: eased viewport centre (x, y) of the pointer's cell; a = visibility.
  const mark = {x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0, placed: false};
  // Bracket for the selected entry: eased top/bottom (viewport), visibility.
  const lock = {t: 0, b: 0, tt: 0, tb: 0, a: 0, ta: 0, el: null};
  if (!introOn) html.classList.remove('is-intro');

  function size(c, x) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resize() {
    w = innerWidth; h = innerHeight;
    rail = parseFloat(getComputedStyle(html).getPropertyValue('--rail')) || 88;
    pageH = document.documentElement.scrollHeight;
    size(scene, ctx); size(veilEl, vtx);
    if (lock.el) lockTo(lock.el, true);
    if (mark.placed) markTo(pointer.x, pointer.y, true);
    draw(performance.now());
  }

  // Trajectory arcs: circles whose centres orbit a pivot below the viewport; the scroll swing moves
  // them across the page. Ink hairlines and one acid line with travelling ticks.
  function arcs(a, reveal) {
    // Base circle: centre beyond the lower right, passing the lower-left corner region and the top
    // edge near the middle — the rising sweep of the PV's trajectory lines.
    const px = w * 1.3, py = h * 1.2, r0 = Math.hypot(w * 1.15, h * .2), off = Math.min(w, h) * .3;
    const lines = [
      {r: r0, rgb: INK, al: .18, lw: 1.5},
      {r: r0 + 26, rgb: ACID, al: .95, lw: 3, ticks: true},
      {r: r0 + h * .38, rgb: INK, al: .1, lw: 1}
    ];
    const th = a - 1.2, cx = px + off * Math.cos(th), cy = py + off * Math.sin(th);
    for (const l of lines) {
      ctx.strokeStyle = rgba(l.rgb, l.al * reveal); ctx.lineWidth = l.lw;
      ctx.beginPath(); ctx.arc(cx, cy, l.r, Math.PI * .9, Math.PI * 1.7); ctx.stroke();
      if (!l.ticks) continue;
      ctx.strokeStyle = rgba(INK, .22 * reveal); ctx.lineWidth = 1;
      ctx.beginPath();
      const step = 14 / l.r;
      for (let k = 0; k < 90; k++) {
        const p = Math.PI * .95 + k * step + ((a * 3) % step);
        const c = Math.cos(p), sn = Math.sin(p);
        ctx.moveTo(cx + c * (l.r - 4), cy + sn * (l.r - 4)); ctx.lineTo(cx + c * (l.r + 6), cy + sn * (l.r + 6));
      }
      ctx.stroke();
    }
  }

  // Boxed reading, PV style: black box, paper type.
  function reading(text, x, y, align) {
    ctx.font = `700 14px ${SANS}`; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width, bx = align === 'right' ? x - tw - 10 : x;
    ctx.fillStyle = rgba(INK, 1); ctx.fillRect(Math.round(bx), Math.round(y - 11), Math.ceil(tw + 10), 22);
    ctx.fillStyle = rgba(PAPER, 1); ctx.textAlign = 'left'; ctx.fillText(text, Math.round(bx + 5), Math.round(y) + 1);
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY, rx = rail - 12, wide = rail >= 64;
    const reveal = introOn ? (t0 < 0 ? 0 : veil(now - t0, h).ruler) : 1;
    if (reveal <= 0) return;
    arcs(reduce.matches ? 0 : angle, reveal);

    // Ruler: doc-anchored ticks; the opening extends it downward a cell at a time.
    const bottom = Math.min(h, snap(h * reveal + CELL));
    ctx.fillStyle = rgba(INK, .8); ctx.fillRect(rx, 0, 1, bottom);
    ctx.font = `700 14px ${SANS}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = Math.floor(sy / CELL); ; i++) {
      const y = Math.round(i * CELL - sy);
      if (y > bottom) break;
      const major = i % 5 === 0;
      ctx.fillStyle = rgba(INK, major ? .8 : .45);
      ctx.fillRect(rx - (major ? 12 : 6), y, major ? 12 : 6, 1);
      if (major && wide) { ctx.fillStyle = rgba(INK, .62); ctx.fillText(altitude(i * CELL, pageH), rx - 18, y); }
    }

    // Altimeter mark.
    const ma = mark.a * reveal;
    if (ma > .01) {
      const x = Math.round(mark.x), y = Math.round(mark.y), g = 9;
      ctx.fillStyle = rgba(INK, .28 * ma);
      for (let gx = rx + 4; gx < x - CELL; gx += 6) ctx.fillRect(gx, y, 3, 1);   // dashed guide
      ctx.fillStyle = rgba(ORANGE, ma);
      ctx.fillRect(rx - 14, y - 1, 28, 2);                                        // ruler tick
      ctx.fillRect(x - g - 7, y, 7, 1); ctx.fillRect(x + g + 1, y, 7, 1);         // crosshair
      ctx.fillRect(x, y - g - 7, 1, 7); ctx.fillRect(x, y + g + 1, 1, 7);
      ctx.globalAlpha = ma;
      const text = altitude(y + sy, pageH);
      if (wide) reading(text, rx - 16, y, 'right'); else reading(text, x + g + 12, y + 18, 'left');
      ctx.globalAlpha = 1;
    }

    // Selection bracket on the ruler.
    const la = lock.a * reveal;
    if (la > .01) {
      const t = Math.round(lock.t), b = Math.round(lock.b), x = rx + 8;
      ctx.fillStyle = rgba(ORANGE, la);
      ctx.fillRect(x, t, 2, b - t); ctx.fillRect(x, t, 10, 2); ctx.fillRect(x, b - 2, 10, 2);
      ctx.globalAlpha = la;
      if (wide) reading(altitude(t + sy, pageH), rx - 16, t + 11, 'right');
      ctx.globalAlpha = 1;
    }

    // Diamonds: ring R appears at R × RING_STEP ms and fades over RING_LIFE; the first and last are orange.
    rings = rings.filter(r => now - r.t0 < RINGS * RING_STEP + RING_LIFE);
    for (const r of rings) {
      for (let R = 1; R <= RINGS; R++) {
        const age = now - r.t0 - R * RING_STEP;
        if (age < 0 || age > RING_LIFE) continue;
        const edge = R === 1 || R === RINGS, f = 1 - age / RING_LIFE;
        ctx.strokeStyle = rgba(edge ? ORANGE : INK, (edge ? .9 : .3) * f * r.k); ctx.lineWidth = edge ? 2 : 1;
        const v = diamond(r.x, r.y - sy, R);
        ctx.beginPath(); ctx.moveTo(v[0][0], v[0][1]);
        for (let j = 1; j < 4; j++) ctx.lineTo(v[j][0], v[j][1]);
        ctx.closePath(); ctx.stroke();
      }
    }
  }

  function drawVeil(v) {
    vtx.clearRect(0, 0, w, h);
    if (v.done) return;
    vtx.fillStyle = '#101010';
    vtx.fillRect(0, 0, w, v.panel); vtx.fillRect(0, h - v.panel, w, v.panel);
    if (v.lineAlpha > 0) {
      const L = w * v.line;
      vtx.fillStyle = rgba(ACID, v.lineAlpha); vtx.fillRect((w - L) / 2, Math.round(h / 2) - 1, L, 2);
    }
  }

  function frame(now) {
    raf = 0;
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const v = veil(now - t0, h);
      drawVeil(v);
      if (v.done) { introOn = false; html.classList.remove('is-intro'); }
    }
    // Reduced tier: values land on their goal in one frame, so nothing glides.
    const k = rate => reduce.matches ? 1 : rate;
    angle = approach(angle, reduce.matches ? 0 : goal, k(.12), .0005);
    if (mark.placed) { mark.x = approach(mark.x, mark.tx, k(.3)); mark.y = approach(mark.y, mark.ty, k(.3)); }
    mark.a = approach(mark.a, mark.ta, k(.2), .01);
    lock.t = approach(lock.t, lock.tt, k(.3)); lock.b = approach(lock.b, lock.tb, k(.3));
    lock.a = approach(lock.a, lock.ta, k(.2), .01);
    draw(now);
    const moving = angle !== (reduce.matches ? 0 : goal) || mark.x !== mark.tx || mark.y !== mark.ty || mark.a !== mark.ta ||
      lock.t !== lock.tt || lock.b !== lock.tb || lock.a !== lock.ta;
    if (introOn || rings.length || moving) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const live = () => !reduce.matches;

  // Pointer → centre of its page cell, in viewport coordinates.
  function markTo(x, y, instant) {
    const sy = scrollY;
    mark.tx = Math.floor(x / CELL) * CELL + CELL / 2;
    mark.ty = snap(y + sy) + CELL / 2 - sy;
    if (!mark.placed || instant) { mark.x = mark.tx; mark.y = mark.ty; mark.placed = true; }
    mark.ta = lock.el || !pointer.on ? 0 : 1;
  }
  function lockTo(el, instant) {
    const b = el.getBoundingClientRect();
    lock.tt = b.top; lock.tb = b.bottom; lock.ta = 1;
    if (instant || !lock.el || lock.a < .05) { lock.t = lock.tt; lock.b = lock.tb; }
    lock.el = el; mark.ta = 0;
  }
  function lockOff(el) {
    if (lock.el !== el) return;
    lock.el = null; lock.ta = 0; mark.ta = pointer.on ? 1 : 0;
  }
  function ring(x, y, strength) {
    if (rings.length > 12) rings.shift();
    rings.push({x: Math.floor(x / CELL) * CELL + CELL / 2, y: snap(y + scrollY) + CELL / 2, t0: performance.now(), k: strength});
    wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    markTo(e.clientX, e.clientY); wake();
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    markTo(e.clientX, e.clientY, e.pointerType === 'touch');
    if (live()) ring(e.clientX, e.clientY, 1);
    wake();
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; mark.ta = 0; wake(); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; mark.ta = 0; wake(); });

  addEventListener('scroll', () => {
    goal = sweep(scrollY);
    if (mark.placed) markTo(pointer.x, pointer.y, true);   // the mark re-reads its cell as the page moves
    if (lock.el) lockTo(lock.el, true);
    wake();
  }, {passive: true});

  // Entry selection: hover and keyboard focus share one response.
  document.querySelectorAll('.log li').forEach(li => {
    li.addEventListener('pointerenter', () => { lockTo(li); wake(); });
    li.addEventListener('pointerleave', () => { if (!li.matches(':focus-within')) { lockOff(li); wake(); } });
    li.addEventListener('focusin', () => { if (li.querySelector(':focus-visible') || li.matches(':focus-visible')) { lockTo(li); wake(); } });
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget)) { lockOff(li); wake(); } });
  });
  // Keyboard parity for the diamonds: focusing anything sends a small set from its centre.
  document.addEventListener('focusin', e => {
    if (!live() || !e.target.matches?.(':focus-visible')) return;
    const b = e.target.getBoundingClientRect();
    ring(b.left + Math.min(b.width / 2, 60), b.top + b.height / 2, .6);
  });

  addEventListener('resize', resize);
  addEventListener('load', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduce.addEventListener?.('change', () => {
    rings = [];
    if (introOn) { introOn = false; html.classList.remove('is-intro'); vtx.clearRect(0, 0, w, h); veilEl.style.background = 'transparent'; }
    wake();
  });
  goal = angle = reduce.matches ? 0 : sweep(scrollY);
  resize(); wake();
  return api;
});
