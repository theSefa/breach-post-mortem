const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makePrompt,validateOutput} = require('./server');
const E = require('./engine');
const request = {text:'A security incident.', prefix:'', settings:{spin:1,attacker:0,blame:0,legal:0},pins:['mfa']};
test('prompt includes authoritative evidence, selected steering and pins',()=>{
 const prompt = makePrompt(request); assert.match(prompt,/very seriously/); assert.match(prompt,/mfa: false/); assert.match(prompt,/Pinned facts: \["mfa"\]/);
});
test('invalid controls and evidence IDs cannot enter model request',()=>{
 assert.throws(()=>makePrompt({...request,pins:['unknown']}));
 assert.throws(()=>makePrompt({...request,settings:{spin:99}}));
 assert.throws(()=>makePrompt({...request,text:'x'.repeat(3001)}));
});
test('reject malformed or excessive model output',()=>{
 for(const result of [{}, {text:''},{text:'word '.repeat(101)}]) assert.throws(()=>validateOutput(result));
 assert.equal(validateOutput({text:'  A   statement about the incident. '}),'A statement about the incident.');
});
test('model claims cannot acquire supported status through citations',()=>{
 const words=E.toWords([{beat:1,parts:[{text:'An invented claim.',claim:true,cites:['mfa'],contra:[],unverified:true}]}]);
 assert.equal(E.classify(words[0].segs[0]),'unverified');
});
const {inventedFixes} = require('./server');
test('model output is cut to its first sentence',()=>{
 assert.equal(validateOutput({text:'Oops, an old password opened the door. We are reviewing our policies.'}),'Oops, an old password opened the door.');
 assert.throws(()=>validateOutput({text:'Oops! We are reviewing our password policies today.'}),/sentence/);
});
test('fixes the company claims but the beat never mentioned are caught',()=>{
 const beat='Someone logged in through a legacy VPN account with no multi-factor authentication.';
 assert.deepEqual(inventedFixes("We're reviewing our password policies after the login.",beat),['review']);
 assert.deepEqual(inventedFixes('We have since strengthened our safeguards.',beat),['strengthen','safeguard']);
 assert.deepEqual(inventedFixes('The VPN account had no MFA enabled.',beat),[]);
 assert.deepEqual(inventedFixes('Upon discovery, we promptly engaged experts.','Upon discovery, we engaged leading forensic experts.'),[]);
});
test('everyday fix verbs from live drafts are caught too',()=>{
 const beat='We found out on March 13, when a customer reported their statement was on a forum.';
 assert.deepEqual(inventedFixes("We've detected unusual activity, which we're now addressing with vigor.",beat),['address']);
 assert.deepEqual(inventedFixes('We are currently examining the circumstances of the visit.',beat),['examine']);
 assert.deepEqual(inventedFixes('We summoned our IT elves for a covert dance of data recovery.',beat),['recover']);
});
test('fixes framed as the company\'s ongoing work are caught',()=>{
 const beat='On March 2, someone logged in through a legacy VPN account with no multi-factor authentication.';
 assert.deepEqual(inventedFixes('An intruder used a VPN account with no MFA, underscoring our ongoing security enhancement initiatives.',beat),['enhance']);
 assert.deepEqual(inventedFixes('Our contractor\'s password opened the door to our network.',beat),[]);
});
