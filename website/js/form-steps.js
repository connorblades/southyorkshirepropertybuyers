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
