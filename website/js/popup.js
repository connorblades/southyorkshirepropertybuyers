/* Entry popup: a prompt to the offer form, shown once per visit.
 *
 * It asks for a postcode and nothing else, then hands over to /get-offer/ with
 * ?postcode=, exactly as the hero field on every landing page does. site.js
 * receives it there, fills step 1 and moves to step 2.
 *
 * It deliberately does not post anything itself. It used to, with a shorter set
 * of keys than the main form, and one GHL inbound webhook cannot learn two
 * payload shapes: it mapped the short one wrongly and a real seller arrived as a
 * name with a postcode stuck to it, very nearly missed. There is now one form,
 * one payload and one mapping on the whole site, so that cannot recur. Keep it
 * that way: if this popup ever needs to capture more, send people to the form
 * rather than building a second one here.
 *
 * Fires 15 seconds after the first page of a session loads, after the cookie
 * banner is dealt with. The sessionStorage flag is set the moment it fires, so
 * navigating on within the same visit never shows it again. Skipped on the form
 * and thank-you pages, and for anyone who has already sent a lead this session. */
(function () {
  'use strict';

  var DELAY_MS = 15000;
  var SEEN_KEY = 'sypb_popup_seen';
  var LEAD_KEY = 'sypb_lead_submitted';
  var SKIP_PATHS = ['/get-offer/', '/thank-you/'];

  function flag(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function setFlag(key) {
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
  }

  var path = window.location.pathname;
  if (SKIP_PATHS.indexOf(path) !== -1) return;
  if (flag(SEEN_KEY) || flag(LEAD_KEY)) return;

  var lastFocus = null;

  function build() {
    var wrap = document.createElement('div');
    wrap.className = 'lead-pop-overlay';
    wrap.id = 'leadPop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'leadPopTitle');
    wrap.innerHTML =
      '<div class="lead-pop">' +
        '<button type="button" class="lead-pop-close" aria-label="Close">&#10005;</button>' +
        '<h2 id="leadPopTitle">Want to know what we would pay?</h2>' +
        '<p class="lead-pop-sub">Start with your postcode. It takes about two minutes, there is no obligation, and you get a written offer the same day.</p>' +
        /* A plain GET form to /get-offer/, the same as the hero field. No fetch,
           no payload, so there is nothing here that can drift from the main form. */
        '<form class="lead-pop-form" action="/get-offer/" method="get">' +
          '<input type="text" name="postcode" id="leadPopPostcode" placeholder="Enter your postcode" aria-label="Property postcode" required autocomplete="postal-code" spellcheck="false">' +
          '<button type="submit" class="lead-pop-submit">Get my cash offer &rarr;</button>' +
        '</form>' +
        '<p class="lead-pop-alt">Would you rather talk now? <a href="tel:+447445629113" data-track="phone-tap">07445 629113</a></p>' +
      '</div>';
    return wrap;
  }

  function close(el) {
    el.classList.remove('is-open');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function open() {
    if (flag(SEEN_KEY) || flag(LEAD_KEY)) return;
    setFlag(SEEN_KEY);

    lastFocus = document.activeElement;
    var el = build();
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { el.classList.add('is-open'); });

    var input = el.querySelector('#leadPopPostcode');
    if (input) input.focus();

    el.querySelector('.lead-pop-close').addEventListener('click', function () { close(el); });
    el.addEventListener('click', function (e) { if (e.target === el) close(el); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.getElementById('leadPop')) {
        close(el);
        document.removeEventListener('keydown', esc);
      }
    });
  }

  /* Don't stack on top of the cookie banner. A first-time visitor, which is most
     ad traffic, would otherwise meet two overlays at once. Wait for consent to be
     dealt with, then start the 3s clock. Give up waiting after 30s and show anyway. */
  /* site.js toggles the banner via inline style.display. Read computed style, not
     offsetParent: the banner is position:fixed, for which offsetParent is always
     null, so an offsetParent test would report it hidden even when it is up. */
  function consentVisible() {
    var el = document.getElementById('sypb-consent');
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
  }

  /* Run the 15s clock first, so a visitor with no cookie banner sees the popup at
     exactly 15s. Only then, if the banner is still up, hold off until it is gone. */
  function start() {
    var MAX_WAIT_MS = 30000;
    setTimeout(function () {
      if (!consentVisible()) { open(); return; }
      var waited = 0;
      var poll = setInterval(function () {
        waited += 300;
        if (!consentVisible() || waited >= MAX_WAIT_MS) {
          clearInterval(poll);
          open();
        }
      }, 300);
    }, DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
