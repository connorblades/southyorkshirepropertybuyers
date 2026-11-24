(() => {
'use strict';
const money = new Intl.NumberFormat('en-GB', {style:'currency', currency:'GBP', minimumFractionDigits:2});
const fields = ['price','fees','legal','weekly','weeks','debt'];
const routes = Array.from(document.querySelectorAll('#compare-sale-options .route'));
function parseEntry(input, allowPound) {
  let value = input.value.trim();
  if (!value) return {value:null, error:''};
  if (allowPound) value = value.replace(/^£\s*/, '');
  const pattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;
  if (!pattern.test(value)) return {value:null, error:'Use a positive number or 0, with up to two decimal places.'};
  const cleaned = value.replace(/,/g,'');
  const [whole, fraction=''] = cleaned.split('.');
  const amount = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(amount) || amount > (allowPound ? 1e11 : 520000)) return {value:null,error:'Check the size of this figure.'};
  return {value:amount, error:''};
}
function render(route) {
  const get = key => route.querySelector('[data-field="'+key+'"]');
  const out = key => route.querySelector('[data-out="'+key+'"]');
  const values = {}, errors = {};
  for (const key of fields) {
    const input = get(key);
    const parsed = parseEntry(input, key !== 'weeks');
    values[key] = parsed.value;
    errors[key] = parsed.error;
    document.getElementById(input.id+'-error').textContent = parsed.error;
    input.setAttribute('aria-invalid', parsed.error ? 'true' : 'false');
  }
  const {price,fees,legal,weekly,weeks,debt} = values;
  const hold = errors.weekly || errors.weeks ? null :
    (weekly === 0 || weeks === 0 ? 0 : weekly === null || weeks === null ? null : Number((BigInt(weekly)*BigInt(weeks)+50n)/100n));
  const proceeds = [price, fees, legal].includes(null) ? null : price - fees - legal;
  const net = proceeds === null || hold === null ? null : proceeds - hold;
  const left = net === null || debt === null ? null : net-debt;
  for(const [name,val] of Object.entries({proceeds,hold,net,left})) {
    const node=out(name);
    const printed=val===null ? (name==='left' && net!==null && !errors.debt ? 'Add secured debt figure' : 'Awaiting figures') : money.format(val/100);
    if(node.textContent!==printed)node.textContent=printed;
  }
  const end = document.getElementById('deadline').valueAsNumber;
  const finish = get('date').valueAsNumber;
  const delta = (finish-end)/86400000;
  const timing = Number.isFinite(delta) ? delta===0 ? 'Estimated completion is on your deadline.' :
    'Estimated completion is '+Math.abs(delta)+' '+(Math.abs(delta)===1?'day':'days')+' '+(delta>0?'after':'before')+' your deadline.' : 'Add both dates to compare timing.';
  if(out('timing').textContent!==timing)out('timing').textContent=timing;
  route.querySelector('.print-note').textContent = get('notes').value;
}
for (const route of routes) {
  route.addEventListener('input',() => render(route));
  render(route);
}
document.getElementById('deadline').addEventListener('input',() => routes.forEach(render));
document.getElementById('print').addEventListener('click', () => {
  document.body.classList.add('printing-sale-worksheet');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('printing-sale-worksheet'));
window.addEventListener('beforeprint',() => routes.forEach(render));
})();
