// Experience page motion: grid nodes, opening timeline and tear bands, echo, shards, smear.
const assert = require('assert');
const {CELL, NODE, OFF, INTRO_MS, TEAR_MS, HALO, HALO_MS, HALO_SOLID, node, rng, bands, intro, tearAt, echo, haloPhase, shards, smear} = require('../experience/experience.js');

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

// Halo: short (well under a second) — a solid beat, then the shatter, then gone.
assert(HALO_MS <= 600, 'click answer stays short');
assert.strictEqual(haloPhase(0), 'solid');
assert.strictEqual(haloPhase(HALO_SOLID - 1), 'solid');
assert.strictEqual(haloPhase(HALO_SOLID), 'shatter');
assert.strictEqual(haloPhase(HALO_MS - 1), 'shatter');
assert.strictEqual(haloPhase(HALO_MS), null);
assert.strictEqual(haloPhase(-1), null);
// Shards: deterministic irregular polygons, all within the crumbled (left) arc, drifting outward.
const s1 = shards(), s2 = shards();
assert.deepStrictEqual(s1, s2);
for (const s of s1) {
  assert(s.a >= HALO.gap[0] && s.a <= HALO.gap[1], 'shard sits in the gap');
  assert(s.pts.length >= 4 && s.pts.length <= 6, 'irregular polygon');
  assert(s.drift > 0);
}

// Smear length grows with speed, within bounds.
assert.strictEqual(smear(0), 40);
assert(smear(2) > smear(1));
assert.strictEqual(smear(100), 600);
console.log('PASS: experience grid, opening, tear bands, echo, shards and smear.');
