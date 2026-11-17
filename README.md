# Breach Post-Mortem

**A breach notice that writes itself from the logs. Turn up the spin and watch every claim lose its evidence in real time.**

**▶ Try it: [thesefa.github.io/breach-post-mortem](https://thesefa.github.io/breach-post-mortem/)** (best on a desktop, works on a phone)

![The statement at maximum spin: claims stamped CONTRADICTED, red threads running back to the log lines they contradict](docs/preview.png)

Every breach notice says the company "takes your security very seriously." This one shows its working. As the statement writes itself, every claim is wired to the log lines that back it up, or to the ones that contradict it.

- **White thread:** the claim is supported by evidence.
- **Red thread:** the evidence says otherwise. The claim is stamped CONTRADICTED.
- **Dangling red ╳:** nothing backs the claim at all. It's stamped UNSUPPORTED.

## Things to try

- **Drag the SPIN arc** from *candid* to *very seriously* while it's writing. Everything after the cursor rewrites itself: "a contractor reused a leaked password" becomes "the adversary leveraged novel techniques to circumvent our robust, industry-standard controls." The text already written stays frozen.
- **Turn the other dials:** *attacker* (password reuse → nation-state), *blame* (us → the intern) and *legal review* (none → "may, in limited circumstances, have potentially…").
- **Click a log line to pin it.** The statement has to admit it, however much it squirms. Pin the customer tweet at maximum spin and you get "We value the community's role in our detection program."
- **Drag the timeline back** to rewind and pick a different future.
- **Watch the bottom bar:** it counts unsupported and contradicted claims, and keeps a running **credibility** score.

## How it works

There's no AI model inside. It's a small scripted engine plus a page that draws it, so it's instant and works the same for everyone.

1. **Evidence.** Ten fictional log lines (VPN, EDR, proxy, IAM policy, a ticket, one email), each with an id.
2. **Claims.** The statement is built from 12 beats (headline, how they got in, what was taken, detection, blame, apology…). Every beat has four versions, one per spin level. Each claim inside a sentence lists the evidence it **cites** and the evidence that **contradicts** it.
3. **Dials.** Each dial snaps to four levels. Spin chooses the tone, *attacker* and *blame* fill in who did it, and *legal review* swaps plain verbs for hedged ones.
4. **Frozen past, steerable future.** Words are emitted at a steady rate. When you change a dial, only the not-yet-written text is regenerated.
5. **Pins.** A pinned log line that hasn't been cited yet forces an admission sentence (a candid one or a spun one, depending on the spin level).

The full walkthrough is in [docs/how-it-works.md](docs/how-it-works.md).

## Run it locally

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8765
```

Engine tests (Node 18+):

```bash
node --test engine.test.js
```

## Files

| File | What it is |
|---|---|
| `index.html` | The page: layout, evidence threads, dials, timeline, telemetry |
| `engine.js` | The engine: evidence, dials, sentence variants, admissions. Pure and deterministic |
| `engine.test.js` | Engine tests (`node:test`) |
| `docs/` | How-it-works guide, the original design and plan, images |

## The fine print

Brightwell Mutual, `jsmith`, the logs and the breach are all **fictional**. Any resemblance to your last post-mortem is purely painful.

## Credits

- Made by **Sefa** ([THESEFAWAY](https://www.sefagemade.com/)). Idea and direction are mine. I built it with [Claude Code](https://claude.com/claude-code).
- The steering interface (focus gutter, pinning, radial dials, timeline scrubbing, speculative text) is inspired by [@far___behind's "Realtime LLM Vector Steering"](https://www.instagram.com/reel/DfyQPhFtW-z/).

## License

[MIT](LICENSE)
