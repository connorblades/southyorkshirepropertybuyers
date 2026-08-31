/* Help launcher: a small prompt that routes to a callback or a phone call.
 *
 * Deliberately NOT a chat. There is nobody on the other end of a live chat
 * here, and a text box that looks like one sets an expectation we cannot meet.
 * The only two useful actions are the form and the phone, so this offers those
 * two and nothing else.
 *
 * It also stays out of the way: the entry popup already interrupts once per
 * visit, so this never opens itself. It nudges with a label for a few seconds,
 * collapses to an icon, and waits to be tapped.
 *
 * Builds its own markup so no page template had to change. Lives in an external
 * file because the editor's format-on-save strips empty () from inline script. */
(function () {
  'use strict';

  var PHONE = '+447445629113';
  var PHONE_LABEL = '07445 629113';
  var SKIP_PATHS = ['/get-offer/', '/thank-you/'];
  var DISMISS_KEY = 'sypb_helper_dismissed';
  var LEAD_KEY = 'sypb_lead_submitted';
  var COLLAPSE_MS = 6000;

  function flag(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function setFlag(key) {
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
  }

  var path = window.location.pathname;
  for (var i = 0; i < SKIP_PATHS.length; i++) {
    /* Already on the form, or just submitted. Nothing to offer. */
    if (path.indexOf(SKIP_PATHS[i]) === 0) return;
  }
  if (flag(DISMISS_KEY) || flag(LEAD_KEY)) return;

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* The form lives on the page on most templates, and on /get-offer/ elsewhere */
  var formHref = document.getElementById('contact') ? '#contact' : '/get-offer/';

  /* The consent banner is fixed to the bottom of the screen and would sit on
     top of this, swallowing the tap. site.js toggles it with inline display,
     so read computed style rather than offsetParent, which is always null for
     a fixed element. Same approach popup.js uses. */
  function consentVisible() {
    var el = document.getElementById('sypb-consent');
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
  }
  function whenClear(fn) {
    if (!consentVisible()) { fn(); return; }
    var waited = 0;
    var timer = setInterval(function () {
      waited += 400;
      if (!consentVisible() || waited > 60000) { clearInterval(timer); fn(); }
    }, 400);
  }

  function mount() {
  var root = document.createElement('div');
  root.className = 'sypb-helper';
  root.innerHTML =
    '<div class="sypb-helper-panel" id="sypbHelperPanel" role="dialog" aria-modal="false" aria-labelledby="sypbHelperTitle" hidden>' +
      '<button class="sypb-helper-close" type="button" aria-label="Close">' + CLOSE + '</button>' +
      '<h2 id="sypbHelperTitle">Want to speak to someone?</h2>' +
      '<p>Tell us about the property and we\'ll ring you back, or call us now if that\'s easier.</p>' +
      '<a class="sypb-helper-primary" href="' + formHref + '" data-helper="form">Request a callback</a>' +
      '<a class="sypb-helper-secondary" href="tel:' + PHONE + '" data-track="phone-tap">Call ' + PHONE_LABEL + '</a>' +
    '</div>' +
    '<button class="sypb-helper-launch" id="sypbHelperLaunch" type="button" aria-expanded="false" aria-controls="sypbHelperPanel">' +
      '<span class="sypb-helper-icon">' + ICON + '</span>' +
      '<span class="sypb-helper-label">Need a hand?</span>' +
    '</button>';
  document.body.appendChild(root);

  var launch = root.querySelector('#sypbHelperLaunch');
  var panel = root.querySelector('#sypbHelperPanel');
  var closeBtn = root.querySelector('.sypb-helper-close');

  /* Nudge, then get out of the way */
  var collapse = setTimeout(function () { root.classList.add('is-collapsed'); }, COLLAPSE_MS);

  function open() {
    clearTimeout(collapse);
    root.classList.add('is-collapsed');
    panel.hidden = false;
    root.classList.add('is-open');
    launch.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }
  function close(dismiss) {
    panel.hidden = true;
    root.classList.remove('is-open');
    launch.setAttribute('aria-expanded', 'false');
    if (dismiss) { setFlag(DISMISS_KEY); root.parentNode.removeChild(root); }
  }

  launch.addEventListener('click', function () {
    if (root.classList.contains('is-open')) close(false); else open();
  });
  closeBtn.addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('is-open')) { close(false); launch.focus(); }
  });
  /* Taking either action is the end of it for this visit */
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) { setFlag(DISMISS_KEY); }
  });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { whenClear(mount); });
  } else {
    whenClear(mount);
  }
})();
