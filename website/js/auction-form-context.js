/* Carry the optional auction guide answers into the existing enquiry form.
   Only fixed answer codes are accepted. No request, storage or analytics event
   is made here. The existing relay includes the optional situation in CRM notes. */
(function () {
  'use strict';

  var stages = {
    unsold: 'The auction ended without a sale',
    buyer_withdrew: 'A buyer pulled out or did not complete',
    stalled: 'The property is still listed and the sale is taking too long',
    unsure: 'I am not sure where the sale stands'
  };
  var terms = {
    modern: 'Modern method / conditional',
    traditional: 'Traditional / unconditional',
    unsure: 'I am not sure what the auction agreement says'
  };
  var shortStages = {
    unsold: 'Auction ended unsold',
    buyer_withdrew: 'Auction buyer withdrew or did not complete',
    stalled: 'Auction listing taking too long',
    unsure: 'Auction sale position not known'
  };
  var shortTerms = {
    modern: 'modern / conditional stated',
    traditional: 'traditional / unconditional stated',
    unsure: 'agreement terms not known'
  };
  function own(map, code) {
    return Object.prototype.hasOwnProperty.call(map, code);
  }

  function boot() {
    var form = document.getElementById('offerForm');
    var situation = document.getElementById('situation');
    var query;
    try { query = new URLSearchParams(window.location.search); }
    catch (_) { return; }
    var stage = query.get('auction_stage');
    var term = query.get('auction_terms');
    if (!own(stages, stage) || !own(terms, term)) return;

    // A seller can read the modern-method page before opening the enquiry.
    // Keep only the fixed answers on first-party form links and postcode forms.
    [].slice.call(document.querySelectorAll('a[href]')).forEach(function (link) {
      try {
        var url = new URL(link.getAttribute('href'), window.location.href);
        if (url.origin !== window.location.origin || url.pathname.replace(/\/$/, '') !== '/get-offer') return;
        url.searchParams.set('auction_stage', stage);
        url.searchParams.set('auction_terms', term);
        link.setAttribute('href', url.pathname + url.search + url.hash);
      } catch (_) {}
    });
    [].slice.call(document.querySelectorAll('form[action="/get-offer/"][method="get"]')).forEach(function (postcodeForm) {
      [['auction_stage', stage], ['auction_terms', term]].forEach(function (entry) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = entry[0];
        input.value = entry[1];
        postcodeForm.appendChild(input);
      });
    });
    if (!form || !situation) return;

    // Use the existing optional field and relay mapping. Keep the visitor's
    // message and its full character allowance untouched. This is self-reported
    // context, not a legal classification or seller qualification.
    var context = shortStages[stage] + '; ' + shortTerms[term];
    var option = document.createElement('option');
    option.value = context;
    option.textContent = context;
    situation.appendChild(option);
    situation.value = context;

    var summary = document.createElement('section');
    summary.className = 'offer-next-steps';
    summary.setAttribute('aria-label', 'Your auction guide answers');
    var heading = document.createElement('h2');
    heading.textContent = 'Your auction answers';
    var detail = document.createElement('p');
    detail.textContent = stages[stage] + '. ' + terms[term] + '.';
    var help = document.createElement('p');
    help.textContent = 'These answers are selected as your situation below and will be included with your enquiry. You can change them before sending.';
    var change = document.createElement('a');
    change.href = '/house-not-sold-at-auction/?auction_stage=' + stage +
      '&auction_terms=' + term + '#auction-guide';
    change.textContent = 'Change my auction answers';
    summary.appendChild(heading);
    summary.appendChild(detail);
    summary.appendChild(help);
    summary.appendChild(change);
    form.parentNode.insertBefore(summary, form);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
