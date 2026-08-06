/* Entry popup: short callback form, shown once per visit.
 *
 * Fires 3 seconds after the first page of a session loads. The sessionStorage
 * flag is set the moment it fires, so navigating on within the same visit never
 * shows it again. Skipped entirely on the form and thank-you pages, and for
 * anyone who has already submitted a lead this session. */
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
        '<h2 id="leadPopTitle">Want us to call you back?</h2>' +
        '<p class="lead-pop-sub">Leave your number and one of our team will ring you as soon as we can. No fees, no obligation, no pressure.</p>' +
        '<form class="lead-pop-form" novalidate>' +
          '<input type="text" name="name" id="leadPopName" placeholder="Your name" autocomplete="name" required>' +
          '<input type="tel" name="phone" id="leadPopPhone" placeholder="Phone number" autocomplete="tel" required>' +
          '<input type="text" name="address" id="leadPopAddress" placeholder="Property address or postcode" autocomplete="street-address" required>' +
          '<button type="submit" class="lead-pop-submit">Request My Callback &rarr;</button>' +
          '<p class="lead-pop-err" role="alert" hidden></p>' +
        '</form>' +
        '<p class="lead-pop-alt">Would you rather talk now? <a href="tel:+447739063734" data-track="phone-tap">07739 063734</a></p>' +
      '</div>';
    return wrap;
  }

  function close(el) {
    el.classList.remove('is-open');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(el, form) {
    var name = (document.getElementById('leadPopName').value || '').trim();
    var phone = (document.getElementById('leadPopPhone').value || '').trim();
    var address = (document.getElementById('leadPopAddress').value || '').trim();
    var err = form.querySelector('.lead-pop-err');

    if (!name || !phone || !address) {
      err.textContent = 'Please fill in all three fields so we can call you back.';
      err.hidden = false;
      return;
    }
    err.hidden = true;

    var parts = name.split(' ');
    var slug = (window.location.pathname.replace(/^\/|\/$/g, '') || 'home');
    var data = {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      phone: phone,
      address1: address,
      /* Same pipeline context the main form sends, so GHL can tag both alike. */
      sourcePage: slug,
      sourceUrl: window.location.href,
      pageTitle: document.title,
      formType: 'entry-popup',
      leadSource: 'website',
      area: (slug.match(/(sheffield|rotherham|doncaster|barnsley|chesterfield|worksop|retford|gainsborough|mansfield)/) || [''])[0]
    };
    try {
      var p = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) {
        if (p.get(k)) data[k] = p.get(k);
      });
      data.referrer = document.referrer || '';
    } catch (e) {}

    var btn = form.querySelector('.lead-pop-submit');
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (res.ok) {
        setFlag(LEAD_KEY);
        window.location.href = '/thank-you/';
        return;
      }
      throw new Error('bad response');
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = orig;
      err.innerHTML = 'Sorry, we could not send that just now. Please try again, or ring us on <a href="tel:+447739063734">07739 063734</a>.';
      err.hidden = false;
    });
  }

  function open() {
    if (flag(SEEN_KEY) || flag(LEAD_KEY)) return;
    setFlag(SEEN_KEY);

    lastFocus = document.activeElement;
    var el = build();
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { el.classList.add('is-open'); });

    var input = el.querySelector('#leadPopName');
    if (input) input.focus();

    el.querySelector('.lead-pop-close').addEventListener('click', function () { close(el); });
    el.addEventListener('click', function (e) { if (e.target === el) close(el); });
    el.querySelector('.lead-pop-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(el, this);
    });
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
