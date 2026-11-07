// Experience page motion: grid nodes, opening timeline and tear bands, echo, shards, smear.
const assert = require('assert');
const {CELL, NODE, OFF, INTRO_MS, TEAR_MS, TAU, SECTOR, REGEN_WAIT, REGEN_MS, SHARD_MS, node, rng, bands, intro, tearAt, echo, fresh, strike, ringAt, sectorShards, smear} = require('../experience/experience.js');

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
assert.strictEqual(node(93), 93);
assert.strictEqual(node(61), 31);
assert.strictEqual(node(63), 93);

// Deterministic generator.
const a = rng(6), b = rng(6);
for (let i = 0; i < 20; i++) { const x = a(); assert.strictEqual(x, b()); assert(x >= 0 && x < 1); }

// Bands cover the viewport exactly, in order, with bounded delays.
for (const h of [600, 812, 1080]) {
  const list = bands(h);
  assert.strictEqual(list[0].y, 0);
  list.forEach((band, i) => {
    assert(band.h > 0, 'band has height');
    if (i) assert.strictEqual(band.y, list[i - 1].y + list[i - 1].h, 'bands are contiguous');
    assert(band.dir === 1 || band.dir === -1);
    assert(band.delay >= 0 && band.delay <= 260);
  });
  const last = list[list.length - 1];
  assert.strictEqual(last.y + last.h, h, 'bands cover the height');
}

// Opening: draw, one inverted beat, tear; every band gone by TEAR_MS; done at INTRO_MS.
assert.strictEqual(intro(0).circle, 0);
assert(intro(0).invert === false && intro(400).invert === true && intro(500).invert === false);
assert(intro(500).tearing);
for (const band of bands(800)) {
  assert.strictEqual(tearAt(400, band), 0, 'bands wait for the inverted beat');
  assert.strictEqual(tearAt(TEAR_MS, band), 1, 'band gone by TEAR_MS');
  let prev = 0;
  for (let t = 400; t <= TEAR_MS; t += 16) { const k = tearAt(t, band); assert(k >= prev, 'tear only advances'); prev = k; }
}
assert(!intro(INTRO_MS - 1).done && intro(INTRO_MS).done);

// Echo copies start apart and collapse onto the plate.
assert.strictEqual(echo(0, 3), 21);
assert.strictEqual(echo(320, 3), 0);
assert(echo(100, 2) < echo(0, 2));

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
  const a = sectorShards(i, 31), b = sectorShards(i, 31);
  assert.deepStrictEqual(a, b);
  for (const s of a) {
    assert(s.a >= i * SECTOR && s.a <= (i + 1) * SECTOR, 'shard within its sector');
    assert(s.pts.length >= 4 && s.pts.length <= 6, 'irregular polygon');
    assert(s.drift > 0);
  }
}

// Smear length grows with speed, within bounds.
assert.strictEqual(smear(0), 40);
assert(smear(2) > smear(1));
assert.strictEqual(smear(100), 600);
console.log('PASS: experience grid, opening, tear bands, echo, shards and smear.');
