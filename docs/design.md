# Breach Post-Mortem: design

> The original design, written before the build. A few details changed on the way: variants are picked by dial level rather than scored, there is no PRNG, and it ships as a static site. The [README](../README.md) and [how-it-works](how-it-works.md) describe what was actually built.

## Intent
A showpiece, built to be shared, that takes the interaction ideas from
far___behind's "Realtime LLM Vector Steering" reel and points them at
cybersecurity. It should be funny to people in security and readable in the
first few seconds. The joke: you watch a breach report drift away from what
the logs actually say as you turn the spin dial up.

## Goals
- A live incident report "writes itself" from a fixed set of evidence.
- All four mechanisms from the reel, plus one twist:
  1. **Focus monitor**: gutter bars show how strongly each report line rests on evidence.
  2. **Attention lock**: click an evidence line to pin it, and the report has to account for it from then on.
  3. **Vector steering**: radial dials reshape the text after the cursor.
  4. **Scrubbing**: drag the timeline back to rewind and pick a different future.
  5. **Twist, unsupported claims**: claims with no evidence get a dangling red thread and an UNSUPPORTED tag.
- Feels instant: no waiting, smooth at 60 FPS.
- One link that anyone can open. Usable on a phone, best on desktop.

## Non-goals
- No live LLM, real logs, or real threat intel. Accuracy doesn't matter.
- No user-supplied evidence (fixed scenario).

## Anti-goals (a failure even if it works)
- Naming or mocking a real company, a real breach, or a real threat group.
- Anything that works as offensive tooling (no phishing or exploit text).
- Jokes that only land after reading instructions.

## Scenario (my call)
Fictional company **Brightwell Mutual**. Contractor `jsmith` reused the
password `Summer2024!`, which was already in a public 2024 combolist, on a legacy VPN
with no MFA. The attacker logged in from a residential IP, ran `rclone`, and
exfiltrated 41 GB to a storage bucket. It was detected 11 days later when a
customer posted about it. Around 8–10 log lines (auth, VPN, EDR, proxy,
ticketing) form the evidence panel, each with an id like `vpn.log:4471`.

## Dials (my call)
| Dial | Low end | High end |
|---|---|---|
| Spin | plainly transparent | "we take your security very seriously" |
| Attacker | contractor reused a password | highly sophisticated, likely state-sponsored |
| Blame | us | the intern / a third-party vendor |
| Legal review | none | maximal hedging ("may have potentially") |

Each dial is a radial arc with a draggable bead and a percentage readout,
modeled on the reel. Committed settings dock as small tags at the line where
they took effect.

## Approaches considered
- **Simulated model, single page (picked).** Instant, works the same way every
  time, no key, shareable. The trade-off: the text comes from authored
  variants, not open-ended generation.
- Live LLM via API: real generation, but it adds latency (which works against
  the premise), costs money, needs a key and a backend, and won't behave the
  same twice.
- Video or animation only: the easiest to make look good, but you can't
  interact with it, and interacting is the point.

## How it works (builder notes)
- **Generator**: the report is a sequence of beats (summary, timeline, initial
  access, attacker, impact, response, apology). Each beat has a bank of
  sentence variants scored against the dial positions and the pinned evidence.
  Each variant lists the evidence ids it cites; an empty list means
  unsupported. A seeded PRNG makes the same settings give the same text.
- **Streaming**: words appear at a steady rate with simulated latency. A
  speculation buffer runs ahead of the cursor. Changing a dial or a pin throws
  away everything after the cursor and cancels the pending work. The text
  before the cursor is never rewritten.
- **Threads**: SVG curves run from the cursor reticle to the evidence lines
  that the current sentence cites. Unsupported sentences get a red thread that
  ends in ╳.
- **Pinning**: a pinned line raises the score of variants that cite it. For
  example, pin the password log and even a max-spin release has to admit
  `Summer2024!`, grudgingly.
- **Scrubbing**: a timeline slider. Dragging back truncates the visible text,
  and dragging forward replays the committed text before generation resumes.
- **Telemetry bar**: w/s, ms, ¶ cursor›speculated, pin, steer, and a running
  count of unsupported claims.

## Look (my call)
A dark, instrument-like terminal: monospace, hairline guides, one alert color
for unsupported claims and one for steering. It's deliberately a single dark
theme. It's related to the reel's style without copying it.

## Left to the builder
Exact copy for each variant, the palette, the fonts, and the layout breakpoints.

## Deliverable
A single HTML file (vanilla JS, no libraries), published as an artifact.
