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
  const api = {INTRO_MS, SLASH_MS, REACH, spine, split, slashAt, nearest, approach};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), marksEl = document.querySelector('.marks');
  const ctx = field && field.getContext('2d'), mtx = marksEl && marksEl.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (html.classList.contains('is-intro')) setTimeout(() => html.classList.remove('is-intro'), reduce.matches ? 0 : INTRO_MS);
  if (!ctx || !mtx) return api;
  const rgba = (rgb, a) => `rgba(${rgb},${a})`;
  const cards = [...document.querySelectorAll('.catalogue article')];
  const tapes = cards.map(c => c.querySelector('.tape') || c);
  const ghost = document.querySelector('.ghost');

  let w = 0, h = 0, raf = 0, marks = [], pin = null, settleUntil = 0;
  const pointer = {x: 0, y: 0, on: false};
  const ret = {x: 0, y: 0, placed: false};

  function fit(c, x) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resize() { w = innerWidth; h = innerHeight; fit(field, ctx); fit(marksEl, mtx); draw(performance.now()); }

  // Reticle and thread (under the cards). The thread ends at the centre of the nearest card's tape,
  // read live from the tape itself, so it rides along as the card straightens and lifts.
  function drawField() {
    ctx.clearRect(0, 0, w, h); pin = null;
    if (!pointer.on || !ret.placed) return;
    const x = ret.x, y = ret.y;
    const pins = tapes.map(t => { const b = t.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; });
    const i = nearest(x, y, pins);
    if (i >= 0) {
      const p = pins[i], f = 1 - Math.hypot(p.x - x, p.y - y) / REACH;
      ctx.strokeStyle = rgba(RED, .2 + .45 * f); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x, p.y); ctx.stroke();
      pin = p;   // its dot is drawn on the top layer, on the tape
    }
    ctx.strokeStyle = rgba(INK, .4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 18, y + dy * 18); ctx.lineTo(x + dx * 24, y + dy * 24); }
    ctx.stroke();
    ctx.fillStyle = rgba(RED, 1); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Slash marks (above the cards).
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
    if (pin) {   // the thread's pin, on the tape
      mtx.fillStyle = rgba(RED, 1); mtx.beginPath(); mtx.arc(pin.x, pin.y, 3.5, 0, Math.PI * 2); mtx.fill();
    }
  }
  function draw(now) { drawField(); drawMarks(now); }

  function frame(now) {
    raf = 0;
    const k = reduce.matches ? 1 : .35;
    if (ret.placed) { ret.x = approach(ret.x, pointer.x, k); ret.y = approach(ret.y, pointer.y, k); }
    draw(now);
    if (marks.length || ret.x !== pointer.x || ret.y !== pointer.y || now < settleUntil) raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    if (!ret.placed) { ret.x = pointer.x; ret.y = pointer.y; ret.placed = true; }
    wake();
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    if (!ret.placed) { ret.x = pointer.x; ret.y = pointer.y; ret.placed = true; }
    if (marks.length > 8) marks.shift();
    const a1 = -.95 + (Math.random() - .5) * .35;
    marks.push({x: e.clientX, y: e.clientY + scrollY, t0: performance.now(), a1, a2: a1 + 1.7 + (Math.random() - .5) * .3, still: reduce.matches});
    draw(performance.now()); wake();
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; wake(); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; draw(performance.now()); });
  addEventListener('scroll', () => {
    if (ghost && !reduce.matches) ghost.style.setProperty('--drift', Math.round(-scrollY * .12) + 'px');
    draw(performance.now());
  }, {passive: true});

  // Row ↔ card: selecting either lights both (hover and keyboard focus alike).
  document.querySelectorAll('.acro .row').forEach(row => {
    const card = document.querySelector(row.getAttribute('href'));
    if (!card) return;
    const on = () => {
      row.classList.add('is-linked'); card.classList.add('is-linked');
      for (const c of cards) if (c !== card) c.classList.remove('is-target');   // selecting another clears a jump's frame
    };
    const off = () => { row.classList.remove('is-linked'); card.classList.remove('is-linked'); };
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
  // Keep the thread's pin on its tape while a card straightens, lifts or settles.
  for (const c of cards) c.addEventListener('transitionrun', () => { settleUntil = performance.now() + 400; wake(); });

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduce.addEventListener?.('change', () => {
    marks = []; html.classList.remove('is-intro');
    if (reduce.matches && ghost) ghost.style.removeProperty('--drift');
    draw(performance.now());
  });
  resize();
  return api;
});
