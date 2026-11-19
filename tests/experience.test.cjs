// Experience page motion: grid nodes, opening cuts and tear, datamosh, reassembly, deconstruction,
// title slices, serrated fills, scaffold, compass ring, shards and streaks.
const assert = require('assert');
const fs = require('fs'), path = require('path');
const X = require('../experience/experience.js');
const {CELL, NODE, OFF, BEAT, INTRO_MS, GROW_END, MOSH_END, TEAR_START, TEAR_END, TAU, SECTOR, REGEN_WAIT, REGEN_MS, SHARD_MS,
  node, rng, bands, intro, tearAt, moshAt, assemble, apart, shift, slices, serrate, scaffold, bounds,
  fresh, strike, ringAt, sectorShards, smear} = X;

assert.strictEqual(CELL, 31, 'grid matches the entrance cell');
assert.strictEqual(NODE, 2 * CELL, 'dot every two cells');
assert(INTRO_MS <= 2000, 'opening stays under 2 s');

// Nodes: always on the CSS dot grid (OFF + NODE·k), and the nearest one.
for (let v = -200; v < 3000; v += 13) {
  const n = node(v);
  assert.strictEqual(Math.abs((n - OFF) % NODE), 0, 'node on the grid');
  assert(Math.abs(n - v) <= NODE / 2, 'nearest node');
}
assert.strictEqual(node(31), 31);
assert.strictEqual(node(61), 31);
assert.strictEqual(node(63), 93);

// Deterministic generator.
const a = rng(6), b = rng(6);
for (let i = 0; i < 20; i++) { const x = a(); assert.strictEqual(x, b()); assert(x >= 0 && x < 1); }

// Bands cover the viewport exactly, in order, with bounded delays and streak reach.
for (const h of [600, 812, 1080]) {
  const list = bands(h);
  assert.strictEqual(list[0].y, 0);
  list.forEach((band, i) => {
    assert(band.h > 0, 'band has height');
    if (i) assert.strictEqual(band.y, list[i - 1].y + list[i - 1].h, 'bands are contiguous');
    assert(band.dir === 1 || band.dir === -1);
    assert(band.delay >= 0 && band.delay <= 260);
    assert(band.reach >= .35 && band.reach <= 1);
  });
  const last = list[list.length - 1];
  assert.strictEqual(last.y + last.h, h, 'bands cover the height');
}

// Opening: three hard cuts on the beat (negative, cobalt, paper with the bar), then the fills grow
// and the plate moshes in whole steps, never easing; the tear follows; done at INTRO_MS.
assert.strictEqual(intro(0).ground, 'neg');
assert.strictEqual(intro(BEAT).ground, 'cobalt');
assert.strictEqual(intro(2 * BEAT).ground, 'paper');
assert(intro(2 * BEAT).bar && !intro(3 * BEAT).bar && !intro(BEAT).bar, 'the bar holds one beat');
assert.strictEqual(intro(3 * BEAT - 1).grow, 0);
const grows = new Set();
for (let t = 0; t < INTRO_MS; t += 7) {
  const s = intro(t);
  grows.add(s.grow);
  assert(s.grow >= 0 && s.grow <= 1 && s.mosh >= 0 && s.mosh <= 1);
  if (t + 7 < INTRO_MS) { const n = intro(t + 7); assert(n.grow >= s.grow && n.mosh >= s.mosh, 'steps only advance'); }
  if (s.mosh > 0) assert.strictEqual(s.grow, 1, 'fills are whole before the mosh');
}
assert.strictEqual(grows.size, 7, 'six whole growth steps after zero');
assert.strictEqual(intro(GROW_END - 1).mosh, 0);
assert.strictEqual(intro(MOSH_END - 1).mosh, 1, 'mosh complete before the tear');
assert(!intro(TEAR_START - 1).tearing && intro(TEAR_START).tearing);
for (const band of bands(800)) {
  assert.strictEqual(tearAt(TEAR_START, band), 0, 'bands wait for the tear');
  assert.strictEqual(tearAt(TEAR_END, band), 1, 'band gone by TEAR_END');
  let prev = 0;
  for (let t = TEAR_START; t <= TEAR_END; t += 16) { const k = tearAt(t, band); assert(k >= prev, 'tear only advances'); prev = k; }
}
assert(TEAR_END < INTRO_MS);
assert(!intro(INTRO_MS - 1).done && intro(INTRO_MS).done);

