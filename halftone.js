/* Halftone dot field: a coverage grid (how much ink sits in each cell) plus a spin level
   becomes a list of round dots. Spin thins the dots out, shrinks them and nudges them off the
   grid, and turns a growing share of the accent region amber. Pure and deterministic: the same
   seed gives the same dots, so the headline never flickers. */
(function (root) {
  'use strict';

  // Integer hash -> [0, 1). Cheap, stable across runs, no Math.random.
  function noise(i, seed) {
    let h = (i * 374761393 + seed * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // Piecewise-linear lookup for fractional levels (0..3) during the ease.
  function lerpStops(stops, level) {
    const l = Math.max(0, Math.min(stops.length - 1, level)), i = Math.min(stops.length - 2, Math.floor(l));
    return stops[i] + (stops[i + 1] - stops[i]) * (l - i);
  }
  const DROPOUT = [0, .08, .18, .3];
  const ACCENT = [0, .08, .2, .35];
  const INK = 0.04;   // below this a cell is paper, not ink

  // accentFrom: {col, row} — cells right of col on rows at or below row can turn accent; null for none.
  function dotField({ cols, rows, cell, coverage, accentFrom = null }, level, seed = 1) {
    const drop = lerpStops(DROPOUT, level), accent = lerpStops(ACCENT, level);
    const shrink = 1 - 0.08 * level, wobble = cell * 0.22 * level / 3;
    const dots = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col, c = coverage[i];
        if (!(c > INK)) continue;
        if (noise(i, seed) < drop) continue;
        const r = cell / 2 * Math.sqrt(Math.min(1, c)) * shrink;
        const x = (col + .5) * cell + (noise(i, seed + 101) - .5) * 2 * wobble;
        const y = (row + .5) * cell + (noise(i, seed + 202) - .5) * 2 * wobble;
        dots.push({ x, y, r, accent: !!accentFrom && col >= accentFrom.col && row >= accentFrom.row && noise(i, seed + 303) < accent });
      }
    }
    return dots;
  }

  const api = { dotField };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Halftone = api;
})(typeof window !== 'undefined' ? window : globalThis);
