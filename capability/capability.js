/* Capability page motion, after an event PV's tactical-terminal sequences (boot, traces, tiles).
   - opening (≤1.7 s): the CRT powers on (a phosphor line, then the picture opens from it); the
     ruler draws, status boxes flicker on, the word types itself, circuit traces run from the HUD
     to each column, and the columns scan in on a beat (CSS does the type and columns)
   - scroll: the ruler slides under its fixed mark and the Y readout counts ticks; columns not yet
     seen scan in as they enter the viewport
   - pointer: a block cursor on the 8px character grid, and an orthogonal circuit trace from it to
     the port of the nearest module (square nodes at its bends)
   - click / tap: a ping — a 3×3 dot matrix flashes, then a square ring steps outward on the grid
     (on a layer above the modules, so every click answers)
   - selection (hover or visible keyboard focus) lights a module in phosphor (CSS)
   Two tiers. Full: everything above. Reduced (prefers-reduced-motion): no opening or scan-in; the
   cursor, trace and ruler follow instantly; a click shows a still square for a moment.
   One requestAnimationFrame per frame; layers redraw only when their inputs change. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CapabilityScene = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const GRID = 8, INTRO_MS = 1700, CRT_MS = 380, PING_MS = 420, REACH = 640;
  const GREEN = '163,255,119';
  const clamp = x => Math.max(0, Math.min(1, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);
  const snap = v => Math.round(v / GRID) * GRID;

  // CRT power-on at t ms: the phosphor line grows from the centre (0..1), then the picture opens
  // vertically from it (0..1).
  const crt = t => ({line: out(t / 140), open: out((t - 120) / 240), done: t >= CRT_MS});
  // Orthogonal trace from (ax, ay) to a port at (bx, by) entered from the left: across, down/up,
  // across — the vertical run sits on the grid, 24px before the port.
  function route(ax, ay, bx, by) {
    const mx = snap(bx - 24);
    return [[ax, ay], [mx, ay], [mx, by], [bx, by]];
  }
  // Opening traces: how much of column c's trace is drawn at t ms, and its opacity.
  const traceAt = (t, c) => ({k: out((t - 700 - c * 90) / 360), alpha: 1 - clamp((t - 1300) / 300)});
  // Ping at t ms: dot matrix on (first 80 ms), square ring half-size in whole grid steps, opacity.
  function ping(t) {
    if (t < 0 || t >= PING_MS) return null;
    return {dots: t < 80, r: t < 60 ? 0 : 12 + GRID * Math.min(6, Math.floor((t - 60) / 45)), alpha: 1 - clamp((t - 200) / (PING_MS - 200))};
  }
  // Ruler readout: scroll position in ticks, three digits.
  const readout = sy => String(Math.max(0, Math.round(sy / GRID)) % 1000).padStart(3, '0');
  const api = {GRID, INTRO_MS, CRT_MS, PING_MS, REACH, snap, crt, route, traceAt, ping, readout};
  if (typeof document === 'undefined') return api;

  const html = document.documentElement;
  const field = document.querySelector('.field'), marksEl = document.querySelector('.marks'), veilEl = document.querySelector('.veil');
  const ctx = field && field.getContext('2d'), mtx = marksEl && marksEl.getContext('2d'), vtx = veilEl && veilEl.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let introOn = html.classList.contains('is-intro') && !reduce.matches;
  if (!ctx || !mtx || !vtx) { html.classList.remove('is-intro'); return api; }
  if (!introOn) { html.classList.remove('is-intro'); veilEl.hidden = true; }
  const rgba = a => `rgba(${GREEN},${a})`;
  const mods = [...document.querySelectorAll('.mod')], cols = [...document.querySelectorAll('.dom')];
  const ruler = document.querySelector('.ruler'), readEl = document.querySelector('.scroll-read'), status = document.querySelector('.status');

  let w = 0, h = 0, dpr = 1, raf = 0, t0 = -1, pings = [];
  const pointer = {x: 0, y: 0, on: false};
  const dirty = {field: false, ruler: false};
  const request = (...what) => { for (const k of what) dirty[k] = true; if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };

  function fit(c, x) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resize() {
    w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    fit(field, ctx); fit(marksEl, mtx); if (introOn) fit(veilEl, vtx);
    request('field', 'ruler');
  }

  function path(g, pts, k) {   // draw the first k (0..1) of a polyline
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    let left = total * k;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.abs(x1 - x0) + Math.abs(y1 - y0), f = Math.min(1, left / (seg || 1));
      g.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f); left -= seg;
    }
    g.stroke();
  }
  const node = (g, x, y, s = 5) => g.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);

  // Field (under the modules): opening traces, then the pointer's cursor and trace.
  function drawField(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    if (introOn && t0 >= 0) {
      const t = now - t0, sb = status && status.offsetParent ? status.getBoundingClientRect() : null;
      const sx = sb ? sb.left : w - 24, sy = sb ? sb.top + 12 : 96;
      cols.forEach((c, i) => {
        const tr = traceAt(t, i);
        if (tr.k <= 0 || tr.alpha <= 0) return;
        const hb = c.querySelector('h2').getBoundingClientRect(), port = [hb.right + 12, hb.top + hb.height / 2];
        const pts = [[sx, sy + i * 30], [snap(port[0] + 40), sy + i * 30], [snap(port[0] + 40), port[1]], port];
        ctx.strokeStyle = rgba(.7 * tr.alpha); ctx.fillStyle = rgba(tr.alpha);
        path(ctx, pts, tr.k);
        if (tr.k >= 1) node(ctx, port[0], port[1], 6);
      });
    }
    if (!pointer.on) return;
    const cx = snap(pointer.x), cy = snap(pointer.y);
    let best = null, bd = REACH;
    for (const m of mods) {
      const b = m.getBoundingClientRect();
      if (pointer.x >= b.left && pointer.x <= b.right && pointer.y >= b.top && pointer.y <= b.bottom) { best = null; bd = -1; break; }
      const px = b.left - 1, py = b.top + 22, d = Math.hypot(px - pointer.x, py - pointer.y);
      if (d < bd) { bd = d; best = [px, py]; }
    }
    if (best) {
      const pts = route(cx, cy, best[0], best[1]);
      ctx.strokeStyle = rgba(.45); path(ctx, pts, 1);
      ctx.fillStyle = rgba(.85); node(ctx, pts[1][0], pts[1][1]); node(ctx, pts[2][0], pts[2][1]); node(ctx, best[0], best[1], 6);
    }
    ctx.fillStyle = rgba(.85); ctx.fillRect(cx - 4, cy - 7, 8, 14);   // block cursor
  }
  // Marks (above the modules): pings.
  function drawMarks(now) {
    mtx.clearRect(0, 0, w, h);
    pings = pings.filter(p => (p.still ? now - p.t0 < 300 : ping(now - p.t0)));
    for (const p of pings) {
      const x = p.x, y = p.y - scrollY;
      if (p.still) { mtx.strokeStyle = rgba(.9); mtx.lineWidth = 2; mtx.strokeRect(x - 20, y - 20, 40, 40); continue; }
      const s = ping(now - p.t0);
      mtx.globalAlpha = s.alpha; mtx.fillStyle = rgba(1); mtx.strokeStyle = rgba(.9); mtx.lineWidth = 2;
      if (s.dots) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { mtx.beginPath(); mtx.arc(x + i * 10, y + j * 10, 3.5, 0, Math.PI * 2); mtx.fill(); }
      if (s.r) mtx.strokeRect(x - s.r, y - s.r, s.r * 2, s.r * 2);
      mtx.globalAlpha = 1;
    }
  }
  function drawVeil(t) {
    const c = crt(t);
    vtx.clearRect(0, 0, w, h);
    if (c.done) return;
    const half = (h / 2) * (1 - c.open);
    vtx.fillStyle = '#000'; vtx.fillRect(0, 0, w, half); vtx.fillRect(0, h - half, w, half);
    if (c.open < 1) {   // the phosphor line, fading as the picture opens
      const L = w * c.line; vtx.fillStyle = rgba(1 - c.open);
      vtx.fillRect((w - L) / 2, h / 2 - 1, L, 2);
    }
  }
  let lastRead = '';
  function applyRuler() {
    if (ruler) ruler.style.setProperty('--sy', (reduce.matches ? 0 : Math.round(scrollY)) + 'px');
    const r = readout(scrollY);
    if (readEl && r !== lastRead) { readEl.textContent = r; lastRead = r; }
  }

  function frame(now) {
    raf = 0;
    if (introOn) {
      if (t0 < 0) { t0 = now; veilEl.style.background = 'transparent'; }
      const t = now - t0;
      drawVeil(t);
      if (t >= CRT_MS && !veilEl.hidden) { veilEl.hidden = true; veilEl.width = veilEl.height = 0; }
      if (t >= INTRO_MS) { introOn = false; html.classList.remove('is-intro'); }
      dirty.field = true;
    }
    if (dirty.ruler) { dirty.ruler = false; applyRuler(); }
    if (dirty.field) { dirty.field = false; drawField(now); }
    drawMarks(now);
    if (introOn || pings.length) raf = requestAnimationFrame(frame);
  }

  // Scroll-in: columns not yet on screen wait, clipped, and scan in when they arrive. Those on
  // screen at load scan in during the opening, one after another.
  if (!reduce.matches && 'IntersectionObserver' in window) {
    html.classList.add('scan');
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const c = e.target, i = cols.indexOf(c);
        if (i >= 0) c.style.setProperty('--d', introOn ? (.9 + i * .12) + 's' : '0s');
        c.classList.add('on'); io.unobserve(c);
      }
    }, {rootMargin: '0px 0px -10% 0px'});
    cols.forEach(c => io.observe(c));
    document.querySelectorAll('.xref .link').forEach(l => io.observe(l));
  }

  // Cross-reference: pointing at (or focusing) an evidence code lights every module that cites it.
  document.querySelectorAll('.xref .link').forEach(row => {
    const code = row.dataset.code, cited = mods.filter(m => [...m.querySelectorAll('a.chip')].some(a => a.textContent.trim() === code));
    const on = () => cited.forEach(m => m.classList.add('is-cited')), off = () => cited.forEach(m => m.classList.remove('is-cited'));
    row.addEventListener('pointerenter', on); row.addEventListener('pointerleave', off);
    row.addEventListener('focusin', on); row.addEventListener('focusout', off);
  });

  addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = e.pointerType !== 'touch' || e.pressure > 0;
    request('field');
  }, {passive: true});
  addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
    if (pings.length > 6) pings.shift();
    pings.push({x: snap(e.clientX), y: snap(e.clientY) + scrollY, t0: performance.now(), still: reduce.matches});
    request('field');
  }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType === 'touch') { pointer.on = false; request('field'); } }, {passive: true});
  html.addEventListener('pointerleave', () => { pointer.on = false; request('field'); });
  addEventListener('scroll', () => request('ruler', 'field'), {passive: true});
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request('field'); });
  reduce.addEventListener?.('change', () => {
    pings = [];
    if (introOn) { introOn = false; html.classList.remove('is-intro'); veilEl.hidden = true; }
    if (reduce.matches) { html.classList.remove('scan'); }
    request('field', 'ruler');
  });
  resize();
  if (introOn) request('field');
  return api;
});
