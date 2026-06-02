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

  /* ──────────────── Equity / net walkaway estimator ────────────────
     Three-route comparison. Same MV + mortgage inputs across all three;
     each route has its own (sale-price multiplier, fee model) so the
     net cash to seller varies. Highest net is highlighted; negative
     numbers display as shortfalls in red.

     Defaults reflect 2026 South Yorkshire market norms:
       Estate agent → sale 98% of MV, fees 1.5% + VAT + £1,500 legals
       Cash buyer   → sale 80% of MV, no fees (we cover legals)
       Auction      → sale 78% of MV, fees 1.0% + £1,500 legals
     ─────────────────────────────────────────────── */
  var EQUITY_ROUTES = {
    'estate-agent': { sale: 0.98, feePct: 0.018, feeFlat: 1500 },
    'cash-buyer':   { sale: 0.80, feePct: 0.000, feeFlat: 0    },
    'auction':      { sale: 0.78, feePct: 0.010, feeFlat: 1500 }
  };

  function initEquityCalc(root) {
    var mv = root.querySelector('[data-calc-input="mv"]');
    var mortgage = root.querySelector('[data-calc-input="mortgage"]');
    var charges = root.querySelector('[data-calc-input="charges"]');

    if (!mv || !mortgage) return;

    function recalc() {
      var MV = parseFloat(mv.value) || 0;
      var M = parseFloat(mortgage.value) || 0;
      var C = charges ? (parseFloat(charges.value) || 0) : 0;
      var totalCharges = M + C;

      var results = {};
      var bestNet = -Infinity;
      var bestKey = null;

      Object.keys(EQUITY_ROUTES).forEach(function (key) {
        var r = EQUITY_ROUTES[key];
        var sale = MV * r.sale;
        var fee = sale * r.feePct + r.feeFlat;
        var net = sale - fee - totalCharges;
        results[key] = { sale: sale, fee: fee, net: net };
        if (MV > 0 && net > bestNet) { bestNet = net; bestKey = key; }
      });

      Object.keys(results).forEach(function (key) {
        var card = root.querySelector('[data-equity-route="' + key + '"]');
        if (!card) return;
        var r = results[key];

        var saleEl = card.querySelector('[data-equity-out="sale"]');
        var feeEl = card.querySelector('[data-equity-out="fee"]');
        var mortgageEl = card.querySelector('[data-equity-out="mortgage"]');
        var netEl = card.querySelector('[data-equity-out="net"]');
        var pctEl = card.querySelector('[data-equity-out="pct"]');
        var netRow = card.querySelector('.line.net');

        if (MV <= 0) {
          if (saleEl) saleEl.textContent = '—';
          if (feeEl) feeEl.textContent = '—';
          if (mortgageEl) mortgageEl.textContent = '—';
          if (netEl) netEl.textContent = '—';
          if (pctEl) pctEl.textContent = '';
          if (netRow) netRow.classList.remove('is-shortfall');
          card.classList.remove('is-best');
          return;
        }

        if (saleEl) saleEl.textContent = fmtCurrency0.format(r.sale);
        if (feeEl) feeEl.textContent = '−' + fmtCurrency0.format(r.fee);
        if (mortgageEl) mortgageEl.textContent = totalCharges > 0
          ? '−' + fmtCurrency0.format(totalCharges) : '—';

        if (netEl) {
          if (r.net >= 0) {
            netEl.textContent = fmtCurrency0.format(r.net);
          } else {
            netEl.innerHTML = '−' + fmtCurrency0.format(Math.abs(r.net)) +
              ' <span style="font-size:0.65em;font-weight:500;">shortfall</span>';
          }
        }
        if (netRow) netRow.classList.toggle('is-shortfall', r.net < 0);
        if (pctEl) {
          pctEl.textContent = Math.round(r.net / MV * 100) + '% of market value';
        }
        card.classList.toggle('is-best', key === bestKey);
      });

      // Toggle the contextual insight block
      var insight = root.querySelector('[data-equity-insight]');
      if (insight && MV > 0) {
        var ea = results['estate-agent'].net;
        var cb = results['cash-buyer'].net;
        var gap = ea - cb;
        if (totalCharges > MV * 0.85) {
          insight.innerHTML = '<strong>Heads up — you may be in negative equity at the cash-buyer price.</strong> A cash sale still works, but it needs your lender\'s written consent and a signed shortfall undertaking. The estate-agent route may net more in cash, but takes 4–6 months and lender consent applies there too.';
        } else if (gap > 0) {
          insight.innerHTML = '<strong>The estate-agent route nets you about ' +
            fmtCurrency0.format(gap) + ' more</strong>, but takes 4–6 months and assumes the chain holds. The cash route completes in 2–4 weeks with no fees and no chain risk. If you have a binding deadline (probate, divorce, repossession, relocation), that gap is often worth less than the certainty.';
        } else {
          insight.innerHTML = '<strong>On these numbers, the cash route nets at least as much as the estate-agent route</strong> — and completes 4–5 months faster. Worth getting a firm offer.';
        }
      } else if (insight) {
        insight.innerHTML = '';
      }
    }

    [mv, mortgage, charges].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });

    recalc();
  }

  function boot() {
    document.querySelectorAll('[data-calc="mortgage"]').forEach(initMortgageCalc);
    document.querySelectorAll('[data-calc="cash-offer"]').forEach(initCashOfferCalc);
    document.querySelectorAll('[data-calc="equity"]').forEach(initEquityCalc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
