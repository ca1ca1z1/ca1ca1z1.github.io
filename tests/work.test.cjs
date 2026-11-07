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
console.log('PASS: work acrostic (' + word + '), slash timing and thread reach.');
