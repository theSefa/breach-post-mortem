# Halftone restyle — short design

## Why
The page works but looks like a generic dark dashboard. Sefa wants it to feel like his halftone-mono Pinterest board and his THESEFAWAY work: "more interesting, more ours", before it goes on LinkedIn.

## Goals
- The headline "Same breach. Different story." is drawn as halftone dots, like printed dot-matrix poster type.
- The headline reacts to spin: crisp and dense at candid, dots thinning, jittering and dropping out as spin rises. The type loses integrity alongside the statement.
- Display text (header brand, eyebrows, section labels, buttons, stamps) moves from IBM Plex Sans Condensed to Montserrat, heavier and with more character.

## Non-goals / keep as is
- JetBrains Mono stays for the evidence logs, the statement and telemetry.
- The threads, wiring, crosshair and layout stay unchanged.
- The amber accent `#f2a73b` stays (Sefa's call). Red stays for "contradicted".
- No change to engine, verifier or server.

## Anti-goals
- A headline that is hard to read at candid, or that blurs on phones or retina.
- Losing the real text for screen readers or search.
- Animation that runs constantly and burns CPU.

## Approaches considered
1. **Live canvas dots (picked).** Render the headline in Montserrat Black to a hidden canvas, sample coverage on a grid, and draw round dots sized by coverage. Sharp at any width and DPR, reacts smoothly to spin, no new files.
2. Dot-matrix web font (for example Doto). Least work, but it is a uniform LED grid rather than halftone print, and spin can only nudge weight.
3. Pre-rendered images per spin level. Pixel-perfect, but bad on narrow screens, adds assets and cannot animate.

## Decided
- Canvas headline, with the real `<h1>` text kept in the DOM (visually hidden) and the canvas `aria-hidden`.
- Montserrat from Google Fonts (weights 600, 800, 900) replaces `--label`.
- Amber accent unchanged.

## My calls (correct any)
- Dots are off-white (`--fg`). "Different story." gets a few amber dots that grow in number with spin, so the accent marks where the story drifts.
- The dot cell is about 5 css px on desktop and scales with headline size. It redraws on resize, font load and spin changes only (plus a short ease between levels), never in a constant loop. `prefers-reduced-motion` gets the end state without the ease.
- Spin effect: at level 0 dots are clean; each level adds dropout (deterministic noise, so it doesn't flicker), positional jitter and smaller dots.
- A thin halftone dot-fade band under the header gives the page a print texture without touching the content areas.
- After the restyle, the README screenshot, the link card and the LinkedIn demo video are regenerated with the existing scripts.

## Left to the builder
Exact grid maths, noise function, ease timing, and Montserrat weight per element.
