/* Keep the postcode entry and enquiry on the modern-auction landing page.
   The ordinary GET form remains a working fallback without JavaScript. */
(function () {
  'use strict';

  var hero = document.getElementById('heroPostcode');
  var enquiry = document.getElementById('contactForm');
  if (!hero || !enquiry) return;

  hero.addEventListener('submit', function (event) {
    var input = document.getElementById('heroPostcodeInput');
    var postcode = document.getElementById('postcode');
    var next = enquiry.querySelector('.form-next');
    if (!input || !postcode || !next || !input.checkValidity()) return;

    event.preventDefault();
    postcode.value = input.value.trim();
    postcode.dispatchEvent(new Event('input', { bubbles: true }));

    var first = enquiry.querySelector('.form-step');
    if (first && !first.hidden) next.click();

    enquiry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var visible = enquiry.querySelector('.form-step:not([hidden])');
    var field = visible && visible.querySelector('input, select, textarea');
    if (field) field.focus({ preventScroll: true });
  });
})();
