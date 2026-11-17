const test = require('node:test');
const assert = require('node:assert');
const E = require('./engine.js');

const S = (o = {}) => ({ spin: 0.5, attacker: 0.5, blame: 0.5, legal: 0.5, ...o });
const all = (sents) => sents.flatMap((s) => s.parts);
const text = (sents) => sents.map((s) => s.parts.map((p) => p.text).join('')).join(' ');
const ids = new Set(E.EVIDENCE.map((e) => e.id));

test('deterministic for equal inputs', () => {
  const a = E.generate(S(), new Set(['mfa']), 0, new Set());
  const b = E.generate(S(), new Set(['mfa']), 0, new Set());
  assert.deepStrictEqual(text(a), text(b));
});

test('every cite and contra id exists in EVIDENCE', () => {
  for (const v of [0, 0.33, 0.66, 1]) {
    const sents = E.generate(S({ spin: v, attacker: v, blame: v, legal: v }), new Set(ids), 0, new Set());
    for (const p of all(sents)) for (const id of [...p.cites, ...p.contra]) assert.ok(ids.has(id), id);
  }
});

test('candid headline is fully supported', () => {
  const [head] = E.generate(S({ spin: 0 }), new Set(), 0, new Set());
  assert.strictEqual(head.beat, 0);
  for (const p of head.parts.filter((p) => p.claim)) assert.ok(p.cites.length && !p.contra.length);
});

test('max spin closes with a contradicted "very seriously"', () => {
  const sents = E.generate(S({ spin: 1, legal: 0 }), new Set(), 0, new Set());
  const last = sents[sents.length - 1];
  const claim = last.parts.find((p) => /very seriously/.test(p.text));
  assert.ok(claim, text([last]));
  assert.ok(claim.contra.length > 0);
});

test('pinning combo at max spin forces an admission citing it', () => {
  const sents = E.generate(S({ spin: 1, attacker: 1 }), new Set(['combo']), 0, new Set());
  assert.ok(all(sents).some((p) => p.cites.includes('combo')));
  assert.match(text(sents), /Summer2024!/);
});

test('pin already cited earlier adds no admission', () => {
  const without = E.generate(S({ spin: 1 }), new Set(), 3, new Set(['combo']));
  const withPin = E.generate(S({ spin: 1 }), new Set(['combo']), 3, new Set(['combo']));
  assert.strictEqual(text(withPin), text(without));
});

test('maximal legal ends with the liability disclaimer', () => {
  const sents = E.generate(S({ legal: 1 }), new Set(), 0, new Set());
  assert.match(text([sents[sents.length - 1]]), /admission of liability/);
});

test('fromBeat skips earlier beats', () => {
  const sents = E.generate(S(), new Set(), 5, new Set());
  assert.ok(sents.every((s) => s.beat >= 5));
});

test('stopLabel maps ends of each dial', () => {
  assert.strictEqual(E.stopLabel('spin', 1), 'very seriously');
  assert.strictEqual(E.stopLabel('blame', 0), 'us');
});

test('toWords splits parts into words keeping claim metadata', () => {
  const words = E.toWords(E.generate(S({ spin: 0 }), new Set(), 0, new Set()));
  assert.ok(words.length > 150);
  const w = words.find((w) => w.t.includes('Summer2024!'));
  assert.ok(w && w.claim && w.cites.includes('combo'));
  assert.ok(words.every((w) => w.t.length > 0));
});

test('admissions never precede the headline', () => {
  const sents = E.generate(S({ spin: 1 }), new Set(['ceo']), 0, new Set());
  assert.ok(sents[0].head);
  assert.strictEqual(sents[1].admit, 'ceo');
  assert.strictEqual(Math.floor(sents[1].beat) + 1, 1);
});