// Datamosh streaks stay on screen, grow from the band's side, and reach no further than allowed.
for (const band of bands(900)) for (const m of [0, .25, .5, 1]) {
  const s = moshAt(m, band, 1440);
  assert(s.x >= 0 && s.x + s.len <= 1440 && s.src >= 0 && s.src < 1440);
  assert(s.len <= Math.round(1440 * band.reach) + 1);
  if (band.dir > 0) assert.strictEqual(s.x + s.len, 1440); else assert.strictEqual(s.x, 0);
}
assert.strictEqual(moshAt(0, {dir: 1, reach: 1}, 800).len, 0);

// Reassembly: apart until each piece's start, then together in whole steps, all done in time.
for (let i = 0; i < 20; i++) {
  assert.strictEqual(assemble(0, i), 1);
  let prev = 1;
  for (let t = 0; t <= INTRO_MS; t += 8) {
    const k = assemble(t, i);
    assert(k <= prev, 'reassembly only advances'); prev = k;
    assert([0, 1 / 3, 2 / 3, 1].some(v => Math.abs(v - k) < 1e-9), 'whole steps only');
  }
  assert.strictEqual(assemble(INTRO_MS, i), 0, 'every piece home before the opening ends');
}
assert(assemble(TEAR_START, 0) === 1, 'pieces stay apart until the plate starts to tear');

// Deconstruction: none well inside the screen, growing past either edge, capped at 1.
assert.strictEqual(apart(450, 900), 0);
assert.strictEqual(apart(120, 900), 0);
assert(apart(0, 900) > 0 && apart(-200, 900) > apart(0, 900));
assert(apart(900, 900) > 0);
assert.strictEqual(apart(-5000, 900), 1);
assert.strictEqual(apart(5000, 900), 1);
// Shifts are whole cells, never -0.
for (const amp of [-4, -1, 1, 3]) for (const k of [0, .2, .5, .8, 1]) {
  const s = shift(k, amp);
  assert.strictEqual(Math.abs(s % CELL), 0); assert(!Object.is(s, -0));
  assert(Math.abs(s) <= Math.abs(amp) * CELL);
}
assert.strictEqual(shift(1, -3), -93);
assert(Object.is(shift(.1, -1), 0));

// Title slices: contiguous bands 0..100, alternating sides, 1–4 cells, numbered in order.
const sl = slices();
assert.strictEqual(sl.length, 7);
assert.strictEqual(sl[0].t, 0); assert.strictEqual(sl[sl.length - 1].b, 100);
sl.forEach((s, i) => {
  assert(s.b > s.t, 'slice has height');
  if (i) { assert.strictEqual(s.t, sl[i - 1].b, 'slices are contiguous'); assert.strictEqual(Math.sign(s.amp), -Math.sign(sl[i - 1].amp), 'sides alternate'); }
  assert(Math.abs(s.amp) >= 1 && Math.abs(s.amp) <= 4);
  assert.strictEqual(s.n, i + 1);
});
assert.deepStrictEqual(slices(), sl, 'deterministic');

// Serrated fills: points stay in the box, the toothed side zig-zags, the far corner is cut.
for (const side of ['left', 'right', 'top', 'bottom']) {
  const [w, h] = [62, 160], pts = serrate(w, h, side, 10, 7);
  for (const [x, y] of pts) assert(x >= 0 && x <= w && y >= 0 && y <= h, side + ': inside the box');
  const along = side === 'left' || side === 'right' ? h : w;
  assert.strictEqual(pts.length, 4 + 2 * Math.ceil(along / 10), side + ': one zig-zag per tooth');
}
assert.deepStrictEqual(serrate(62, 160, 'left').slice(-1)[0], [0, 0]);

// Scaffold from a layout like the page at 1440 and 1920 wide (and none of the margin at 375).
const layout = (w, right) => ({w, docH: 1468, bar: 41, right,
  head: {left: 120, top: 135, bottom: 312, textRight: 650},
  plates: [{top: 419, bottom: 700, pro: true}, {top: 839, bottom: 1076, pro: false}, {top: 1107, bottom: 1344, pro: false}]});
