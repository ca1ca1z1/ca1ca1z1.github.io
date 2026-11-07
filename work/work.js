/* Work page motion, after an event PV's evidence-board sequences (0:40–1:30).
   - opening (≤1.7 s, CSS; this script ends it): red spine, the hidden word's letters first, the
     titles gathering round them, the title printing, a red slash on the beat, cards dropping in
   - pointer: a tracking reticle (ring and red dot) follows the pointer, and a red thread runs from
     it to the pin of the nearest card within reach
   - click / tap: a red slash mark — two strokes crossing — cut at the point, on a layer above the
     cards so every click answers
   - selection (hover or keyboard focus): an acrostic row and its card light together (CSS does
     the look, this script links them)
   - scroll: the ghost lettering drifts sideways
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening, drift, easing
   or stroke drawing; the reticle and thread follow instantly and a click places a still mark.
   No dependencies; the loop sleeps when nothing moves. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WorkScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const INTRO_MS = 1700, SLASH_MS = 600, REACH = 420;
  const RED = '181,18,27', INK = '18,19,19';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);

  // Acrostic spine: the occurrence of `letter` (case-insensitive, never a space) nearest the middle
  // of `title`, so rows stay balanced round the spine. -1 when the title has no such letter.
  function spine(title, letter) {
    const m = (title.length - 1) / 2, L = letter.toUpperCase();
    let best = -1, bd = Infinity;
    for (let i = 0; i < title.length; i++) {
      if (title[i].toUpperCase() === L && title[i] !== ' ' && Math.abs(i - m) < bd) { bd = Math.abs(i - m); best = i; }
    }
    return best;
  }
  // A title split for its acrostic row: [before, key letter, after].
  function split(title, letter) {
    const i = spine(title, letter);
    return i < 0 ? null : [title.slice(0, i), title[i], title.slice(i + 1)];
  }
  // Slash mark at t ms: first stroke drawn 0..1, second stroke 0..1, opacity. `still` (reduced
  // tier) shows the finished mark at once and removes it without a fade.
  function slashAt(t, still) {
    if (t < 0 || t >= SLASH_MS) return null;
    if (still) return t < 350 ? {a: 1, b: 1, alpha: 1} : null;
    return {a: out(t / 90), b: out((t - 60) / 90), alpha: 1 - clamp((t - 260) / (SLASH_MS - 260))};
  }
  // Nearest pin (card top centre) to (x, y) within reach; -1 if none.
  function nearest(x, y, pins, reach = REACH) {
    let best = -1, bd = reach;
    pins.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function approach(value, goal, rate, epsilon = .3) {
    return Math.abs(goal - value) < epsilon ? goal : value + (goal - value) * rate;
  }
  // Scroll, 1 — acrostic dissolve (the PV's names fading out at 1:27): p is how far the index has
  // scrolled up out of view (0..1). Row o (its arrival order, 0..n-1) leaves early to late; the red
  // key letters leave last.
  const acroProgress = (top, height, lead = 80) => clamp((lead - top) / (height + lead));
  const leaveRow = (p, o) => clamp((p - o * .12) / .4);
  const leaveKey = p => clamp((p - .62) / .38);
  // Scroll, 2 — board sway: d is a card's centre offset from the viewport centre, in viewport
  // heights (clamped −1..1). Cards straighten at the centre and tilt more, and drift, away from it.
  const sway = d => { d = Math.max(-1, Math.min(1, d)); return {tilt: 1 + 1.6 * Math.abs(d), drift: Math.round(-d * 16) + 0}; };
  // Scroll, 3 — the wall: evidence-board debris in the side margins (wide screens), each at its own
  // depth so it scrolls slower than the page. Laid out in "layer" coordinates: an item at layer y
  // sits on screen at y − scrollY·depth, so every item is reachable however far the page scrolls.
  const MAIN_MAX = 1240, WALL_KINDS = ['scrap', 'target', 'hex', 'slash', 'glyph'];
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // Items for a viewport of height h and a page that scrolls maxScroll: side (−1 left, 1 right),
  // u (0..1 across that margin), layer y, depth (0.35..0.85), kind, size (0.6..1.1), rotation,
  // letter (glyphs spell `word` in turn). Deterministic, about one item per 225px per side.
  function wallItems(h, maxScroll, word = 'MADE', seed = 2026) {
    const r = rng(seed), out = [];
    let g = 0;
    for (const side of [-1, 1]) {
      let y = -40 + r() * 120;
      while (out.length < 60) {
        const depth = .35 + r() * .5, span = h + maxScroll * depth + 80;
        if (y > span) break;
        const kind = WALL_KINDS[Math.floor(r() * WALL_KINDS.length)];
        out.push({side, u: .15 + r() * .7, y, depth, kind, size: .6 + r() * .5, rot: (r() - .5) * .5,
          letter: kind === 'glyph' ? word[g++ % word.length] : ''});
        y += 170 + r() * 110;
      }
    }
    return out;
  }
  // How far an item has come into view at screen y (0 just below the screen … 1 well inside).
  const entering = (y, h) => clamp((h - y) / (h * .35)) * clamp((y + 120) / (h * .2));
  const api = {INTRO_MS, SLASH_MS, REACH, MAIN_MAX, spine, split, slashAt, nearest, approach, acroProgress, leaveRow, leaveKey, sway,
    rng, wallItems, entering};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), marksEl = document.querySelector('.marks'), wallEl = document.querySelector('.wall');
  const ctx = field && field.getContext('2d'), mtx = marksEl && marksEl.getContext('2d'), wtx = wallEl && wallEl.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (html.classList.contains('is-intro')) setTimeout(() => html.classList.remove('is-intro'), reduce.matches ? 0 : INTRO_MS);
  if (!ctx || !mtx || !wtx) return api;
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const cards = [...document.querySelectorAll('.catalogue article')];
  const tapes = cards.map(c => c.querySelector('.tape') || c);
  const ghost = document.querySelector('.ghost');
  const acro = document.querySelector('.acro'), rows = [...document.querySelectorAll('.acro .row')];
  const rowOrder = rows.map(r => +getComputedStyle(r).getPropertyValue('--o') || 0);   // read once
  const SERIF = getComputedStyle(html).getPropertyValue('--serif') || 'Georgia, serif';

  let w = 0, h = 0, dpr = 1, marks = [], pin = null, settleUntil = 0;
  const pointer = {x: 0, y: 0, on: false};

  // One scheduler: every input only marks what changed; a single frame does the work.
  //   field — reticle and thread (pointer moved, page scrolled, a card moving)
  //   wall  — side-margin wall (page scrolled, resized)
  //   sway  — scroll-driven CSS values (page scrolled)
  //   marks — click slashes and the thread's pin (while any are showing)
  const dirty = {field: false, wall: false, sway: false};
  let raf = 0;
  const request = (...what) => { for (const k of what) dirty[k] = true; if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };

  function fit(c, x) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- wall: redrawn only when the page scrolls or resizes ----------------------------------------
  // Simple vector items are drawn directly (cheap); only the blurred letters are pre-rendered once,
  // because blurring live is the one costly thing here.
  let wall = [], gutter = 0;
  function glyphSprite(letter, s) {
    const size = 300 * s, pad = 16, c = document.createElement('canvas');
    c.width = c.height = Math.ceil((size + pad * 2) * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(size / 2 + pad, size / 2 + pad);
    g.font = `400 ${Math.round(260 * s)}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.filter = 'blur(3px)'; g.fillStyle = 'rgba(18,19,19,.06)'; g.fillText(letter, 0, 0);
    return {c, half: size / 2 + pad};
  }
  function layoutWall() {
    gutter = (w - Math.min(MAIN_MAX, w)) / 2;
    wall = gutter < 120 ? [] : wallItems(h, Math.max(0, html.scrollHeight - h), acro?.dataset.word || 'MADE');
    const k = Math.min(1, gutter / 340);
    for (const it of wall) { it.s = it.size * k; if (it.kind === 'glyph') it.sprite = glyphSprite(it.letter, it.s); }
  }
  // Full tier: depth parallax, fade in on entering, a slight turn. Reduced: fixed to the page, still.
  function drawWall() {
    wtx.clearRect(0, 0, w, h);
    const still = reduce.matches, sy = scrollY;
    for (const it of wall) {
      const y = it.y - sy * (still ? 1 : it.depth);
      if (y < -200 || y > h + 200) continue;
      const e = still ? 1 : entering(y, h);
      if (e <= 0) continue;
      const x = it.side < 0 ? gutter * it.u : w - gutter * it.u, s = it.s, g = wtx;
      g.save(); g.globalAlpha = e; g.translate(x, y); g.rotate(it.rot + (still ? 0 : sy * .0006 * (it.depth - .6)));
      if (it.kind === 'glyph') g.drawImage(it.sprite.c, -it.sprite.half, -it.sprite.half, it.sprite.half * 2, it.sprite.half * 2);
      else if (it.kind === 'scrap') {
        const W = 150 * s, H = 110 * s;
        g.fillStyle = 'rgba(20,26,28,.05)'; g.fillRect(-W / 2 + 3, -H / 2 + 5, W, H);
        g.fillStyle = '#eef0ef'; g.fillRect(-W / 2, -H / 2, W, H);
        g.strokeStyle = 'rgba(18,19,19,.12)'; g.lineWidth = 1; g.beginPath();
        for (let t = 9; t < W - 16; t += 9) { g.moveTo(-W / 2 + 8 + t, -H / 2 + 8); g.lineTo(-W / 2 + 8 + Math.max(0, t - (H - 30)), -H / 2 + 8 + Math.min(H - 30, t)); }
        g.stroke();
        g.fillStyle = 'rgba(200,205,204,.8)'; g.rotate(-.05); g.fillRect(-22 * s, -H / 2 - 8 * s, 44 * s, 14 * s);
      } else if (it.kind === 'target') {
        const R = 34 * s;
        g.strokeStyle = 'rgba(18,19,19,.22)'; g.lineWidth = 1; g.beginPath();
        g.arc(0, 0, R, 0, Math.PI * 2); g.moveTo(R * .45, 0); g.arc(0, 0, R * .45, 0, Math.PI * 2);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(dx * (R + 4), dy * (R + 4)); g.lineTo(dx * (R + 12), dy * (R + 12)); }
        g.stroke();
        g.fillStyle = rgba(RED, .85); g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill();
      } else if (it.kind === 'hex') {
        const R = 13 * s;
        g.strokeStyle = 'rgba(18,19,19,.18)'; g.lineWidth = 1;
        [[0, 0], [1, 0], [-1, 0], [.5, .866], [-.5, .866], [.5, -.866], [1.5, .866]].forEach(([cx, cy], j) => {
          g.beginPath();
          for (let q = 0; q < 6; q++) { const a = Math.PI / 6 + q * Math.PI / 3; g.lineTo(cx * R * 1.8 + Math.cos(a) * R, cy * R * 1.8 + Math.sin(a) * R); }
          g.closePath();
          if (j === 3) { g.fillStyle = rgba(RED, .55); g.fill(); } else g.stroke();
        });
      } else { g.fillStyle = rgba(RED, .5); g.fillRect(-65 * s, -2, 130 * s, 4); }   // slash
      g.restore();
    }
  }

  // --- reticle and thread: follows the pointer exactly ----------------------------------------
  function drawField() {
    ctx.clearRect(0, 0, w, h); pin = null;
    if (!pointer.on) return;
    const x = pointer.x, y = pointer.y;
    const pins = tapes.map(t => { const b = t.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; });
    const i = nearest(x, y, pins);
    if (i >= 0) {
      const p = pins[i], f = 1 - Math.hypot(p.x - x, p.y - y) / REACH;
      ctx.strokeStyle = rgba(RED, .2 + .45 * f); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x, p.y); ctx.stroke();
      pin = p;
    }
    ctx.strokeStyle = rgba(INK, .4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 18, y + dy * 18); ctx.lineTo(x + dx * 24, y + dy * 24); }
    ctx.stroke();
    ctx.fillStyle = rgba(RED, 1); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // --- click slashes and the thread's pin (top layer) --------------------------------------------
  function drawMarks(now) {
    mtx.clearRect(0, 0, w, h);
    marks = marks.filter(m => slashAt(now - m.t0, m.still));
    for (const m of marks) {
      const s = slashAt(now - m.t0, m.still), x = m.x, y = m.y - scrollY, L = 34;
      mtx.strokeStyle = rgba(RED, s.alpha); mtx.lineWidth = 3; mtx.lineCap = 'square';
      for (const [k, a] of [[s.a, m.a1], [s.b, m.a2]]) {
        if (k <= 0) continue;
        const cx = Math.cos(a) * L / 2, cy = Math.sin(a) * L / 2;
        mtx.beginPath(); mtx.moveTo(x - cx, y - cy); mtx.lineTo(x - cx + 2 * cx * k, y - cy + 2 * cy * k); mtx.stroke();
      }
    }
    if (pin) { mtx.fillStyle = rgba(RED, 1); mtx.beginPath(); mtx.arc(pin.x, pin.y, 3.5, 0, Math.PI * 2); mtx.fill(); }
  }

  // --- scroll-driven CSS values: all reads first, then all writes (no forced re-layouts) ---------
  const last = new Map();
  const set = (el, k, v) => { const key = el; const m = last.get(key) || {}; if (m[k] !== v) { el.style.setProperty(k, v); m[k] = v; last.set(key, m); } };
  function applySway() {
    if (reduce.matches) return;
    const ab = acro?.getBoundingClientRect(), cb = cards.map(c => c.getBoundingClientRect());   // reads
    if (ghost) set(ghost, '--drift', Math.round(-scrollY * .12) + 'px');                       // writes
    if (ab) {
      const p = acroProgress(ab.top, ab.height);
      set(acro, '--lk', leaveKey(p).toFixed(2));
      rows.forEach((r, i) => set(r, '--l', leaveRow(p, rowOrder[i]).toFixed(2)));
    }
    cards.forEach((c, i) => {
      const s = sway((cb[i].top + cb[i].height / 2 - h / 2) / h);
      set(c, '--tilt', s.tilt.toFixed(2)); set(c, '--py', s.drift + 'px');
    });
  }
  function clearSway() {
    last.clear(); ghost?.style.removeProperty('--drift'); acro?.style.removeProperty('--lk');
    for (const r of rows) r.style.removeProperty('--l');
    for (const c of cards) { c.style.removeProperty('--tilt'); c.style.removeProperty('--py'); }
  }

  function frame(now) {
    raf = 0;
    if (dirty.sway) { dirty.sway = false; applySway(); }
    if (dirty.wall) { dirty.wall = false; drawWall(); }
    if (dirty.field || now < settleUntil) { dirty.field = false; drawField(); }
    drawMarks(now);
    if (marks.length || now < settleUntil) raf = requestAnimationFrame(frame);
  }

  function resize() {
    w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    fit(field, ctx); fit(marksEl, mtx); fit(wallEl, wtx);
    layoutWall();
    request('sway', 'wall', 'field');
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    request('field');
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    if (marks.length > 8) marks.shift();
    const a1 = -.95 + (Math.random() - .5) * .35;
    marks.push({x: e.clientX, y: e.clientY + scrollY, t0: performance.now(), a1, a2: a1 + 1.7 + (Math.random() - .5) * .3, still: reduce.matches});
    request('field');
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; request('field'); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; request('field'); });
  addEventListener('scroll', () => request('sway', 'wall', 'field'), {passive: true});

  // Row ↔ card: selecting either lights both (hover and keyboard focus alike). While a card
  // straightens or settles (0.3 s), keep redrawing so the thread's pin rides along with its tape.
  const settle = () => { settleUntil = performance.now() + 350; request('field'); };
  document.querySelectorAll('.acro .row').forEach(row => {
    const card = document.querySelector(row.getAttribute('href'));
    if (!card) return;
    const on = () => {
      row.classList.add('is-linked'); card.classList.add('is-linked'); settle();
      for (const c of cards) if (c !== card) c.classList.remove('is-target');   // selecting another clears a jump's frame
    };
    const off = () => { row.classList.remove('is-linked'); card.classList.remove('is-linked'); settle(); };
    row.addEventListener('click', () => { for (const c of cards) c.classList.toggle('is-target', c === card); });
    for (const el of [row, card]) {
      el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
      el.addEventListener('focusin', on); el.addEventListener('focusout', off);
    }
  });
  // A card reached by link (an acrostic row, or Capability's evidence) wears a red frame until
  // another card is selected — unlike :target, which would keep it until the next jump.
  function markTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    for (const c of cards) c.classList.toggle('is-target', c.id === id);
  }
  addEventListener('hashchange', markTarget);
  markTarget();

  addEventListener('resize', resize);
  addEventListener('load', resize);   // page height is final now: lay the wall out again
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request('field'); });
  reduce.addEventListener?.('change', () => {
    marks = []; html.classList.remove('is-intro');
    if (reduce.matches) clearSway();
    request('sway', 'wall', 'field');
  });
  resize();
  return api;
});
