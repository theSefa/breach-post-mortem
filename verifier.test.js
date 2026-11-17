const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateAssessment,assess}=require('./verifier');
const E=require('./engine');
const claim=(text,status,evidence=[])=>({text,status,reason:'The record establishes this relationship.',evidence});
const mfa={id:'mfa',quote:'mfa: false'};
test('mixed claims retain exact wording and distinct verdicts through tokenization',()=>{
 const text='MFA was disabled. We hired experts.';
 const parts=validateAssessment(text,{claims:[claim('MFA was disabled.','supported',[mfa]),claim('We hired experts.','unsupported')]});
 assert.equal(parts.map(p=>p.text).join(''),text);
 const words=E.toWords([{beat:1,parts}]);
 assert.equal(E.classify(words[0].segs[0]),'supported');
 assert.equal(words[0].segs[0].assessment,'model');
 assert.deepEqual(words[0].segs[0].evidenceQuotes,[mfa]);
 assert.equal(E.classify(words.at(-1).segs[0]),'unsupported');
});
test('contradiction and misleading verdicts drive different evidence links',()=>{
 for(const status of ['contradicted','misleading']) {
 const [p]=validateAssessment('MFA protected us.',{claims:[claim('MFA protected us.',status,[mfa])]});
 assert.equal(E.classify(p),status);
 assert.deepEqual(status==='contradicted'?p.contra:p.cites,['mfa']);
 }
});
test('missing, invented, or misquoted evidence cannot produce a verified label',()=>{
 for(const evidence of [[],[{id:'made-up',quote:'mfa: false'}],[{id:'mfa',quote:'mfa: true'}]]) {
 const [p]=validateAssessment('MFA protected us.',{claims:[claim('MFA protected us.','supported',evidence)]});
 assert.equal(E.classify(p),'unverified');
 }
});
test('omitted assertions remain unverified rather than disappearing',()=>{
 const parts=validateAssessment('MFA was disabled. Everything is safe.',{claims:[claim('MFA was disabled.','supported',[mfa])]});
 assert.equal(E.classify(parts.at(-1)),'unverified');
 assert.match(parts.at(-1).text,/Everything is safe/);
});
test('rewritten or overlapping spans fail validation',()=>{
 assert.throws(()=>validateAssessment('MFA was disabled.',{claims:[claim('MFA enabled','supported',[mfa])]}));
 assert.throws(()=>validateAssessment('MFA was disabled.',{claims:[claim('MFA was disabled.','supported',[mfa]),claim('MFA','supported',[mfa])]}));
});
test('malformed review falls back to unverified without losing generated wording',async()=>{
 const parts=await assess('Some claim.',{generate:async()=>'{broken'});
 assert.equal(parts[0].text,'Some claim.');assert.equal(E.classify(parts[0]),'unverified');
});
test('aborted review propagates cancellation so stale drafts cannot be used',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(assess('Some claim.',{signal:controller.signal,generate:async()=>{throw Error('aborted');}}));
});
test('review uses exact source sentences and ignores model attempts to replace text',async()=>{
 const parts=await assess('MFA was disabled. We hired experts.',{generate:async request=>JSON.stringify(request.prompt.includes('Statement: "MFA was disabled.')?{status:'supported',text:'invented replacement',reason:'MFA is false.',evidence:[mfa]}:{status:'unsupported',reason:'No hiring record.',evidence:[]})});
 assert.equal(parts.map(p=>p.text).join(''),'MFA was disabled. We hired experts.');
 assert.deepEqual(parts.map(E.classify),['supported','unsupported']);
});
test('quotes match despite collapsed whitespace or decoded backslashes',()=>{
 const one=validateAssessment('MFA was off.',{claims:[claim('MFA was off.','supported',[{id:'mfa',quote:'vpn-legacy: { mfa: false } # TODO enable after Q3'}])]});
 assert.equal(E.classify(one[0]),'supported');
 const two=validateAssessment('Files were copied.',{claims:[claim('Files were copied.','supported',[{id:'rclone',quote:'copy \\fs01\\statements remote:bkp'}])]});
 assert.equal(E.classify(two[0]),'supported');
});
test('citing most of the logs is a dump, not a check',()=>{
 const dump=['mfa','login','alert','threshold'].map(id=>({id,quote:E.EVIDENCE.find(e=>e.id===id).text}));
 const [p]=validateAssessment('Detection worked as designed.',{claims:[claim('Detection worked as designed.','misleading',dump)]});
 assert.equal(E.classify(p),'unverified');
});
test('unsupported verdicts keep context evidence but never cite it',()=>{
 const exfil={id:'exfil',quote:'212,118 files'};
 const [p]=validateAssessment('212,118 customers were affected.',{claims:[claim('212,118 customers were affected.','unsupported',[exfil])]});
 assert.equal(E.classify(p),'unsupported');
 assert.deepEqual(p.cites,[]); assert.deepEqual(p.evidenceQuotes,[exfil]);
});
test('a misquoted record is dropped without discarding the verdict its real quotes support',()=>{
 const [p]=validateAssessment('MFA was off.',{claims:[claim('MFA was off.','supported',[{id:'mfa',quote:'mfa: vpn-legacy: { mfa: false }'},{id:'login',quote:'not in the log'}])]});
 assert.equal(E.classify(p),'supported'); assert.deepEqual(p.cites,['mfa']);
 assert.equal(p.evidenceQuotes[0].quote,'vpn-legacy: { mfa: false }');
});
