// Record page motion: opening timeline, altitude ruler, diamond rings, arc swing.
const assert = require('assert');
const {CELL, METRES, INTRO_MS, snap, altitude, diamond, veil, sweep, approach} = require('../record/record.js');

assert.strictEqual(CELL, 31, 'ruler matches the entrance cell');
assert(INTRO_MS <= 2000, 'opening stays under 2 s');

// Opening: covered at t=0, open and finished by INTRO_MS; panels only shrink, in whole cells.
for (const h of [600, 812, 1000, 1441]) {
  const first = veil(0, h);
  assert(first.panel * 2 >= h, 'frame starts closed');
  assert.strictEqual(first.ruler, 0);
  let prev = first.panel;
  for (let t = 0; t <= INTRO_MS; t += 16) {
    const v = veil(t, h);
    assert.strictEqual(v.panel % CELL, 0, 'panels move in whole cells');
    assert(v.panel <= prev, 'panels only open');
    assert(v.line >= 0 && v.line <= 1 && v.lineAlpha >= 0 && v.lineAlpha <= 1);
    prev = v.panel;
  }
  const end = veil(INTRO_MS, h);
  assert.deepStrictEqual([end.panel, end.ruler, end.lineAlpha, end.done], [0, 1, 0, true], 'opening ends clean');
  assert(!veil(INTRO_MS - 1, h).done);
}

// Ruler: whole cells, 10 m each, counted up from the bottom of the page, never negative.
assert.strictEqual(snap(0), 0);
assert.strictEqual(snap(30.9), 0);
assert.strictEqual(snap(31), 31);
assert.strictEqual(snap(-1), -31);
assert.strictEqual(altitude(3100, 3100), '0000');
assert.strictEqual(altitude(0, 3100), String(100 * METRES).padStart(4, '0'));
assert.strictEqual(altitude(3100 - 31, 3100), '0010');
assert.strictEqual(altitude(5000, 3100), '0000');
assert(Number(altitude(100, 3100)) > Number(altitude(800, 3100)), 'higher on the page reads higher');

// Diamonds: Manhattan rings — every vertex exactly R cells from the centre.
for (const R of [1, 3, 6]) {
  const v = diamond(100, 200, R);
  assert.strictEqual(v.length, 4);
  for (const [x, y] of v) assert.strictEqual(Math.abs(x - 100) + Math.abs(y - 200), R * CELL);
  assert(v[0][1] < 200 && v[1][0] > 100 && v[2][1] > 200 && v[3][0] < 100, 'top, right, bottom, left');
}

// Arc swing grows with scroll; easing settles exactly.
assert.strictEqual(sweep(0), 0);
assert(sweep(2000) > sweep(1000));
let a = 0, n = 0;
while (a !== 1 && n < 400) { a = approach(a, 1, .12, .0005); n++; }
assert.strictEqual(a, 1, 'approach reaches its goal');
console.log('PASS: record opening, ruler, diamonds and swing.');
