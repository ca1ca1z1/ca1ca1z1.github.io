/* Record page motion, after an event PV's operator-file sequence.
   - opening (≤1.6 s, continuous eased motion): a black frame parts from its horizontal centreline
     while an acid line draws outward along it; the altitude ruler then draws downward
   - background: three trajectory arcs; scrolling swings them around an off-screen pivot (ascent)
   - altitude ruler on the left, ticked every 31px cell of page height (one cell = 10 m, 0000 at the
     bottom band, the "ground")
   - pointer: an altimeter mark on the ruler tick nearest the pointer — reading boxed on the ruler,
     a guide out to a crosshair on the pointer's column — jumping whole cells
   - entry selection (hover or keyboard focus): an orange bracket spans the entry on the ruler, with
     its altitude; the slab itself is CSS
   - click / tap / keyboard focus: diamonds (Manhattan rings) step outward cell by cell
   Layers. The ruler is a canvas in page coordinates and the altimeter and bracket are small elements
   in page coordinates, so all three scroll with the text natively, with no frame of lag. Only the
   arcs and diamonds live on the fixed canvas, which redraws only while they move.
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, no arc swing, no
   diamonds; the altimeter mark and the bracket remain.
   No dependencies. Sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecordScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const CELL = 31, METRES = 10, INTRO_MS = 1600, RINGS = 6, RING_STEP = 45, RING_LIFE = 420;
  const INK = '16,16,16', ACID = '200,214,58', ORANGE = '255,90,31';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);

  // Top edge of the page cell that contains document y.
  const snap = y => Math.floor(y / CELL) * CELL;
  // Ruler tick nearest document y (ticks sit on cell edges, every CELL px).
  const tick = y => Math.round(y / CELL) * CELL;
  // Altitude reading at document y on a page of height pageH: whole cells above the bottom, 10 m each.
  function altitude(y, pageH) {
    return String(Math.max(0, Math.floor((pageH - y) / CELL)) * METRES).padStart(4, '0');
  }
  // Manhattan ring of radius R cells around (x, y): a diamond, vertices top, right, bottom, left.
  const diamond = (x, y, R) => [[x, y - R * CELL], [x + R * CELL, y], [x, y + R * CELL], [x - R * CELL, y]];
  // Smooth ease in-out (quintic), for the opening's continuous motion.
  const inOut = x => { x = clamp(x); return x < .5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2; };
  // Opening state at t ms in a viewport of height h. All values move continuously.
  //   line: centreline length 0..1 · lineAlpha · panel: each black half's height in px
  //   ruler: ruler reveal 0..1 · done
  function veil(t, h) {
    const half = Math.ceil(h / 2);
    return {
      line: out(t / 380),
      lineAlpha: 1 - inOut((t - 700) / 320),
      panel: half * (1 - inOut((t - 260) / 680)),
      ruler: out((t - 680) / 700),
      done: t >= INTRO_MS
    };
  }
  // Arc swing (radians) for a scroll offset.
  const sweep = scrollY => scrollY * .00035;
  // Eased approach that settles exactly.
  function approach(value, goal, rate, epsilon = .3) {
    return Math.abs(goal - value) < epsilon ? goal : value + (goal - value) * rate;
  }
  const api = {CELL, METRES, INTRO_MS, snap, tick, altitude, diamond, veil, sweep, approach};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const scene = document.querySelector('.scene'), veilEl = document.querySelector('.veil'), rulerEl = document.querySelector('.ruler');
  const ctx = scene && scene.getContext('2d'), vtx = veilEl && veilEl.getContext('2d'), rtx = rulerEl && rulerEl.getContext('2d');
  if (!ctx || !vtx || !rtx) { html.classList.remove('is-intro'); return api; }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Altimeter and bracket: page-anchored elements (see record.css).
  const marks = document.createElement('div');
  marks.className = 'marks'; marks.setAttribute('aria-hidden', 'true');
  marks.innerHTML = '<div class="mk"><i class="mk-guide"></i><i class="mk-tick"></i><i class="mk-x"></i><b class="mk-read"></b></div>' +
    '<div class="lk"><i class="lk-b"></i><b class="lk-read"></b></div>';
  rulerEl.after(marks);
  const mk = marks.querySelector('.mk'), mkRead = marks.querySelector('.mk-read');
  const lk = marks.querySelector('.lk'), lkRead = marks.querySelector('.lk-read');

  let w = 0, h = 0, rail = 88, pageH = 0, raf = 0;
  let introOn = html.classList.contains('is-intro') && !reduce.matches, t0 = -1;
  let angle = 0, goal = 0, rings = [], lockEl = null, mkY = NaN, mkX = NaN;
  const pointer = {x: 0, y: 0, on: false};
  if (!introOn) { html.classList.remove('is-intro'); veilEl.hidden = true; }

  function fit(c, x, cw, ch, d) {
    c.width = Math.round(cw * d); c.height = Math.round(ch * d);
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    x.setTransform(d, 0, 0, d, 0, 0);
  }
  function resize() {
    w = innerWidth; h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    rail = parseFloat(getComputedStyle(html).getPropertyValue('--rail')) || 88;
    const end = document.querySelector('.end');
    pageH = Math.ceil(end ? end.getBoundingClientRect().bottom + scrollY : html.scrollHeight);
    fit(scene, ctx, w, h, dpr);
    if (introOn) fit(veilEl, vtx, w, h, dpr);
    fit(rulerEl, rtx, rail, pageH, Math.min(dpr, 16000 / pageH));   // stay under canvas size limits
    drawRuler(introOn ? (t0 < 0 ? 0 : veil(performance.now() - t0, h).ruler) : 1);
    mkY = mkX = NaN;
    if (lockEl) lockTo(lockEl);
    markTo();
    drawScene(performance.now());
  }

  // Ruler, in page coordinates: drawn once, scrolls with the page. The opening draws it downward
  // from the top of the viewport.
  function drawRuler(reveal) {
    rtx.clearRect(0, 0, rail, pageH);
    if (reveal <= 0) return;
    const rx = rail - 12, wide = rail >= 64;
    const limit = reveal >= 1 ? pageH : scrollY + h * reveal;
    rtx.fillStyle = rgba(INK, .8); rtx.fillRect(rx, 0, 1, limit);
    rtx.font = `700 14px ${SANS}`; rtx.textAlign = 'right'; rtx.textBaseline = 'middle';
    for (let i = 0, y = 0; y <= limit; i++, y += CELL) {
      const major = i % 5 === 0;
      rtx.fillStyle = rgba(INK, major ? .8 : .45);
      rtx.fillRect(rx - (major ? 12 : 6), y, major ? 12 : 6, 1);
      if (major && wide) { rtx.fillStyle = rgba(INK, .62); rtx.fillText(altitude(y, pageH), rx - 18, y); }
    }
  }

  // Trajectory arcs: circles whose centres orbit a pivot beyond the lower right; the scroll swing
  // moves them across the page. Ink hairlines and one acid line with travelling ticks.
  function arcs(a, reveal) {
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

  // Fixed canvas: arcs and diamonds only.
  function drawScene(now) {
    ctx.clearRect(0, 0, w, h);
    const reveal = introOn ? (t0 < 0 ? 0 : veil(now - t0, h).ruler) : 1;
    if (reveal <= 0) return;
    arcs(reduce.matches ? 0 : angle, reveal);
    // Diamonds: ring R appears at R × RING_STEP ms and fades over RING_LIFE; the first and last are orange.
    rings = rings.filter(r => now - r.t0 < RINGS * RING_STEP + RING_LIFE);
    for (const r of rings) {
      for (let R = 1; R <= RINGS; R++) {
        const age = now - r.t0 - R * RING_STEP;
        if (age < 0 || age > RING_LIFE) continue;
        const edge = R === 1 || R === RINGS, f = 1 - age / RING_LIFE;
        ctx.strokeStyle = rgba(edge ? ORANGE : INK, (edge ? .9 : .3) * f * r.k); ctx.lineWidth = edge ? 2 : 1;
        const v = diamond(r.x, r.y - scrollY, R);
        ctx.beginPath(); ctx.moveTo(v[0][0], v[0][1]);
        for (let j = 1; j < 4; j++) ctx.lineTo(v[j][0], v[j][1]);
        ctx.closePath(); ctx.stroke();
      }
    }
  }

  function drawVeil(v) {
    vtx.clearRect(0, 0, w, h);
    vtx.fillStyle = '#101010';
    vtx.fillRect(0, 0, w, v.panel); vtx.fillRect(0, h - v.panel, w, v.panel);
    if (v.lineAlpha > 0) {
      const L = w * v.line;
      vtx.fillStyle = rgba(ACID, v.lineAlpha); vtx.fillRect((w - L) / 2, Math.round(h / 2) - 1, L, 2);
    }
  }
  // After the opening the veil leaves the page entirely: no full-screen layer stays composited.
  function endIntro() {
    introOn = false;
    html.classList.remove('is-intro');
    veilEl.hidden = true; veilEl.width = veilEl.height = 0;
    drawRuler(1);
  }

  function frame(now) {
    raf = 0;
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const v = veil(now - t0, h);
      if (v.done) endIntro(); else { drawVeil(v); drawRuler(v.ruler); }
    }
    const g = reduce.matches ? 0 : goal;
    angle = reduce.matches ? 0 : approach(angle, g, .25, .0005);
    drawScene(now);
    if (introOn || rings.length || angle !== g) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const live = () => !reduce.matches;

  // Altimeter: placed directly (no easing) on the ruler tick nearest the pointer; the crosshair
  // takes the pointer's column. Writes only when the cell changes.
  function markTo() {
    if (!pointer.on || lockEl) { mk.classList.remove('on'); return; }
    const y = tick(pointer.y + scrollY), x = Math.floor(pointer.x / CELL) * CELL;
    if (y !== mkY) { mk.style.transform = `translateY(${y}px)`; mkRead.textContent = altitude(y, pageH); mkY = y; }
    if (x !== mkX) { mk.style.setProperty('--x', x + 'px'); mkX = x; }
    mk.classList.add('on');
  }
  function lockTo(el) {
    lockEl = el;
    const b = el.getBoundingClientRect(), top = Math.round(b.top + scrollY);
    lk.style.transform = `translateY(${top}px)`; lk.style.height = Math.round(b.height) + 'px';
    lkRead.textContent = altitude(top, pageH);
    lk.classList.add('on'); markTo();
  }
  function lockOff(el) {
    if (lockEl !== el) return;
    lockEl = null; lk.classList.remove('on'); markTo();
  }
  function ring(x, y, strength) {
    if (rings.length > 12) rings.shift();
    rings.push({x: Math.floor(x / CELL) * CELL + CELL / 2, y: snap(y + scrollY) + CELL / 2, t0: performance.now(), k: strength});
    wake();
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    markTo();
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    markTo();
    if (live()) ring(e.clientX, e.clientY, 1);
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; markTo(); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; markTo(); });

  addEventListener('scroll', () => {
    markTo();                                   // the mark re-reads the tick under a still pointer
    if (live()) { goal = sweep(scrollY); wake(); }
  }, {passive: true});

  // Entry selection: hover and keyboard focus share one response.
  document.querySelectorAll('.log li').forEach(li => {
    li.addEventListener('pointerenter', () => lockTo(li));
    li.addEventListener('pointerleave', () => { if (!li.matches(':focus-visible, :has(:focus-visible)')) lockOff(li); });
    li.addEventListener('focusin', () => { if (li.querySelector(':focus-visible') || li.matches(':focus-visible')) lockTo(li); });
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget)) lockOff(li); });
  });
  // Keyboard parity for the diamonds: focusing anything sends a small set from its centre.
  document.addEventListener('focusin', e => {
    if (!live() || !e.target.matches?.(':focus-visible')) return;
    const b = e.target.getBoundingClientRect();
    ring(b.left + Math.min(b.width / 2, 60), b.top + b.height / 2, .6);
  });

  addEventListener('resize', resize);
  addEventListener('load', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (introOn || rings.length)) wake(); });
  reduce.addEventListener?.('change', () => {
    rings = [];
    if (introOn) endIntro();
    goal = angle = reduce.matches ? 0 : sweep(scrollY);
    drawScene(performance.now());
  });
  goal = angle = reduce.matches ? 0 : sweep(scrollY);
  resize();
  if (introOn) wake();
  return api;
});
