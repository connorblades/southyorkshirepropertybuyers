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

  /* ──────────────── Cash offer estimator ────────────────
     User enters their Zoopla / Rightmove estimated market value
     and chooses a property condition. The calculator returns:

       condition-adjusted market value = MV × condition multiplier
       cash offer estimate             = adjusted × 0.85

     Final offer is firm only after a 15-minute viewing — the range
     shown (±5%) reflects that uncertainty honestly rather than
     pretending the estimator is the offer.
     ─────────────────────────────────────────────── */
  var CONDITION_MULT = {
    excellent: 1.00, // Refurbished, move-in ready
    good:      0.85, // Well-maintained, minor cosmetics only
    fair:      0.65, // Dated, needs modernisation (kitchen/bathroom)
    poor:      0.40, // Significant work — re-wiring, roof, damp
    derelict:  0.20  // Uninhabitable, structural problems
  };
  var CASH_OFFER_FACTOR = 0.85; // 15% reduction below condition-adjusted MV

  function initCashOfferCalc(root) {
    var value = root.querySelector('[data-calc-input="value"]');
    var condition = root.querySelector('[data-calc-input="condition"]');
    var outOffer = root.querySelector('[data-calc-out="offer"]');
    var outRange = root.querySelector('[data-calc-out="offer-range"]');
    var outAdjusted = root.querySelector('[data-calc-out="adjusted"]');
    var outPercent = root.querySelector('[data-calc-out="percent"]');

    if (!value || !condition || !outOffer) return;

    function recalc() {
      var V = parseFloat(value.value) || 0;
      var C = condition.value || 'good';

      if (V <= 0) {
        outOffer.textContent = '—';
        if (outRange) outRange.textContent = '';
        if (outAdjusted) outAdjusted.textContent = '—';
        if (outPercent) outPercent.textContent = '—';
        return;
      }

      var mult = CONDITION_MULT[C] != null ? CONDITION_MULT[C] : 1;
      var adjusted = V * mult;
      var offerPoint = adjusted * CASH_OFFER_FACTOR;
      var offerLow = offerPoint * 0.95;
      var offerHigh = offerPoint * 1.00;
      var percentOfMV = (offerPoint / V) * 100;

      outOffer.textContent = fmtCurrency0.format(offerPoint);
      if (outRange) {
        outRange.textContent = fmtCurrency0.format(offerLow) + ' – ' + fmtCurrency0.format(offerHigh);
      }
      if (outAdjusted) outAdjusted.textContent = fmtCurrency0.format(adjusted);
      if (outPercent) outPercent.textContent = Math.round(percentOfMV) + '%';
    }

    [value, condition].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });

    root.querySelectorAll('[data-calc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-calc-action');
        root.querySelectorAll('[data-calc-response]').forEach(function (block) {
          block.style.display = block.getAttribute('data-calc-response') === action
            ? 'block' : 'none';
        });
        var resp = root.querySelector('[data-calc-response="' + action + '"]');
        if (resp && resp.scrollIntoView) {
          resp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    recalc();
  }

  function boot() {
    document.querySelectorAll('[data-calc="mortgage"]').forEach(initMortgageCalc);
    document.querySelectorAll('[data-calc="cash-offer"]').forEach(initCashOfferCalc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
