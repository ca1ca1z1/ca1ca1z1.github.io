// Work page: the acrostic index matches the cards and spells its word on one spine; slash timing;
// thread reach.
const assert = require('assert'), fs = require('fs'), path = require('path');
const {INTRO_MS, SLASH_MS, REACH, spine, split, slashAt, nearest} = require('../work/work.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'work', 'index.html'), 'utf8');

assert(INTRO_MS <= 2000, 'opening stays under 2 s');

// spine(): nearest-the-middle occurrence, case-insensitive, never a space.
assert.strictEqual(spine('abcba', 'b'), 1);
assert.strictEqual(spine('Untitled', 'E'), 6);
assert.strictEqual(spine('xyz', 'q'), -1);
assert.deepStrictEqual(split('HR Reporting Automation', 'A'), ['HR Reporting ', 'A', 'utomation']);
assert.strictEqual(split('abc', 'q'), null);

// The page: every row is its card's title split on the spine letter, and the keys spell the word.
const word = html.match(/class="acro"[^>]*data-word="([A-Z]+)"/)[1];
const rows = [...html.matchAll(/<a class="row" href="#(P-\d\d)"[^>]*><span class="pre">([^<]*)<\/span><span class="key">([^<]*)<\/span><span class="post">([^<]*)<\/span><\/a>/g)];
const titles = Object.fromEntries([...html.matchAll(/<article id="(P-\d\d)"[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(m => [m[1], m[2]]));
assert.strictEqual(rows.length, Object.keys(titles).length, 'one acrostic row per card');
assert.strictEqual(rows.length, word.length, 'the word has one letter per row');
rows.forEach(([, id, pre, key, post], r) => {
  assert(titles[id], 'row links to a card: ' + id);
  assert.strictEqual(pre + key + post, titles[id], id + ': row text equals the card title');
  assert.deepStrictEqual([pre, key, post], split(titles[id], word[r]), id + ': split on the spine letter ' + word[r]);
});
assert.strictEqual(rows.map(r => r[3]).join('').toUpperCase(), word, 'keys spell the word');

// Slash: two strokes drawn in turn, then fade; the reduced tier shows it whole and still.
assert.deepStrictEqual(slashAt(0), {a: 0, b: 0, alpha: 1});
const mid = slashAt(120);
assert(mid.a === 1 && mid.b > 0 && mid.b < 1 && mid.alpha === 1, 'second stroke follows the first');
assert(slashAt(450).alpha < 1 && slashAt(450).alpha > 0, 'then fades');
assert.strictEqual(slashAt(SLASH_MS), null);
assert.deepStrictEqual(slashAt(10, true), {a: 1, b: 1, alpha: 1});
assert.strictEqual(slashAt(400, true), null);

// Thread: nearest pin within reach only.
const pins = [{x: 0, y: 0}, {x: 100, y: 0}];
assert.strictEqual(nearest(90, 0, pins), 1);
assert.strictEqual(nearest(5000, 0, pins), -1);
assert(REACH > 0);
// Scroll: the index dissolves as it leaves the top — rows in arrival order, red letters last.
const {acroProgress, leaveRow, leaveKey, sway} = require('../work/work.js');
assert.strictEqual(acroProgress(400, 300), 0, 'whole while below the lead line');
assert.strictEqual(acroProgress(-300, 300), 1, 'gone once scrolled past');
for (let p = 0; p <= 1.0001; p += .05) {
  for (let o = 1; o < 4; o++) assert(leaveRow(p, o) <= leaveRow(p, o - 1), 'later rows leave later');
  assert(leaveKey(p) <= leaveRow(p, 3), 'red letters leave last');
}
assert.strictEqual(leaveRow(0, 0), 0); assert.strictEqual(leaveRow(1, 3), 1); assert.strictEqual(leaveKey(1), 1);
// Board sway: straight-ish at the centre, more tilt and drift away from it, symmetric, bounded.
assert.deepStrictEqual(sway(0), {tilt: 1, drift: 0});
assert(sway(.5).tilt > sway(.2).tilt && sway(-.5).tilt === sway(.5).tilt);
assert.strictEqual(sway(5).tilt, sway(1).tilt, 'clamped');
assert(sway(.5).drift < 0 && sway(-.5).drift > 0, 'drifts against the offset');
console.log('PASS: work acrostic (' + word + '), slash timing, thread reach and scroll effects.');

// The wall: deterministic, both margins, every item reachable within the scroll range, glyphs spell the word.
{
  const {wallItems, entering} = require('../work/work.js');
  const a = wallItems(900, 2000), b = wallItems(900, 2000);
  assert.deepStrictEqual(a, b, 'deterministic');
  assert(a.length > 8 && a.length <= 60, 'bounded count');
  assert(a.some(i => i.side < 0) && a.some(i => i.side > 0), 'both margins');
  for (const it of a) {
    assert(it.depth >= .35 && it.depth <= .85 && it.u >= .15 && it.u <= .85);
    assert(it.y <= 900 + 2000 * it.depth + 80, 'reachable: on screen at some scroll position');
  }
  const letters = a.filter(i => i.kind === 'glyph').map(i => i.letter).join('');
  assert.strictEqual(letters, 'MADE'.repeat(4).slice(0, letters.length), 'glyphs spell the word in turn');
  assert.strictEqual(entering(1000, 900), 0, 'below the screen: hidden');
  assert.strictEqual(entering(400, 900), 1, 'well inside: whole');
  assert(entering(800, 900) > 0 && entering(800, 900) < 1, 'fading in at the bottom edge');
  console.log('PASS: work wall layout.');
}
