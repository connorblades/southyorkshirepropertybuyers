/* South Yorkshire Property Buyers, stepped enquiry form.

   Progressive enhancement, deliberately. The markup already contains every
   field in a sensible order, so with this script blocked or broken the form is
   simply a normal one-page form and still submits. Nothing here touches the
   payload: site.js still reads each field by id, so what reaches /api/submit
   and GHL is unchanged apart from the postcode.

   Why steps at all: asking a stranger for nine fields at once is the biggest
   drop-off point on a paid landing page. One field to begin with is a much
   smaller thing to agree to, and people who start a form tend to finish it.

   Lives in an external file because the editor's format-on-save strips empty
   () from inline <script> blocks. */
(function () {
  'use strict';

  // Assign only after the contact fields are displayed. The unmeasured fallback
  // is the original form. Never change a seller's variant halfway through it.
  function showCallbackTest(form) {
    if (!form.dataset || form.dataset.callbackEmailTest !== 'v1' || form.dataset.callbackTestSeen) return;
    form.dataset.callbackTestSeen = '1';
    var email = form.querySelector('#email');
    var hint = form.querySelector('#emailRequirement');
    var written = form.querySelector('#writtenOfferRequested');
    if (!email || !hint || !written || typeof window.gtag !== 'function') return;

    var arm;
    try {
      if (localStorage.getItem('sypb_consent') !== 'granted') return;
      var key = 'sypb_callback_email_v1';
      arm = localStorage.getItem(key);
      if (arm !== 'control' && arm !== 'optional') {
        arm = Math.random() < 0.5 ? 'control' : 'optional';
        localStorage.setItem(key, arm);
      }
    } catch (_) { return; }

    if (arm === 'optional') {
      // Choose the written offer before encountering its required email field.
      email.closest('.form-group').before(written.closest('.form-group'));
      function updateRequirement() {
        email.required = written.checked;
        hint.classList.toggle('req', email.required);
        hint.removeAttribute('aria-hidden');
        hint.textContent = email.required ? '(required for a written offer)' : '(optional for a callback)';
      }
      written.addEventListener('change', updateRequirement);
      window.addEventListener('pageshow', updateRequirement);
      updateRequirement();
    }

    form.dataset.callbackEmailArm = arm;
    // Two event names make both user denominators available in the standard
    // Events report without registering a custom dimension or counting a lead.
    window.gtag('event', 'callback_email_' + arm, {
      send_to: 'G-VBWY8SPSCL',
      page_location: window.location.origin + window.location.pathname,
      page_referrer: ''
    });
  }

  function init(form) {
    var steps = [].slice.call(form.querySelectorAll('.form-step'));
    if (steps.length < 2) return;

    var submitBtn = form.querySelector('.form-submit');
    var current = 0;

    var nav = document.createElement('div');
    nav.className = 'form-nav';
    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'form-back';
    back.textContent = 'Back';
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'form-next';
    nav.appendChild(back);
    nav.appendChild(next);
    form.insertBefore(nav, submitBtn);

    var progress = document.createElement('p');
    progress.className = 'form-progress';
    progress.setAttribute('aria-live', 'polite');
    form.insertBefore(progress, steps[0]);

    var LABELS = ['Get my cash offer', 'Continue', 'Continue'];

    function show(i, focus) {
      current = i;
      steps.forEach(function (s, n) { s.hidden = n !== i; });
      var last = i === steps.length - 1;
      if (last) showCallbackTest(form);
      back.hidden = i === 0;
      next.hidden = last;
      nav.hidden = last && i === 0;
      submitBtn.hidden = !last;
      next.textContent = LABELS[i] || 'Continue';
      progress.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      if (focus) {
        var f = steps[i].querySelector('input, select, textarea');
        if (f) f.focus({ preventScroll: true });
      }
    }

    /* Only the fields on this step, so a later required field can't block it */
    function stepValid(i) {
      var fields = [].slice.call(steps[i].querySelectorAll('input, select, textarea'));
      for (var n = 0; n < fields.length; n++) {
        if (!fields[n].checkValidity()) {
          fields[n].reportValidity();
          return false;
        }
      }
      return true;
    }

    next.addEventListener('click', function () {
      if (!stepValid(current)) return;
      show(Math.min(current + 1, steps.length - 1), true);
    });

    back.addEventListener('click', function () {
      show(Math.max(current - 1, 0), true);
    });

    /* Enter should advance rather than submit a half-filled form */
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.tagName === 'TEXTAREA') return;
      if (current < steps.length - 1) {
        e.preventDefault();
        next.click();
      }
    });

    /* If the browser rejects something on an earlier step at submit time,
       jump back to it rather than failing silently on a hidden field. */
    form.addEventListener('invalid', function (e) {
      var owner = e.target.closest('.form-step');
      if (!owner) return;
      var i = steps.indexOf(owner);
      if (i > -1 && i !== current) show(i, true);
    }, true);

    show(0, false);
  }

  function boot() {
    var form = document.getElementById('offerForm') || document.getElementById('contactForm');
    if (form) init(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