for (const [w, right] of [[1440, 1132], [1920, 1132], [1280, 1132], [375, 327]]) {
  const L = layout(w, right), list = scaffold(L), nums = list.flatMap(p => p.parts.filter(q => q.t === 'num').map(q => q.n));
  assert.deepStrictEqual(nums, nums.map((_, i) => i + 1), w + ': pieces numbered 1, 2, … in order');
  assert.deepStrictEqual(scaffold(L), list, 'deterministic');
  for (const p of list) {
    assert(Number.isInteger(p.dx) && Number.isInteger(p.dy), 'displacement in whole cells');
    const [x0, , x1] = bounds(p);
    if (['station', 'fan', 'axis', 'arc', 'hang'].includes(p.kind)) {
      // Margin pieces never reach into the content column (baselines start at its edge).
      const solid = {...p, parts: p.parts.filter(q => q.t !== 'h' && q.t !== 'ticks')};
      assert(bounds(solid)[0] >= right, w + ': ' + p.kind + ' stays in the margin');
      assert(p.dx >= 0, 'margin pieces step outward, never over the text');
      assert(x1 <= w + 1e-6 || p.kind === 'arc', w + ': ' + p.kind + ' inside the screen');
    }
    if (p.kind === 'compass') assert(x0 >= L.head.textRight + 20, 'the title compass clears the word');
  }
  const kinds = list.map(p => p.kind);
  assert(kinds.includes('orbit'));
  if (w - right >= 200) {
    assert.strictEqual(kinds.filter(k => k === 'station').length, L.plates.length, 'one station per entry');
    const blocks = list.filter(p => p.kind === 'station').map(p => p.parts.find(q => q.t === 'block'));
    assert.deepStrictEqual(blocks.map(q => !q.ghost), L.plates.map(p => p.pro), 'inked fill only for professional entries');
  } else assert(!kinds.includes('station'), w + ': no margin column when the margin is narrow');
  assert.strictEqual(kinds.includes('arc'), w - right >= 420, 'great circle only in wide margins');
}

// Breakable ring: each click takes the next sixth, counter-clockwise from +x; the dotted arc
// reaches the gap's far end; six clicks empty it; extra clicks are ignored until it regrows.
let st = fresh(), now = 0;
assert.deepStrictEqual(ringAt(st, now), {from: 0, to: TAU, dotted: 0, state: st}, 'whole ring, no dotted arc');
for (let k = 1; k <= 5; k++) {
  st = strike(st, now += 50);
  const r = ringAt(st, now);
  assert.strictEqual(st.broken, k);
  assert(Math.abs(r.from - k * SECTOR) < 1e-9 && r.to === TAU, 'ring keeps the remaining sectors');
  assert(Math.abs(r.dotted - k * SECTOR) < 1e-9, 'dotted arc ends at the gap\'s far end');
}
st = strike(st, now += 50);
assert.strictEqual(st.broken, 6);
assert.strictEqual(st.regen, now + REGEN_WAIT, 'regrowth waits 0.1 s');
assert.strictEqual(strike(st, now + 10), st, 'clicks ignored while empty');
let r = ringAt(st, now + REGEN_WAIT - 1);
assert.strictEqual(r.to - r.from, 0, 'nothing drawn during the pause');
assert.strictEqual(r.dotted, TAU);
r = ringAt(st, now + REGEN_WAIT + REGEN_MS / 2);
assert(r.from === 0 && r.to > 0 && r.to < TAU && r.dotted === r.to, 'regrows counter-clockwise from +x');
r = ringAt(st, now + REGEN_WAIT + REGEN_MS);
assert.deepStrictEqual(r.state, fresh(), 'whole again after one turn');
assert.deepStrictEqual(ringAt(st, now + REGEN_WAIT, true).state, fresh(), 'reduced tier regrows at once');
assert(REGEN_WAIT === 100 && SHARD_MS <= 500);
// Shards: deterministic irregular polygons inside their own sector, drifting outward.
for (let i = 0; i < 6; i++) {
  const s1 = sectorShards(i, 31), s2 = sectorShards(i, 31);
  assert.deepStrictEqual(s1, s2);
  for (const s of s1) {
    assert(s.a >= i * SECTOR && s.a <= (i + 1) * SECTOR, 'shard within its sector');
    assert(s.pts.length >= 4 && s.pts.length <= 6, 'irregular polygon');
    assert(s.drift > 0);
  }
}

// Streak length grows with speed, within bounds.
assert.strictEqual(smear(0), 40);
assert(smear(2) > smear(1));
assert.strictEqual(smear(100), 600);

// Markup: one flood per plate, and the selection rule never uses :focus-within.
const html = fs.readFileSync(path.join(__dirname, '..', 'experience', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'experience', 'experience.css'), 'utf8');
assert.strictEqual((html.match(/<li id="E-\d\d"/g) || []).length, (html.match(/class="fl"/g) || []).length, 'one flood per plate');
assert(!/focus-within/.test(css), 'selection is hover or visible focus only');
assert(/prefers-reduced-motion:reduce[\s\S]*animation:none/.test(css), 'reduced tier drops the stepped flood');
console.log('PASS: experience opening, mosh, reassembly, deconstruction, slices, fills, scaffold, ring, shards, streaks.');
