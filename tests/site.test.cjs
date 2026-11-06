// Structural checks for index.html: entrance hooks, anchors and evidence codes agree.
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

// The entrance animation relies on these hooks.
for (const hook of ['class="entrance"', 'class="entrance-canvas"', 'class="shell"', 'id="main"'])
  assert(html.includes(hook), 'missing entrance hook ' + hook);

// Every in-page link resolves.
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) if (id) assert(ids.has(id), 'broken anchor #' + id);

// Entry codes are unique, sequential per prefix, and match their visible label.
const entries = [...html.matchAll(/<details class="row" id="([PE])-(\d\d)"[^>]*>\s*<summary><code>([^<]+)<\/code>/g)];
assert(entries.length > 0);
for (const prefix of ['P', 'E']) {
  const numbers = entries.filter(e => e[1] === prefix).map(e => Number(e[2]));
  numbers.forEach((n, i) => assert.strictEqual(n, i + 1, prefix + ' codes must run 01, 02, …'));
}
for (const [, prefix, n, labelText] of entries) assert.strictEqual(labelText, prefix + '-' + n);

// Every section id has a nav link and vice versa.
const sectionIds = [...html.matchAll(/<section id="([^"]+)" class="sheet"/g)].map(m => m[1]);
const navIds = [...html.matchAll(/<nav[\s\S]*?<\/nav>/g)][0][0].match(/#[\w-]+/g).map(h => h.slice(1));
assert.deepStrictEqual(navIds, sectionIds);

console.log('PASS: entrance hooks, anchors, entry codes and navigation agree.');
