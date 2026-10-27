const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../server.js','utf8');
let handler,forwarded;
const app={set(){},use(){},get(){},post(path,fn){if(path==='/api/submit')handler=fn},listen(){}};
const express=()=>app;express.json=()=>{};express.static=()=>{};
vm.runInNewContext(source,{require(name){if(name==='express')return express;return require(name)},__dirname:__dirname+'/..',process:{env:{GHL_WEBHOOK:'https://mock.invalid'}},console:{log(){},warn(){},error(){}},URL,Date,Map,Set,fetch:async(url,opts)=>{forwarded=JSON.parse(opts.body);return {ok:true}}});
const valid={firstName:'Audit',lastName:'Test',phone:'07700900000',email:'audit@example.invalid',address1:'TEST ONLY',notes:'Verification',_elapsed:5000,landingPage:'sell-house-at-auction',landingUrl:'https://southyorkshirepropertybuyers.com/sell-house-at-auction/',utm_campaign:'tracking_fix_20261027'};
async function submit(extra){forwarded=null;let response;await handler({body:{...valid,...extra},ip:'127.0.0.1',headers:{origin:'https://southyorkshirepropertybuyers.com'}},{json(v){response=v}});return response}
(async()=>{
assert.equal((await submit({})).ok,true);assert(forwarded.notes.includes('utm_campaign: tracking_fix_20261027'));assert(forwarded.notes.startsWith('Verification\n\n'));
assert.equal((await submit({notes:'a'.repeat(2000)})).ok,true);assert(forwarded.notes.startsWith('a'.repeat(2000)));
for(const notes of ['https://spam.invalid','[url=spam]','<a href=x>spam</a>','a'.repeat(2001)]){assert.equal((await submit({notes})).accepted,false);assert.equal(forwarded,null)}
assert.equal((await submit({_hp:'bot'})).accepted,false);assert.equal(forwarded,null);
assert.equal((await submit({_elapsed:1})).accepted,false);assert.equal(forwarded,null);
console.log('PASS: real relay handler accepts generated landing URLs and 2000-character visitor message; still rejects visitor links, overlong messages, honeypot and fast submissions. Mock upstream only.');
})().catch(e=>{console.error(e);process.exitCode=1});
