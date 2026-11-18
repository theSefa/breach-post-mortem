# Halftone Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the hero headline as live halftone dots that break down with spin, and move display text to Montserrat.

**Architecture:** A pure, testable `halftone.js` (UMD like `engine.js`) turns a coverage grid plus spin level into a dot list. `index.html` rasterises the headline to an offscreen canvas, samples coverage per cell, calls `dotField`, and paints dots on a visible canvas. CSS swaps `--label` to Montserrat and adds a dot-fade band under the header.

**Tech Stack:** Vanilla JS, Canvas 2D, `node --test`, Google Fonts.

**Spec:** `docs/superpowers/specs/2026-11-18-halftone-restyle-design.md`

## Global Constraints
- Accent stays `--steer: #f2a73b`; `--alert` red stays for contradicted.
- JetBrains Mono stays for logs, statement and telemetry. Threads and layout unchanged.
- Real headline text stays in the DOM; the canvas is `aria-hidden="true"`.
- No constant animation loop: redraw only on resize, font load, spin change (plus one ease of at most 400 ms).
- `prefers-reduced-motion: reduce` skips the ease.
- No new runtime dependencies; fonts only from Google Fonts.

## Review Focus
- Phone width (375 px): the headline wraps onto two lines inside the canvas, never clips or scrolls sideways.
- Font not loaded at first paint: headline redraws once `document.fonts.ready` resolves, so no fallback-font dots stay on screen.
- DPR 2 and 3: dots stay crisp (canvas backing store scaled by `devicePixelRatio`).
- Spin dragged quickly through all stops mid-ease: final frame matches the final level, no stale frame.
- Level 0 legibility: every inked cell of the glyphs gets a dot.

---

### Task 1: `halftone.js` dot field

**Files:**
- Create: `halftone.js`
- Test: `halftone.test.js`
- Modify: `package.json` (add `halftone.test.js` to `test`)

**Interfaces:**
- Produces: `dotField({cols, rows, cell, coverage, accentFrom}, level, seed = 1) -> Array<{x, y, r, accent}>`
  - `coverage`: `Float32Array(cols*rows)` of 0..1, row-major.
  - `level`: 0..3 (may be fractional during the ease).
  - `accentFrom`: column index; only cells at or after it can be accent. `Infinity` for none.
  - `x, y`: dot centre in css px; `r`: radius in css px.
  - Exposed as `window.Halftone.dotField` in the browser, `module.exports.dotField` in node.

- [ ] **Step 1: Write the failing tests** in `halftone.test.js`:
  - `level 0 draws every inked cell`: 4x1 grid, coverage `[0, .2, .6, 1]` → 3 dots; radii strictly increase; max `r <= cell/2`.
  - `deterministic for a seed`: same args twice → deep-equal output.
  - `higher spin draws fewer dots`: 40x10 grid of coverage 1 → `len(L0) > len(L1) > len(L2) > len(L3) > 0`.
  - `jitter stays inside the cell`: level 3, every dot within `cell` of its cell centre.
  - `accent grows with spin and stays in its region`: `accentFrom=20` on 40x10 full grid → accent count at L0 is 0, L3 > L1; every accent dot has `x >= 20*cell`.
  - `empty coverage draws nothing`: all zeros → `[]`.
- [ ] **Step 2:** `npm test` → halftone tests FAIL (module missing).
- [ ] **Step 3: Implement `dotField`.** Hash noise `n(i, seed)` in [0,1) (integer hash, no `Math.random`). Per cell with coverage `c > 0.04`: drop if `n < dropout(level)` where dropout = `[0, .12, .28, .45]` interpolated; radius `= cell/2 * sqrt(c) * (1 - 0.12*level)`; offset `= (n2 - .5) * cell * 0.35 * level/3` per axis; accent if column `>= accentFrom` and `n3 < [0, .06, .14, .24]` interpolated.
- [ ] **Step 4:** `npm test` → all pass.
- [ ] **Step 5: Commit** `Add halftone dot field for the headline`.

### Task 2: Canvas headline

**Files:**
- Modify: `index.html` (hero markup ~line 202, CSS ~line 168, script after `updateLab` ~line 748, `<script src>` ~line 238)

**Interfaces:**
- Consumes: `Halftone.dotField` from Task 1.
- Produces: `drawHeadline(level)` in the page script; called from `updateLab()`, on resize (rAF-throttled) and on `document.fonts.ready`.

- [ ] **Step 1:** Markup: `<h1 class="dot-h1"><span class="sr-only">Same breach. Different story.</span><canvas id="headline" aria-hidden="true"></canvas></h1>`; add `.sr-only` utility; load `halftone.js` before the page script.
- [ ] **Step 2:** Implement `drawHeadline(level)`: canvas width = h1 width; font `900 Npx Montserrat` with N = `clamp(34, 5.4vw, 64)`; greedy wrap of the words to the width; offscreen canvas at 1x css, `fillText`, read `getImageData`, average alpha per `cell` (5 px desktop, 4 px under 560 px) into coverage; `accentFrom` = first column of "Different"; paint dots (`--fg`, accent dots `--steer`) on the visible canvas scaled by `devicePixelRatio`.
- [ ] **Step 3:** Ease: when level changes, animate the fractional level from old to new over 350 ms with rAF, cancelling any running ease; reduced motion jumps straight to the target.
- [ ] **Step 4: Verify** in the preview at 1280 and 375 px, DPR 2: crisp dots, two-line wrap on phone, no horizontal scroll, level 3 visibly broken but readable, rapid drag ends on the right frame, console clean.
- [ ] **Step 5: Commit** `Draw the headline as halftone dots that break down with spin`.

### Task 3: Montserrat and print texture

**Files:**
- Modify: `index.html` (font `<link>` line 18, `--label` line 33, header CSS)

- [ ] **Step 1:** Google Fonts link: `Montserrat:wght@600;800;900` + JetBrains Mono (drop Plex). `--label: 'Montserrat', 'Arial Narrow', system-ui, sans-serif;` Brand and section labels 800, buttons and stamps 600; tighten letter-spacing to `.08em`.
- [ ] **Step 2:** Dot-fade band: `header.top` gets a 14 px tall `::after` with a `radial-gradient` dot pattern masked by a left-to-right `linear-gradient`, in `--faint`.
- [ ] **Step 3: Verify** at 1280 and 375 px: labels fit (no wrapped buttons, dial captions still fit), band visible but quiet. `npm test` passes.
- [ ] **Step 4: Commit** `Move display text to Montserrat; add halftone band`.

### Task 4: Refresh images and demo, ship

- [ ] **Step 1:** `node AI_Video_editor/Projects/04-breach-postmortem/capture/stills.mjs <tmp>` → copy `preview.png`, scaled `og.png` into `docs/`; view both.
- [ ] **Step 2:** Re-record with `record.mjs`, encode to `drafts/breach-demo-1080.mp4`, review a contact sheet; on approval write `Exports/04-breach-postmortem-demo-v2.mp4`.
- [ ] **Step 3:** Branch, PR, merge, confirm Pages build and live page.
