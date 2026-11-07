// Capability page: CRT opening, traces, ping, ruler readout; HUD counts match the page.
const assert = require('assert'), fs = require('fs'), path = require('path');
const {GRID, INTRO_MS, CRT_MS, PING_MS, snap, crt, route, traceAt, ping, readout} = require('../capability/capability.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'capability', 'index.html'), 'utf8');

assert(INTRO_MS <= 2000, 'opening stays under 2 s');
assert(CRT_MS < INTRO_MS);

// CRT: line first, then the picture opens; done at CRT_MS.
assert.deepStrictEqual(crt(0), {line: 0, open: 0, done: false});
assert(crt(130).line > .9 && crt(130).open < .2, 'line before the opening');
assert.strictEqual(crt(CRT_MS).open, 1); assert(crt(CRT_MS).done);

// Route: orthogonal, starts at the pointer, ends at the port, vertical run on the grid.
for (const [ax, ay, bx, by] of [[100, 100, 600, 400], [900, 50, 300, 700], [10, 10, 40, 10]]) {
  const p = route(ax, ay, bx, by);
  assert.deepStrictEqual(p[0], [ax, ay]); assert.deepStrictEqual(p[p.length - 1], [bx, by]);
  for (let i = 1; i < p.length; i++) assert(p[i][0] === p[i - 1][0] || p[i][1] === p[i - 1][1], 'orthogonal');
  assert.strictEqual(p[1][0] % GRID, 0, 'vertical run on the grid');
}
assert.strictEqual(snap(13), 16); assert.strictEqual(snap(11), 8);

// Opening traces: wait, draw in order of column, fade before the opening ends.
assert.strictEqual(traceAt(600, 0).k, 0);
assert(traceAt(900, 0).k > traceAt(900, 2).k, 'columns in order');
assert.strictEqual(traceAt(1600, 0).alpha, 0);

// Ping: dots first, the ring steps outward in whole grid steps, then it is gone.
assert(ping(0).dots && ping(0).r === 0);
const rs = [100, 150, 200, 250].map(t => ping(t).r);
rs.forEach((r, i) => { assert.strictEqual((r - 12) % GRID, 0); if (i) assert(r >= rs[i - 1]); });
assert.strictEqual(ping(PING_MS), null);

// Ruler readout.
assert.strictEqual(readout(0), '000'); assert.strictEqual(readout(800), '100'); assert.strictEqual(readout(-50), '000');

// HUD readouts are counts of what the page shows.
const n = re => [...html.matchAll(re)].length;
const hud = Object.fromEntries([...html.matchAll(/<p><span>([A-Z]+)<\/span><b>(\d+)<\/b><\/p>/g)].map(m => [m[1], Number(m[2])]));
assert.strictEqual(hud.DOMAINS, n(/<section class="dom"/g), 'domains');
assert.strictEqual(hud.SKILLS, n(/class="mod"/g), 'skills');
assert.strictEqual(hud.LINKS, n(/<a class="chip" href=/g), 'evidence links');
console.log('PASS: capability CRT, traces, ping, readout and HUD counts.');

// Cross-reference matches the modules: each code lists exactly the skills whose modules cite it,
// and every cited code has a row.
{
  const mods = [...html.matchAll(/<li class="mod"[^>]*><h3>([^<]+)<\/h3><p class="ev">([\s\S]*?)<\/p><\/li>/g)]
    .map(m => ({skill: m[1], codes: [...m[2].matchAll(/<a class="chip" href="[^"]+">([^<]+)<\/a>/g)].map(c => c[1])}));
  const rows = [...html.matchAll(/<li class="link" data-code="([^"]+)"><a class="code" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<ul class="to">([\s\S]*?)<\/ul><\/li>/g)]
    .map(m => ({code: m[1], href: m[2], label: m[3], skills: [...m[4].matchAll(/<li>([^<]+)<\/li>/g)].map(s => s[1])}));
  const cited = [...new Set(mods.flatMap(m => m.codes))].sort();
  assert.deepStrictEqual(rows.map(r => r.code).sort(), cited, 'one row per cited evidence code');
  for (const r of rows) {
    assert.strictEqual(r.label, r.code);
    assert(r.href.endsWith('#' + r.code), r.code + ': links to its own entry');
    assert.deepStrictEqual(r.skills, mods.filter(m => m.codes.includes(r.code)).map(m => m.skill), r.code + ': skills match the modules');
  }
  console.log('PASS: capability cross-reference matches the modules (' + rows.length + ' codes).');
}
