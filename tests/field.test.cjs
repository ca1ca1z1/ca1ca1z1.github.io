// Home background geometry: ring wave ordering and pointer → cell mapping.
const assert = require('assert');
const field = require('../field.js');
const {ring, cellAt, CELL} = field;

for (const R of [0, 1, 3, 7]) {
  const cells = ring(5, -2, R);
  assert.strictEqual(cells.length, 2 * R * R + 2 * R + 1, 'ring size for R=' + R);
  const keys = new Set(cells.map(c => c.c + ',' + c.r));
  assert.strictEqual(keys.size, cells.length, 'ring cells are unique');
  cells.forEach((c, i) => {
    assert.strictEqual(Math.abs(c.c - 5) + Math.abs(c.r + 2), c.d, 'd is Manhattan distance');
    if (i) assert(c.d >= cells[i - 1].d, 'nearest first');
  });
}
assert.strictEqual(CELL, 31, 'lattice matches the entrance cell');
assert.deepStrictEqual(cellAt(0, 0, 0, 0), {c: 0, r: 0});
assert.deepStrictEqual(cellAt(30.9, 31, 0, 0), {c: 0, r: 1});
assert.deepStrictEqual(cellAt(10, 10, 15, -31), {c: -1, r: 1});
console.log('PASS: field ring wave and cell mapping.');
