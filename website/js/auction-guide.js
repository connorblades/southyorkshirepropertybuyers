/* Optional auction guidance. No lead, request, storage or conversion is sent. */
(function () {
  'use strict';
  var stages = {
    unsold: ['The auction ended without a sale', 'No suitable bid or an unmet reserve can leave you deciding whether to try again. We can discuss a direct cash offer for the property as it stands. Tell us any deadline and what your auctioneer has said about the next steps.'],
    buyer_withdrew: ['The buyer has not completed the sale', 'A buyer pulling out or missing a deadline can leave your plans on hold. Tell us what was agreed and when you needed to sell. We can discuss the property while your auctioneer and solicitor confirm any continuing obligations.'],
    stalled: ['Still waiting for your auction sale?', 'If the property is still listed or the process is taking longer than you expected, tell us how long it has been marketed and what you need to happen next. We can discuss whether a direct purchase could help.'],
    unsure: ['You do not need to know the auction type to enquire', 'Tell us what has happened so far and what you want to happen next. You can leave the terminology to one side and speak to our team about your property and your required timescale.']
  };
  var terms = {
    modern: 'You selected modern method or conditional auction. The modern-method guidance may help you understand the questions to ask about your agreement.',
    traditional: 'You selected traditional or unconditional auction. Your auctioneer and solicitor can confirm what your agreement and any accepted bid mean for your next steps.',
    unsure: 'You are not sure which terms apply. That is fine: the next form will keep this clear, so our team does not assume an auction type.'
  };
  function own(map, key) { return Object.prototype.hasOwnProperty.call(map, key); }
  function boot() {
    var form = document.getElementById('auctionGuide');
    if (!form) return;
    var stageField = document.getElementById('auctionStage');
    var termsField = document.getElementById('auctionTerms');
    var back = document.getElementById('guideBack');
    var next = document.getElementById('guideNext');
    var submit = document.getElementById('guideSubmit');
    var result = document.getElementById('guideResult');
    var progress = document.getElementById('guideProgress');
    var current = 0;
    function selected(name, allowed) {
      var input = form.querySelector('input[name="' + name + '"]:checked');
      return input && own(allowed, input.value) ? input.value : 'unsure';
    }
    function query() {
      return 'auction_stage=' + selected('auction_stage', stages) + '&auction_terms=' + selected('auction_terms', terms);
    }
    function carryAnswers() {
      [].slice.call(document.querySelectorAll('a[href]')).forEach(function (link) {
        try {
          var url = new URL(link.getAttribute('href'), window.location.href);
          if (url.origin !== window.location.origin || url.pathname.replace(/\/$/, '') !== '/get-offer') return;
          url.searchParams.set('auction_stage', selected('auction_stage', stages));
          url.searchParams.set('auction_terms', selected('auction_terms', terms));
          link.setAttribute('href', url.pathname + url.search + url.hash);
        } catch (_) {}
      });
      [].slice.call(document.querySelectorAll('form[action="/get-offer/"][method="get"]')).forEach(function (postcodeForm) {
        if (postcodeForm === form) return;
        [['auction_stage', selected('auction_stage', stages)], ['auction_terms', selected('auction_terms', terms)]].forEach(function (entry) {
          var input = postcodeForm.querySelector('input[type="hidden"][name="' + entry[0] + '"]');
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = entry[0];
            postcodeForm.appendChild(input);
          }
          input.value = entry[1];
        });
      });
    }
    function showStep(step) {
      current = step;
      form.hidden = false;
      result.hidden = true;
      stageField.hidden = step !== 0;
      termsField.hidden = step !== 1;
      back.hidden = step === 0;
      next.hidden = step !== 0;
      submit.hidden = step !== 1;
      submit.textContent = 'Show my next steps';
      progress.hidden = false;
      progress.textContent = 'Question ' + (step + 1) + ' of 2';
    }
    next.addEventListener('click', function () { showStep(1); termsField.querySelector('input:checked').focus(); });
    back.addEventListener('click', function () { showStep(0); stageField.querySelector('input:checked').focus(); });
    document.getElementById('guideEdit').addEventListener('click', function () { showStep(0); stageField.querySelector('input:checked').focus(); });
    form.addEventListener('change', carryAnswers);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var stage = selected('auction_stage', stages);
      var term = selected('auction_terms', terms);
      document.getElementById('guideResultTitle').textContent = stages[stage][0];
      document.getElementById('guideResultBody').textContent = stages[stage][1];
      document.getElementById('guideResultTerms').textContent = terms[term];
      var modernLink = document.getElementById('guideModern');
      modernLink.hidden = term !== 'modern';
      modernLink.href = '/house-not-sold-modern-auction/?' + query();
      carryAnswers();
      form.hidden = true;
      result.hidden = false;
      progress.hidden = true;
      var heading = document.getElementById('guideResultTitle');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
    try {
      var params = new URLSearchParams(window.location.search);
      [['auction_stage', stages], ['auction_terms', terms]].forEach(function (entry) {
        var value = params.get(entry[0]);
        if (own(entry[1], value)) form.querySelector('input[name="' + entry[0] + '"][value="' + value + '"]').checked = true;
      });
    } catch (_) {}
    carryAnswers();
    showStep(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
