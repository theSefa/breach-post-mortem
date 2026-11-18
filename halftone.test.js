'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dotField } = require('./halftone');

const full = (cols, rows) => ({ cols, rows, cell: 5, coverage: new Float32Array(cols * rows).fill(1), accentFrom: null });

test('level 0 draws every inked cell, bigger dots for more ink', () => {
  const dots = dotField({ cols: 4, rows: 1, cell: 5, coverage: Float32Array.from([0, .2, .6, 1]), accentFrom: null }, 0);
  assert.equal(dots.length, 3);
  assert.ok(dots[0].r < dots[1].r && dots[1].r < dots[2].r);
  assert.ok(Math.max(...dots.map(d => d.r)) <= 2.5);
});

test('the same seed always gives the same dots', () => {
  assert.deepEqual(dotField(full(20, 6), 2, 7), dotField(full(20, 6), 2, 7));
});

test('higher spin draws fewer dots', () => {
  const n = [0, 1, 2, 3].map(l => dotField(full(40, 10), l).length);
  assert.ok(n[0] > n[1] && n[1] > n[2] && n[2] > n[3] && n[3] > 0, String(n));
});

test('jitter keeps every dot within a cell of its home', () => {
  const g = full(40, 10);
  for (const d of dotField(g, 3)) {
    const cx = (Math.floor(d.x / g.cell) + .5) * g.cell, cy = (Math.floor(d.y / g.cell) + .5) * g.cell;
    assert.ok(Math.abs(d.x - cx) <= g.cell && Math.abs(d.y - cy) <= g.cell);
  }
});

test('accent dots grow with spin and stay in their region', () => {
  // Region starts at column 20, row 4: on one line that is "Different story.", wrapped it is line two.
  const g = { ...full(40, 10), accentFrom: { col: 20, row: 4 } };
  const count = l => dotField(g, l).filter(d => d.accent).length;
  assert.equal(count(0), 0);
  assert.ok(count(3) > count(1), `${count(1)} -> ${count(3)}`);
  for (const d of dotField(g, 3)) if (d.accent) assert.ok(d.x >= 20 * g.cell - g.cell && d.y >= 4 * g.cell - g.cell);
});

test('empty coverage draws nothing', () => {
  assert.deepEqual(dotField({ cols: 10, rows: 3, cell: 5, coverage: new Float32Array(30), accentFrom: null }, 3), []);
});
