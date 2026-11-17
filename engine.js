/* Breach Post-Mortem engine: fixed evidence + dial settings -> a steerable incident statement.
   Every claim carries the evidence ids that support it (cites) or contradict it (contra).
   A claim with neither is unsupported. Pure and deterministic. */
(function (root) {
  'use strict';

  const EVIDENCE = [
    { id: 'combo',     src: 'intel/combolist_2024.txt:88213', text: 'jsmith@bw-contract.io:Summer2024!' },
    { id: 'onboard',   src: 'hr/onboarding.csv:207',          text: 'jsmith  type=contractor  vpn=granted_by:brightwell-it  training=skipped' },
    { id: 'mfa',       src: 'iam/policy.yaml:41',             text: 'vpn-legacy: { mfa: false }  # TODO enable after Q3' },
    { id: 'login',     src: 'vpn.log:4471',                   text: '03-02 02:14:09 AUTH OK user=jsmith src=73.41.18.202 (residential, OH)' },
    { id: 'rclone',    src: 'edr.log:10294',                  text: '03-02 02:31 proc=rclone.exe copy \\\\fs01\\statements remote:bkp' },
    { id: 'exfil',     src: 'proxy.log:55190',                text: '03-02..03-04 egress 41.2 GB  212,118 files  dest=storage.example.net' },
    { id: 'alert',     src: 'edr.log:10301',                  text: 'alert "Unusual data transfer"  sev=low  status=auto-closed' },
    { id: 'threshold', src: 'siem/rules.yml:12',              text: 'exfil_threshold_gb: 500   # 50 was too noisy' },
    { id: 'tweet',     src: 'ticket SEC-2207',                text: '03-13 opened from customer tweet: "why is my bank statement on a forum??"' },
    { id: 'ceo',       src: 'mail/ceo-0314.eml',              text: 'Subject: re: notice draft  "Can we say it was sophisticated?"' },
  ];

  const DIALS = [
    { key: 'spin',     label: 'spin',         stops: ['candid', 'measured', 'reassuring', 'very seriously'] },
    { key: 'attacker', label: 'attacker',     stops: ['password reuse', 'opportunistic', 'advanced', 'nation-state'] },
    { key: 'blame',    label: 'blame',        stops: ['us', 'the contractor', 'a vendor', 'the intern'] },
    { key: 'legal',    label: 'legal review', stops: ['none', 'light', 'heavy', 'maximal'] },
  ];

  const lvl = (v) => Math.max(0, Math.min(3, Math.round((+v || 0) * 3)));
  const stopLabel = (key, v) => DIALS.find((d) => d.key === key).stops[lvl(v)];

  // ---- part builders --------------------------------------------------------
  const t = (text) => ({ text, cites: [], contra: [], claim: false });
  const c = (text, cites = [], contra = []) => ({ text, cites, contra, claim: true });
  const m = (text, cites, reason) => ({ ...c(text, cites), misleading: true, reason });
  const classify = (p) => !p.claim ? 'plain' : p.unverified ? 'unverified' : p.contra.length ? 'contradicted' : p.misleading ? 'misleading' : p.cites.length ? 'supported' : 'unsupported';
  const h = (forms) => (x) => t(forms[Math.min(x.legal, forms.length - 1)]);
  const pick = (x, opts) => opts[x.spin];

  const resolve = (part, x) => {
    if (part == null || part === '') return [];
    if (typeof part === 'string') return [t(part)];
    if (typeof part === 'function') return resolve(part(x), x);
    if (Array.isArray(part)) return part.flatMap((p) => resolve(p, x));
    return [part];
  };

  const ACTOR = (x) => [
    c('someone holding a password that was already public', ['combo', 'login']),
    c('an opportunistic attacker'),
    c('an advanced threat actor'),
    c('a highly sophisticated, likely state-sponsored adversary'),
  ][x.attacker];

  const BLAME = (x) => [
    c('our own IT team, which granted the access and skipped the training', ['onboard']),
    c('a contractor who reused a password', ['onboard', 'combo']),
    c('a third-party vendor', [], ['onboard']),
    c('a summer intern', [], ['onboard']),
  ][x.blame];

  // ---- beats: one sentence each (or null to skip) ---------------------------
  const BEATS = [
    (x) => ({ head: true, para: true, parts: pick(x, [
      [c('We were breached, and it was our fault.', ['mfa', 'onboard'])],
      ['Notice of a security incident at Brightwell Mutual.'],
      ['An update on our ', c('ongoing commitment to protecting you', [], ['threshold']), '.'],
      ['Your security is, and always has been, ', c('our highest priority', [], ['mfa']), '.'],
    ]) }),
    (x) => ({ para: true, parts: pick(x, [
      ['On March 2, ', ACTOR, ' ', h(['logged in to', 'accessed', 'may have accessed', 'may, in limited circumstances, have accessed']),
        ' our network through ', c('a legacy VPN account with no multi-factor authentication', ['mfa', 'login']), '.'],
      ['On March 2, ', ACTOR, ' ', h(['logged in to', 'accessed', 'may have accessed', 'may, in limited circumstances, have accessed']),
        ' our network through ', c('a remote-access account', ['login']), '.'],
      ['Upon identifying unusual activity, we ', c('immediately', [], ['tweet', 'alert']), ' began investigating how ', ACTOR, ' ',
        h(['gained', 'may have gained', 'may have potentially gained', 'may, in a manner not yet determined, have gained']), ' access to certain systems.'],
      ['Upon identifying unusual activity, we ', c('immediately', [], ['tweet', 'alert']), ' began investigating how ', ACTOR, ' ',
        h(['gained', 'may have gained', 'may have potentially gained', 'may, in a manner not yet determined, have gained']), ' access to certain systems.'],
    ]) }),
    (x) => ({ parts: pick(x, [
      ['They got in with the password ', c('Summer2024!', ['combo', 'login']), ', which ', c('had been sitting in a public combolist since 2024', ['combo']), '.'],
      ['The credentials used belonged to an account provisioned through ', BLAME, '.'],
      ['The actor ', h(['used', 'appears to have used', 'may have used', 'may, according to preliminary findings, have used']), ' ',
        c('valid but compromised credentials', ['login', 'combo']), ' obtained from ', c('an unknown source', [], ['combo']), '.'],
      ['The adversary leveraged ', c('novel techniques', [], ['combo']), ' to ',
        h(['bypass', 'circumvent', 'potentially circumvent', 'potentially and temporarily circumvent']), ' our ',
        c('robust, industry-standard controls', [], ['mfa']), '.'],
    ]) }),
    (x) => ({ parts: pick(x, [
      ['Over the next two days they used ', c('rclone, a free file-copying tool', ['rclone']), ', to copy ',
        c('41 GB of customer statements', ['exfil']), ' to a cloud storage account.'],
      ['The attacker ', h(['copied', 'transferred', 'may have transferred', 'may, in some form, have transferred']), ' ',
        c('approximately 41 GB of data', ['exfil']), ' to an external location.'],
      ['A ', c('limited', [], ['exfil']), ' amount of data ', h(['was', 'may have been', 'may potentially have been', 'may potentially, in some form, have been']), ' accessed.'],
      ['A ', c('limited', [], ['exfil']), ' amount of information ',
        h(['was viewed', 'may have been viewed', 'may potentially have been viewed', 'may, theoretically and in some form, have been viewed']), ' by ', ACTOR, '.'],
    ]) }),
    (x) => ({ para: true, parts: pick(x, [
      ['Our monitoring ', c('flagged it as low severity and auto-closed the alert', ['alert']), ', because ',
        c('our exfiltration threshold was 500 GB', ['threshold']), '.'],
      ['An automated alert ', c('was generated', ['alert']), ' and ', c('is under review', [], ['alert']), '.'],
      ['Our detection systems ', m('worked as designed', ['alert', 'threshold'], 'The alert auto-closed and the threshold was 500 GB. Following those settings does not mean the detection was effective.'), '.'],
      ['Our ', c('state-of-the-art detection systems', [], ['alert', 'threshold']), ' ', m('worked exactly as designed', ['alert', 'threshold'], 'The configured behavior allowed the transfer to go unaddressed. This wording omits that failure.'), '.'],
    ]) }),
    (x) => ({ parts: pick(x, [
      ['We found out on March 13, ', c('when a customer reported their statement was on a forum', ['tweet']), '.'],
      ['We became aware of the incident on ', c('March 13', ['tweet']), '.'],
      ['Upon discovery, we ', c('promptly'), ' engaged ', c('leading forensic experts'), '.'],
      ['Upon discovery, we ', c('immediately'), ' engaged ', c('world-class forensic experts'), ' and ',
        c('notified the appropriate authorities'), '.'],
    ]) }),
    (x) => ({ para: true, parts: [
      'Our investigation indicates the activity was carried out by ', ACTOR, '.',
      x.attacker === 0 ? [' ', c('Anyone with that password could have done this', ['combo']), '.'] : null,
      x.attacker === 3 ? [' ', c('The activity is consistent with known nation-state tradecraft'), '.'] : null,
    ] }),
    (x) => ({ parts: x.spin < 2
      ? ['The root cause was traced to ', BLAME, '.']
      : ['This incident ', c('originated outside our organization', [], ['onboard']), ', with ', BLAME, '.'] }),
    (x) => ({ para: true, parts: pick(x, [
      ['The transfer contained ', c('212,118 files', ['exfil']), '. These logs do not establish how many customers were affected.'],
      ['Affected information ', h(['includes', 'may include', 'may potentially include', 'may, depending on the circumstances, potentially include']), ' ',
        c('names and account details'), '.'],
      ['At this time, there is ', c('no evidence that any information has been misused', [], ['tweet']), '.'],
      ['There is ', c('no evidence that any information has been misused', [], ['tweet']), ', and ',
        c('no action is required on your part', [], ['tweet', 'exfil']), '.'],
    ]) }),
    (x) => ({ parts: pick(x, [
      ['Our policy left MFA ', c('disabled, with a TODO to enable it after Q3', ['mfa']), '.'],
      ['We are ', c('strengthening our security posture'), '.'],
      ['We have ', c('further enhanced our safeguards'), '.'],
      ['We have ', c('further enhanced our already industry-leading safeguards', [], ['mfa', 'threshold']), '.'],
    ]) }),
    (x) => ({ para: true, parts: pick(x, [
      [c('This was preventable', ['mfa', 'combo', 'threshold']), '. We are sorry.'],
      ['We regret any inconvenience this may cause.'],
      ['We remain ', c('committed to earning your trust'), '.'],
      [c('We take your security very seriously', [], ['mfa', 'threshold', 'alert']), '.'],
    ]) }),
    (x) => x.legal < 2 ? null : ({ parts: [
      'Nothing in this notice constitutes an admission of liability',
      x.legal === 3 ? ', fault, or awareness, to the fullest extent permitted by law' : '', '.',
    ] }),
  ];

  // Admissions: what a pinned log line forces the statement to say. [candid, spun]
  const ADMIT = {
    combo:     [['To be clear: the password was ', c('Summer2024!', ['combo']), '.'],
                ['Certain credentials (', c('Summer2024!', ['combo']), ') were, in a narrow technical sense, reused.']],
    onboard:   [[c('We granted that VPN access ourselves, and the security training was skipped', ['onboard']), '.'],
                ['Onboarding was ', c('streamlined', ['onboard']), '.']],
    mfa:       [[c('That VPN did not have multi-factor authentication', ['mfa']), '.'],
                ['Multi-factor authentication was, at that time, ', c('aspirational', ['mfa']), '.']],
    login:     [['The login came from ', c('a home internet connection in Ohio', ['login']), '.'],
                ['The adversary operated from ', c('infrastructure located in the American Midwest', ['login']), '.']],
    rclone:    [['They used ', c('rclone, a free file-copying tool', ['rclone']), '.'],
                ['The actor deployed ', c('specialized data-movement tooling', ['rclone']), '.']],
    exfil:     [[c('41 GB left the network', ['exfil']), '.'],
                ['Approximately 41 GB of data ', c('experienced an unplanned relocation', ['exfil']), '.']],
    alert:     [['We did get an alert. ', c('It auto-closed', ['alert']), '.'],
                ['An alert was generated and ', c('resolved automatically', ['alert']), '.']],
    threshold: [['Our alert threshold was ', c('500 GB, because 50 was too noisy', ['threshold']), '.'],
                ['Detection thresholds were ', c('calibrated for a quieter environment', ['threshold']), '.']],
    tweet:     [['We learned about this ', c("from a customer's tweet", ['tweet']), '.'],
                ['We value ', c("the community's role in our detection program", ['tweet']), '.']],
    ceo:       [['Our CEO asked ', c('if we could call it sophisticated', ['ceo']), '.'],
                ['Leadership ', c('engaged closely on how to characterize the adversary', ['ceo']), '.']],
  };

  const citesOf = (s) => s.parts.flatMap((p) => p.cites);

  function generate(settings, pins = new Set(), fromBeat = 0, alreadyCited = new Set()) {
    const x = { spin: lvl(settings.spin), attacker: lvl(settings.attacker), blame: lvl(settings.blame), legal: lvl(settings.legal) };
    const out = [];
    for (let b = Math.max(0, fromBeat); b < BEATS.length; b++) {
      const s = BEATS[b](x);
      if (!s) continue;
      out.push({ beat: b, para: !!s.para, head: !!s.head, parts: resolve(s.parts, x) });
    }
    // Pinned evidence must be acknowledged now, unless it already was or is about to be.
    const soon = new Set(out.slice(0, 2).flatMap(citesOf));
    const admits = [...pins]
      .filter((id) => ADMIT[id] && !alreadyCited.has(id) && !soon.has(id))
      .sort((a, b) => EVIDENCE.findIndex((e) => e.id === a) - EVIDENCE.findIndex((e) => e.id === b))
      .map((id) => ({ beat: fromBeat - 0.5, para: false, head: false, admit: id, parts: resolve(ADMIT[id][x.spin < 2 ? 0 : 1], x) }));
    // Never put an admission above the headline.
    if (out.length && out[0].head) {
      admits.forEach((a) => { a.beat = out[0].beat + 0.5; a.para = true; });
      return [out[0], ...admits, ...out.slice(1).map((s, i) => (i === 0 && admits.length ? { ...s, para: false } : s))];
    }
    return [...admits, ...out];
  }

  let sidSeq = 0;
  function toWords(sentences) {
    const words = [];
    for (const s of sentences) {
      const sid = ++sidSeq;
      const sw = [];
      let cur = null;
      for (const [pi, p] of s.parts.entries()) {
        const chunks = p.text.split(/( +)/);
        for (const ch of chunks) {
          if (!ch) continue;
          if (/^ +$/.test(ch)) { cur = null; continue; }
          if (!cur) { cur = { segs: [] }; sw.push(cur); }
          cur.segs.push({ t: ch, claim: p.claim, cites: p.cites, contra: p.contra, assessment: p.assessment || 'scripted', evidenceQuotes: p.evidenceQuotes || [], unverified: !!p.unverified, misleading: !!p.misleading, reason: p.reason || '', claimId: `${sid}:${pi}`, fullText: p.text });
        }
      }
      sw.forEach((w, wi) => {
        const cites = [...new Set(w.segs.flatMap((g) => g.cites))];
        const contra = [...new Set(w.segs.flatMap((g) => g.contra))];
        words.push({
          t: w.segs.map((g) => g.t).join(''), segs: w.segs, sid, wi, n: sw.length,
          beat: s.beat, para: s.para && wi === 0, head: s.head, admit: s.admit || null,
          cites, contra, claim: w.segs.some((g) => g.claim),
        });
      });
    }
    return words;
  }

  const api = { classify, EVIDENCE, DIALS, stopLabel, level: lvl, generate, toWords, BEAT_COUNT: BEATS.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BreachEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
