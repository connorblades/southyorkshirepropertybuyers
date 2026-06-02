/* South Yorkshire Property Buyers — interactive calculators
   Vanilla JS, no deps. Initialised on DOMContentLoaded for every
   element matching the data-calc selector. */
(function () {
  'use strict';

  var fmtCurrency0 = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0
  });
  var fmtCurrency2 = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 2
  });

  function monthlyRepayment(principal, annualRatePct, years) {
    var r = (annualRatePct / 100) / 12;
    var n = years * 12;
    if (n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  function monthlyInterestOnly(principal, annualRatePct) {
    return principal * (annualRatePct / 100) / 12;
  }

  function initMortgageCalc(root) {
    var loan = root.querySelector('[data-calc-input="loan"]');
    var rate = root.querySelector('[data-calc-input="rate"]');
    var term = root.querySelector('[data-calc-input="term"]');
    var type = root.querySelector('[data-calc-input="type"]');
    var outMonth = root.querySelector('[data-calc-out="month"]');
    var outTotal = root.querySelector('[data-calc-out="total"]');
    var outInterest = root.querySelector('[data-calc-out="interest"]');
    var outScenarios = root.querySelector('[data-calc-out="scenarios"]');

    if (!loan || !rate || !term || !outMonth) return;

    function recalc() {
      var P = parseFloat(loan.value) || 0;
      var R = parseFloat(rate.value) || 0;
      var Y = parseFloat(term.value) || 0;
      var T = type ? type.value : 'repayment';

      if (P <= 0 || R < 0 || Y <= 0) {
        outMonth.textContent = '—';
        if (outTotal) outTotal.textContent = '—';
        if (outInterest) outInterest.textContent = '—';
        if (outScenarios) outScenarios.innerHTML = '';
        return;
      }

      var m = T === 'interest'
        ? monthlyInterestOnly(P, R)
        : monthlyRepayment(P, R, Y);

      var totalPaid = T === 'interest'
        ? (m * Y * 12) + P
        : m * Y * 12;
      var interestPaid = totalPaid - P;

      outMonth.textContent = fmtCurrency2.format(m);
      if (outTotal) outTotal.textContent = fmtCurrency0.format(totalPaid);
      if (outInterest) outInterest.textContent = fmtCurrency0.format(interestPaid);

      if (outScenarios) {
        var rows = [
          { delta: 1, label: '+1% to ' + (R + 1).toFixed(2) + '%' },
          { delta: 2, label: '+2% to ' + (R + 2).toFixed(2) + '%' }
        ];
        outScenarios.innerHTML = rows.map(function (s) {
          var nm = T === 'interest'
            ? monthlyInterestOnly(P, R + s.delta)
            : monthlyRepayment(P, R + s.delta, Y);
          var diff = nm - m;
          return '<li><span>If rates rise <strong>' + s.label + '</strong></span>' +
                 '<strong>' + fmtCurrency2.format(nm) +
                 ' <span style="color:var(--muted);font-weight:500;">(' +
                 (diff >= 0 ? '+' : '') + fmtCurrency0.format(diff) + '/mo)</span></strong></li>';
        }).join('');
      }
    }

    [loan, rate, term, type].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });

    // Affordability question response buttons
    root.querySelectorAll('[data-calc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-calc-action');
        root.querySelectorAll('[data-calc-response]').forEach(function (block) {
          block.style.display = block.getAttribute('data-calc-response') === action
            ? 'block' : 'none';
        });
        if (action !== 'ok') {
          var resp = root.querySelector('[data-calc-response="' + action + '"]');
          if (resp && resp.scrollIntoView) {
            resp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });

    recalc();
  }

  function boot() {
    document.querySelectorAll('[data-calc="mortgage"]').forEach(initMortgageCalc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
