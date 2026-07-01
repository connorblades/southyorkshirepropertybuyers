/* South Yorkshire Property Buyers, shared site behaviour (deferred).
   One external file, loaded site-wide, replacing the per-page inline
   <script> boilerplate that the editor's format-on-save kept corrupting
   (it strips empty () from inline scripts; external files are safe).
   Every feature is element-guarded, so this file is inert on pages that
   do not use a given component. Runs after DOM parse (script is deferred). */
(function () {
  'use strict';

  /* ---- Nav dropdowns (hover + outside-click close) ---- */
  (function () {
    var items = document.querySelectorAll('.nav-item');
    if (!items.length) return;
    items.forEach(function (item) {
      var dropdown = item.querySelector('.dropdown');
      if (!dropdown) return;
      var timer = null;
      function open() {
        clearTimeout(timer);
        items.forEach(function (el) { if (el !== item) el.classList.remove('open'); });
        item.classList.add('open');
      }
      function scheduleClose() {
        timer = setTimeout(function () { item.classList.remove('open'); }, 400);
      }
      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', scheduleClose);
      dropdown.addEventListener('mouseenter', function () { clearTimeout(timer); });
      dropdown.addEventListener('mouseleave', scheduleClose);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-item')) {
        document.querySelectorAll('.nav-item').forEach(function (el) { el.classList.remove('open'); });
      }
    });
  })();

  /* ---- Mobile menu ---- */
  (function () {
    var mobileBtn = document.getElementById('mobileMenuBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (!mobileBtn || !mobileMenu) return;
    mobileBtn.addEventListener('click', function () {
      var isOpen = mobileBtn.classList.contains('open');
      mobileBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.setAttribute('aria-hidden', String(isOpen));
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        mobileBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  })();

  /* ---- Theme toggle ---- */
  (function () {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    var root = document.documentElement;
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  })();

  /* ---- FAQ accordion ---- */
  function toggleFaq(el) {
    var item = el.closest('.faq-item');
    if (!item) return;
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function (i) {
      i.classList.remove('open');
      var q = i.querySelector('.faq-q');
      if (q) q.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      var q = item.querySelector('.faq-q');
      if (q) q.setAttribute('aria-expanded', 'true');
    }
  }
  window.toggleFaq = toggleFaq;
  document.querySelectorAll('.faq-q').forEach(function (q) {
    if (q.getAttribute('onclick')) return; // pages that call toggleFaq(this) inline
    q.addEventListener('click', function () { toggleFaq(q); });
  });

  /* ---- Cookie consent ---- */
  (function () {
    function sypbConsent(choice) {
      try { localStorage.setItem('sypb_consent', choice); } catch (e) {}
      if (typeof gtag === 'function') {
        gtag('consent', 'update', {
          ad_storage: choice,
          ad_user_data: choice,
          ad_personalization: choice,
          analytics_storage: choice
        });
      }
      var b = document.getElementById('sypb-consent');
      if (b) b.style.display = 'none';
    }
    window.sypbConsent = sypbConsent;
    try {
      if (!localStorage.getItem('sypb_consent')) {
        var b = document.getElementById('sypb-consent');
        if (b) b.style.display = 'block';
      }
    } catch (e) {
      var bb = document.getElementById('sypb-consent');
      if (bb) bb.style.display = 'block';
    }
  })();

  /* ---- Sticky mobile CTA (static bar, reveal after 30% scroll) ---- */
  (function () {
    var bar = document.getElementById('sypb-sticky-cta');
    if (!bar) return;
    try {
      if (sessionStorage.getItem('sypb_cta_dismissed') === '1' ||
          sessionStorage.getItem('sypb_lead_submitted') === '1') return;
    } catch (_) {}
    var shown = false;
    function onScroll() {
      var max = document.body.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      if (!shown && window.scrollY / max > 0.3) {
        shown = true;
        bar.classList.add('is-visible');
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    var closeBtn = bar.querySelector('.sticky-cta-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        bar.classList.remove('is-visible');
        bar.classList.add('is-dismissed');
        try { sessionStorage.setItem('sypb_cta_dismissed', '1'); } catch (_) {}
      });
    }
  })();

  /* ---- Lead form (get-offer + homepage contact) ---- */
  (function () {
    var form = document.getElementById('offerForm') || document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fullName = (document.getElementById('name').value || '').trim().split(' ');
      var data = {
        firstName: fullName[0] || '',
        lastName: fullName.slice(1).join(' ') || '',
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address1: document.getElementById('address').value,
        propertyType: document.getElementById('type').value,
        timeline: document.getElementById('timeline').value,
        situation: document.getElementById('situation').value,
        notes: document.getElementById('message').value
      };
      var submitBtn = form.querySelector('.form-submit');
      var origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      try {
        var response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          try { sessionStorage.setItem('sypb_lead_submitted', '1'); } catch (_) {}
          window.location.href = '/thank-you/';
          return;
        }
      } catch (_) {}
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      var err = document.getElementById('formErrorNote');
      if (!err) {
        err = document.createElement('p');
        err.id = 'formErrorNote';
        err.setAttribute('role', 'alert');
        err.style.cssText = 'margin-top:0.9rem;padding:0.8rem 1rem;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:0.95rem;';
        err.innerHTML = 'Sorry, we could not send your enquiry just now. Please try again in a moment, or email us at <a href="mailto:hello@southyorkshirepropertybuyers.com" style="color:inherit;font-weight:700;">hello@southyorkshirepropertybuyers.com</a>.';
        form.appendChild(err);
      }
    });
  })();
})();
