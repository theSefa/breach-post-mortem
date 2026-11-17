# Breach Post-Mortem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shareable one-page toy where a breach statement writes itself from fixed evidence and four dials steer the text that hasn't been written yet.

**Architecture:** A pure, deterministic engine (`breach/engine.js`) turns dial settings + pinned evidence into sentences made of parts, where each claim carries `cites` / `contra` evidence ids. The page (`breach/index.html`) streams those words, freezes everything before the cursor, and replans the rest whenever a dial, pin or scrub changes.

**Tech Stack:** Vanilla JS, SVG, CSS; Node `node:test` for engine tests. No libraries.

**Spec:** `design.md`

## Global Constraints
- Fictional company "Brightwell Mutual"; no real company, breach or threat-group names.
- No offensive tooling content (no phishing text, no exploit steps).
- Single dark theme; works at 400px width without horizontal scroll.
- Text before the cursor is never rewritten.

## Review Focus
- Changing a dial mid-sentence: the in-flight sentence finishes as planned; the change applies from the next sentence.
- Scrubbing back past docked dial tags removes those tags.
- Pinning evidence already cited earlier in the text adds no duplicate admission.
- Dragging a dial after the report is complete shows how to rewrite (no silent no-op).
- Phone width: evidence panel stacks above the report and threads still land.

---

### Task 1: Engine
**Files:** Create `breach/engine.js`, test `breach/engine.test.js`

**Interfaces (Produces):**
- `EVIDENCE: {id, src, text}[]`
- `DIALS: {key, label, stops: string[]}[]` with keys `spin | attacker | blame | legal`
- `stopLabel(key, v: 0..1) -> string`
- `generate(settings, pins: Set<id>, fromBeat: int, alreadyCited: Set<id>) -> Sentence[]`
  where `Sentence = {uid, beat, para: bool, parts: {text, cites: id[], contra: id[], claim: bool}[]}`
- `toWords(sentences) -> Word[]`, `Word = {t, sid, wi, n, beat, para, cites, contra, claim}`
- Works in a browser (`window.BreachEngine`) and in Node (`module.exports`).

- [ ] Tests: deterministic output for equal inputs; every cite/contra id exists in `EVIDENCE`; spin=0 headline has no unsupported/contradicted claim; spin=1 closing contains "very seriously" and is contradicted; pinning `combo` at spin=1 yields a sentence citing `combo`; pinning an id in `alreadyCited` adds nothing; legal=1 ends with the liability disclaimer; `generate(..., fromBeat=5)` starts at beat ≥ 5.
- [ ] Run `node --test breach/` → fail, implement, → pass.

### Task 2: Page
**Files:** Create `breach/index.html` (loads `engine.js`)
- Layout: evidence panel (focus bars per row, click to pin) | report (line numbers, gutter bars, claim underlines, ghost speculation) ; four arc dials; sticky bar with scrub slider + telemetry (w/s, ms, ¶ cursor›spec, pin, steer, unsupported, contradicted, credibility).
- Streaming ~14 words/s; replan on dial input / pin / scrub-back; docked tags at the line where a dial was released.
- SVG threads from the reticle to the evidence rows cited by the current sentence; red to contradicting rows; dangling ╳ for unsupported.
- [ ] Verify in the browser at desktop and 400px: threads land, dials drag, scrub rewinds, no console errors.

### Task 3: Publish
- [ ] Publish `breach/index.html` with `engine.js` as an artifact; open and check it once.
