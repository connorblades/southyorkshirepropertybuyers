const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../server.js','utf8');
let handler,forwarded;
const app={set(){},use(){},get(){},post(path,fn){if(path==='/api/submit')handler=fn},listen(){}};
const express=()=>app;express.json=()=>{};express.static=()=>{};
vm.runInNewContext(source,{require(name){if(name==='express')return express;if(name==='./build')return {};return require(name)},__dirname:__dirname+'/..',process:{env:{GHL_WEBHOOK:'https://mock.invalid'}},console:{log(){},warn(){},error(){}},URL,Date,Map,Set,AbortController,setTimeout,clearTimeout,fetch:async(url,opts)=>{forwarded=JSON.parse(opts.body);return {ok:true}}});
const valid={firstName:'Audit',lastName:'Test',phone:'07700900000',email:'audit@example.invalid',address1:'TEST ONLY',notes:'Verification',_elapsed:5000,landingPage:'sell-house-at-auction',landingUrl:'https://southyorkshirepropertybuyers.com/sell-house-at-auction/',utm_campaign:'tracking_fix_20261027'};
let submissionId = 0;
async function submit(extra){forwarded=null;let response;await handler({body:{...valid,...extra},ip:'192.0.2.' + (++submissionId),headers:{origin:'https://southyorkshirepropertybuyers.com'}},{json(v){response=v}});return response}

async function checkWebsiteSources() {
  const profile = { utm_source: 'google', utm_medium: 'organic', utm_campaign: 'business_profile' };
  const cases = [
    ['Google Ads', { gclid: 'click123' }],
    ['Google Business Profile', profile],
    ['Organic search', { utm_source: 'google', utm_medium: 'organic' }],
    ['ChatGPT referral', { utm_source: 'chatgpt.com', utm_medium: 'referral' }],
    ['ChatGPT referral', { acquisitionReferrerHost: 'chat.openai.com' }],
    ['Referral', { acquisitionReferrerHost: 'chatgpt.com.example.org' }],
    ['Website (unattributed)', { ...profile, gclid: 'click123' }],
    ['Website (unattributed)', {}]
  ];
  for (const [expected, evidence] of cases) {
    const result = await submit({ leadSource: 'website', utm_campaign: undefined, ...evidence });
    assert.equal(result.ok, true);
    assert.equal(forwarded.websiteEnquirySource, expected, JSON.stringify(evidence));
    assert.equal(forwarded.leadSource, 'website');
    assert(forwarded.notes.includes('websiteEnquirySource: ' + expected));
  }
  await submit({ websiteEnquirySource: 'Google Ads' });
  assert.equal(forwarded.websiteEnquirySource, undefined, 'Ignore a client supplied classification');
}

async function checkCallbackEmailRules() {
  const optional = { sourcePage: 'get-offer', callbackEmailTestArm: 'optional', adUserDataConsent: 'granted' };
  await submit({ ...optional, email: undefined });
  assert.equal(forwarded.email, undefined);
  assert.equal(forwarded.callbackEmailTestArm, 'optional');

  for (const choice of [{ writtenOfferRequested: true }, { callbackEmailTestArm: 'control' }]) {
    assert.equal((await submit({ ...optional, email: undefined, ...choice })).accepted, false);
    assert.equal(forwarded, null);
  }
  await submit({ ...optional, writtenOfferRequested: true });
  assert.equal(forwarded.writtenOfferRequested, true);
  assert.equal(forwarded.email, valid.email);
  await submit({ ...optional, adUserDataConsent: 'denied' });
  assert.equal(forwarded.callbackEmailTestArm, undefined);
}

(async()=>{
assert.equal((await submit({})).ok,true);assert(forwarded.notes.includes('utm_campaign: tracking_fix_20261027'));assert(forwarded.notes.startsWith('Verification\n\n'));
assert.equal((await submit({timeline:'Within a month',situation:'Sale fallen through / broken chain',propertyType:'Terraced'})).ok,true);
assert(forwarded.notes.includes('[Seller enquiry context]\ntimeline: Within a month'));
assert(forwarded.notes.includes('situation: Sale fallen through / broken chain'));
assert.equal(forwarded.timeline,'Within a month');
assert.equal((await submit({timeline:'Soon\n<ignored>'})).ok,true);assert(forwarded.notes.includes('timeline: Soon  ignored '));
assert.equal((await submit({notes:'a'.repeat(2000)})).ok,true);assert(forwarded.notes.startsWith('a'.repeat(2000)));
for(const notes of ['https://spam.invalid','[url=spam]','<a href=x>spam</a>','a'.repeat(2001)]){assert.equal((await submit({notes})).accepted,false);assert.equal(forwarded,null)}
assert.equal((await submit({_hp:'bot'})).accepted,false);assert.equal(forwarded,null);
assert.equal((await submit({_elapsed:1})).accepted,false);assert.equal(forwarded,null);
await checkWebsiteSources();
await checkCallbackEmailRules();
console.log('PASS: real relay handler accepts generated landing URLs and 2000-character visitor message; still rejects visitor links, overlong messages, honeypot and fast submissions. Mock upstream only.');
})().catch(e=>{console.error(e);process.exitCode=1});
