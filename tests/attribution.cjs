const fs=require('fs'),vm=require('vm'),assert=require('assert');
const site=fs.readFileSync(__dirname+'/../website/js/site.js','utf8'),init=fs.readFileSync(__dirname+'/../website/js/init.js','utf8');
function storage(seed={}){return {data:{...seed},getItem(k){return this.data[k]??null},setItem(k,v){this.data[k]=String(v)},removeItem(k){delete this.data[k]}}}
async function testSubmit(query,response, seed, blocked=false){
 let handler,payload,error=false;const btn={textContent:'Send'};
 const fields=Object.fromEntries(Object.entries({name:'Audit Test',phone:'07700900000',email:'audit@example.invalid',address:'TEST ONLY',postcode:'S1 2HH',type:'',timeline:'',situation:'',message:'Test'}).map(([k,v])=>[k,{value:v}]));
 const form={addEventListener(k,f){if(k==='submit')handler=f},querySelector(s){return s==='.form-submit'?btn:null},appendChild(){error=true}};
 const sessionStorage=storage(seed || {sypb_attr:JSON.stringify({gclid:'TEST_CLICK_ID',utm_campaign:'selected',utm_term:'auction my house',gbraid:'TEST_BRAID'}),sypb_landing:JSON.stringify({page:'sell-house-at-auction',referrer:'https://www.google.com/'})});
 if(blocked) sessionStorage.getItem=()=>{throw Error('storage blocked')};
 const document={readyState:'loading',referrer:'https://southyorkshirepropertybuyers.com/sell-house-at-auction/',title:'Offer',getElementById(k){return k==='offerForm'?form:fields[k]||null},querySelectorAll(){return []},addEventListener(){},createElement(){return{setAttribute(){},style:{}}}};
 const location={pathname:'/get-offer/',search:query,href:'https://southyorkshirepropertybuyers.com/get-offer/'+query};
 const ctx={document,sessionStorage,localStorage:storage(),URLSearchParams,Date,fetch:async(u,o)=>{payload=JSON.parse(o.body);return {ok:true,json:async()=>response}},window:{location,addEventListener(){}},setTimeout(){}};
 vm.runInNewContext(site,ctx);await handler({preventDefault(){}});return{payload,redirect:location.href,error,submitted:sessionStorage.data.sypb_lead_submitted};
}
function testInit(seed,consent){const sessionStorage=storage(seed),localStorage=storage(consent?{sypb_consent:consent}:{}),location={pathname:'/thank-you/',search:'',replace(v){this.redirect=v}};const ctx={sessionStorage,localStorage,location,URLSearchParams,Date,document:{referrer:'',documentElement:{setAttribute(){}}},dataLayer:[]};ctx.window=ctx;vm.runInNewContext(init,ctx);return{events:ctx.dataLayer.map(x=>Array.from(x)),location,sessionStorage};}

function visit(sessionStorage, path, query) {
 const location={pathname:path,search:query,origin:'https://example.invalid'};
 const ctx={sessionStorage,localStorage:storage(),location,URLSearchParams,Date,document:{referrer:'https://google.com/',documentElement:{setAttribute(){}}},dataLayer:[]};ctx.window=ctx;
 vm.runInNewContext(init,ctx);
}
(async()=>{
 const checks=[];
 let r=await testSubmit('?postcode=S1+2HH',{ok:true});
 assert.equal(r.payload.gclid,'TEST_CLICK_ID');assert.equal(r.payload.utm_campaign,'selected');assert.equal(r.payload.gbraid,'TEST_BRAID');assert.equal(r.payload.landingPage,'sell-house-at-auction');assert.equal(r.payload.sourcePage,'get-offer');assert(r.payload.notes.startsWith('Test\n\n'));assert(r.payload.notes.includes('utm_campaign: selected'));checks.push('Cross-page acquisition survives postcode-only URL; submission location retained');
 const session=storage();visit(session,'/sell-house-at-auction/','?gclid=old&utm_campaign=old&utm_term=old');visit(session,'/get-offer/','?postcode=S1');
 r=await testSubmit('?postcode=S1',{ok:true},session.data);assert.equal(r.payload.enquiryPage,'sell-house-at-auction');assert.equal(r.payload.landingUrl,'https://example.invalid/sell-house-at-auction/');checks.push('Content intent and clean landing URL survive shared form navigation');
 visit(session,'/sell-house-discreetly/','?utm_campaign=new&wbraid=newbraid');visit(session,'/get-offer/','');
 r=await testSubmit('',{ok:true},session.data);assert.equal(r.payload.utm_campaign,'new');assert.equal(r.payload.wbraid,'newbraid');assert(!r.payload.gclid&&!r.payload.utm_term);assert.equal(r.payload.firstLandingPage,'sell-house-at-auction');assert.equal(r.payload.landingPage,'sell-house-discreetly');checks.push('New acquisition replaces old click bundle while preserving first landing');
 r=await testSubmit('?utm_campaign=current',{ok:true});assert.equal(r.payload.utm_campaign,'current');assert(!r.payload.gclid);checks.push('Current URL cannot mix with stale stored click IDs');
 for(const seed of [{sypb_attr:'{broken'}, {sypb_attr:'null'}, {sypb_attr:'[]'}]) {r=await testSubmit('?utm_campaign=current',{ok:true},seed);assert.equal(r.payload.utm_campaign,'current');assert.equal(r.submitted,'1');}checks.push('Malformed stored data does not block submission');
 r=await testSubmit('?utm_campaign=current',{ok:true},{},true);assert.equal(r.payload.utm_campaign,'current');assert.equal(r.redirect,'/thank-you/');checks.push('Blocked storage still permits current URL tracking and successful enquiry');
 for(const response of [{ok:false},{ok:true,accepted:false},{ok:true,accepted:true}]){r=await testSubmit('',response);assert.equal(r.submitted==='1',response.ok===true&&response.accepted!==false);}checks.push('Rejected responses remain rejected; accepted responses succeed');
 r=testInit({},'granted');assert.equal(r.location.redirect,'/');assert(!r.events.some(x=>x[0]==='event'));
 r=testInit({sypb_lead_submitted:'1',sypb_ec:JSON.stringify({email:'audit@example.invalid'})},'denied');assert(!r.events.some(x=>x[0]==='set'));
 r=testInit({sypb_lead_submitted:'1',sypb_conversion_fired:'1'},'granted');assert(!r.events.some(x=>x[0]==='event'));checks.push('Thank-you access, denied enhanced-data consent and explicit event refresh guards unchanged');
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
