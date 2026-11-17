# How Breach Post-Mortem works

A plain-English walkthrough of the whole thing, from the evidence to the threads on screen.

## The big idea

A real breach notice is written backwards: the conclusion ("we take your security very seriously") is decided first, and the facts are fitted around it. This app makes that visible. Every claim the statement makes is linked to the evidence behind it, so when you turn up the spin you can *see* the claims come loose from the facts.

There's no AI model inside. That's deliberate: a scripted engine is instant, costs nothing to run, works offline and behaves the same for everyone. The "generation" is simulated, but the interaction is real.

## The two files

| File | Job |
|---|---|
| `engine.js` | Decides **what** gets written. It has no idea there's a screen. |
| `index.html` | Decides **how** it's shown: pacing, threads, dials, timeline, telemetry. |

Keeping them apart is why the engine can be tested on its own (`node --test engine.test.js`).

## 1. Evidence

`EVIDENCE` is ten fictional log lines, each with an id:

| id | Source | What it shows |
|---|---|---|
| `combo` | `intel/combolist_2024.txt` | jsmith's password `Summer2024!` was in a public leak |
| `onboard` | `hr/onboarding.csv` | the VPN access was granted by our own IT; training was skipped |
| `mfa` | `iam/policy.yaml` | `mfa: false  # TODO enable after Q3` |
| `login` | `vpn.log` | the login came from a home connection in Ohio |
| `rclone` | `edr.log` | a free file-copying tool ran on the file server |
| `exfil` | `proxy.log` | 41.2 GB / 212,118 files left the network |
| `alert` | `edr.log` | an alert fired, sev=low, auto-closed |
| `threshold` | `siem/rules.yml` | exfil threshold 500 GB "# 50 was too noisy" |
| `tweet` | ticket SEC-2207 | found out from a customer's tweet |
| `ceo` | `mail/ceo-0314.eml` | "Can we say it was sophisticated?" |

## 2. Claims carry their evidence

A sentence is built from **parts**. A part is either plain text, or a **claim** that lists:

- `cites`: evidence ids that **support** it
- `contra`: evidence ids that **contradict** it

For example, at maximum spin the closing line is:

```js
c('We take your security very seriously', [], ['mfa', 'threshold', 'alert'])
```

It cites nothing, and three log lines contradict it. That's why it gets stamped CONTRADICTED with three red threads.

A claim with neither list is **unsupported**: nothing proves it and nothing disproves it ("we engaged world-class forensic experts"). It gets a dangling red ╳.

## 3. The statement is 12 beats

`BEATS` is the skeleton of every breach notice: headline → how they got in → credentials → what was taken → detection → discovery → who did it → root cause → impact → response → closing → (legal disclaimer).

Each beat has **four versions**, one per spin level. The same beat at both ends of the dial:

| Spin | Credentials beat |
|---|---|
| candid | "They got in with the password **Summer2024!**, which had been sitting in a public combolist since 2024." |
| very seriously | "The adversary leveraged **novel techniques** to circumvent our **robust, industry-standard controls**." |

## 4. The four dials

Each dial runs 0–100% but snaps to four levels (`lvl(v) = round(v × 3)`).

- **Spin** picks which version of each beat is used.
- **Attacker** fills the "who" slot everywhere it appears: *someone holding a password that was already public* → *an opportunistic attacker* → *an advanced threat actor* → *a highly sophisticated, likely state-sponsored adversary*.
- **Blame** fills the "whose fault" slot: *our own IT team* → *a contractor* → *a third-party vendor* → *a summer intern*.
- **Legal review** swaps verbs for hedged ones: *accessed* → *may have accessed* → *may, in limited circumstances, have accessed*. At the top two levels it also adds a "nothing in this notice constitutes an admission of liability" line.

## 5. Frozen past, steerable future

The page keeps two lists of words:

- **committed**: words already on screen. These are never rewritten.
- **plan**: what it intends to write next under the current settings, shown faintly ahead of the cursor as "speculation".

Words move from plan to committed at about 7 per second. When you turn a dial, the page throws away the plan and asks the engine for a new one, starting after the sentence it's in the middle of. That's why changing your mind rewrites the future but never the past. Each change is docked as a small tag at the line where it took effect.

## 6. Pins force admissions

Click a log line to pin it. If the statement hasn't already cited that evidence (and isn't about to in the next couple of sentences), the engine inserts an **admission** next, from the `ADMIT` table. Each piece of evidence has a candid version and a spun version:

| Pinned | Candid | Spun |
|---|---|---|
| `combo` | "To be clear: the password was Summer2024!." | "Certain credentials (Summer2024!) were, in a narrow technical sense, reused." |
| `tweet` | "We learned about this from a customer's tweet." | "We value the community's role in our detection program." |
| `ceo` | "Our CEO asked if we could call it sophisticated." | "Leadership engaged closely on how to characterize the adversary." |

## 7. What you see

- **Threads**: SVG curves from the writing cursor to the log lines behind the current sentence. White means supported, red means contradicted, and a red ╳ means nothing backs the claim.
- **Gutter bars** next to each line: how much of that line rests on evidence.
- **Evidence attention bars**: under each log line, they fill while the statement is leaning on it and fade when it moves on.
- **Telemetry bar**: words per second, simulated latency, committed›speculated words, pins, steers, unsupported and contradicted counts, and **credibility** (supported claims ÷ all claims).
- **Timeline**: drag it back to rewind (and drop any steering tags after that point), or forward to fast-forward.

## Talking points

- "It's a breach notice that writes itself from the logs. Every claim is wired to the evidence behind it, so when you turn up the spin you can watch the claims lose their evidence."
- "There's no AI inside. It's a scripted engine, so it's instant and does the same thing for everyone. The point is the interface: steering text in real time while it's being written."
- "The steering UI is inspired by far___behind's real-time LLM steering work. I pointed it at something every security person has read too many of."
