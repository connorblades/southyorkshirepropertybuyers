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

    /* Anti-spam, both invisible to a real user. A timestamp taken when the page
       renders lets the server reject a submission nobody could have typed, and
       the honeypot is an off-screen field only a bot fills in. */
    var formShownAt = Date.now();

    /* UK phone to E.164, which is the only format Google accepts for enhanced
       conversions. Returns '' when the number can't be read confidently, so a
       wrong number is never sent. */
    function toE164(raw) {
      var s = String(raw || '').replace(/[^\d+]/g, '');
      if (!s) return '';
      if (s.charAt(0) === '+') return s;
      if (s.slice(0, 2) === '00') return '+' + s.slice(2);
      if (s.charAt(0) === '0') return s.length >= 10 ? '+44' + s.slice(1) : '';
      if (s.length === 10) return '+44' + s;
      return '';
    }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fullName = (document.getElementById('name').value || '').trim().split(' ');
      var data = {
        firstName: fullName[0] || '',
        lastName: fullName.slice(1).join(' ') || '',
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address1: document.getElementById('address').value,
        postcode: (document.getElementById('postcode') || {}).value || '',
        propertyType: document.getElementById('type').value,
        timeline: document.getElementById('timeline').value,
        situation: document.getElementById('situation').value,
        notes: document.getElementById('message').value
      };

      /* Pipeline context: lets GHL tag and route the lead without manual triage. */
      var hp = form.querySelector('.hp-field input');
      data._hp = hp ? hp.value : '';
      data._elapsed = Date.now() - formShownAt;

      if (data.postcode && data.address1.indexOf(data.postcode) === -1) {
        data.address1 = (data.address1 + ', ' + data.postcode).replace(/^, /, '');
      }

      var slug = (window.location.pathname.replace(/^\/|\/$/g, '') || 'home');
      data.sourcePage = slug;
      data.sourceUrl = window.location.href;
      data.pageTitle = document.title;
      data.pageType = slug === 'home' ? 'homepage'
        : /^sell-house-fast-|^cash-house-buyer-/.test(slug) ? 'location'
        : slug.indexOf('blog/') === 0 ? 'blog'
        : slug === 'get-offer' ? 'form'
        : 'situation';
      data.area = (slug.match(/(sheffield|rotherham|doncaster|barnsley|chesterfield|worksop|retford|gainsborough|mansfield)/) || [''])[0];
      data.leadSource = 'website';
      try {
        var p = new URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) {
          if (p.get(k)) data[k] = p.get(k);
        });
        data.referrer = document.referrer || '';
      } catch (_) {}
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
          /* Enhanced conversions: hand the two highest-matching identifiers to
             /thank-you/, where init.js sends them with the conversion. Email and
             phone only. The address field is one free-text box and Google wants
             a name, postcode and country set, so a split would be guesswork and
             would put more of the seller's details in storage for no gain.
             init.js clears this whether or not it ends up sending it. */
          try {
            var ec = {};
            var em = (data.email || '').trim().toLowerCase();
            var ph = toE164(data.phone);
            if (em) ec.email = em;
            if (ph) ec.phone_number = ph;
            if (ec.email || ec.phone_number) {
              sessionStorage.setItem('sypb_ec', JSON.stringify(ec));
            }
          } catch (_) {}
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

  /* ---- Phone tap tracking (Google Ads conversion) ---- */
  (function () {
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('[data-track="phone-tap"]') : null;
      if (!link) return;
      if (typeof window.gtag !== 'function') return;
      // Two events on purpose. 'conversion' with send_to is what Google Ads
      // counts; without it the tap was invisible and Ads would have bid
      // toward form fills alone, which on this site misses most of the value.
      // 'phone_tap' is kept as the plain event for reporting later.
      //
      // No dedupe here, unlike the form conversion on /thank-you/. The Ads
      // action counts One per click, so a second tap after a call that did not
      // connect is still one conversion, and suppressing it locally would only
      // hide a genuine repeat attempt.
      window.gtag('event', 'conversion', {
        send_to: 'AW-18125556330/B_aQCP-epOEcEOqU-MJD'
      });
      window.gtag('event', 'phone_tap', {
        event_category: 'contact',
        page_path: window.location.pathname
      });
    }, true);
  })();
})();

/* ---- Hero postcode: arrive on the offer page with step 1 already answered ----
   The hero field is a plain GET form pointing at /get-offer/, so submitting it
   navigates there with ?postcode=... and works with no JavaScript at all. It
   used to scroll to the form embedded at the foot of the same page, but these
   pages run to several thousand pixels and a smooth scroll that far reads as
   the page running away from the reader.

   All this does is receive it: fill the postcode on the offer page and move to
   step 2, so nobody is asked for the same thing twice. Runs on a timeout so it
   lands after form-steps.js has built the step nav. */
(function () {
  'use strict';
  function boot() {
    var target = document.getElementById('postcode');
    if (!target) return;
    var m = /[?&]postcode=([^&]*)/.exec(window.location.search);
    if (!m) return;
    var value = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
    if (!value) return;

    target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));

    var form = document.getElementById('offerForm') || document.getElementById('contactForm');

    /* form-steps.js builds .form-next, and both files are deferred, so which
       runs first is not guaranteed. Waiting for the button rather than assuming
       it exists is the difference between landing on step 2 and being bounced
       back to step 1 by form-steps' own initial show(0). */
    var tries = 0;
    (function advance() {
      var next = form && form.querySelector('.form-next');
      if (next) {
        next.click();
        reveal();
        return;
      }
      if (++tries < 40) { requestAnimationFrame(advance); return; }
      target.focus({ preventScroll: true });
      reveal();
    })();

    /* Bring the form into view. The offer page is short, so this is a few
       hundred pixels rather than the several thousand that scrolling to the
       foot of a landing page used to be. */
    function reveal() {
      if (!form) return;
      var top = form.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' });
    }
  }
  function ready() { setTimeout(boot, 0); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
