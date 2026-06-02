/* South Yorkshire Property Buyers — site-wide animation layer
   Vanilla JS, no deps. Three independent features:

     1. .reveal      → IntersectionObserver fade/translate on scroll
     2. [data-counter]→ requestAnimationFrame count-up on first viewport hit
     3. #sypb-sticky-cta → fixed mobile bar after 30% scroll

   All three respect prefers-reduced-motion. All run after DOM ready.
*/
(function () {
  'use strict';

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ──────────────── 1. Scroll reveal ──────────────── */
  function initReveal() {
    var revealEls = document.querySelectorAll('.reveal:not(.in-view)');
    if (!revealEls.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ──────────────── 2. Stat counters ──────────────── */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-counter')) || 0;
    var decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
    var prefix = el.getAttribute('data-counter-prefix') || '';
    var suffix = el.getAttribute('data-counter-suffix') || '';
    var duration = parseInt(el.getAttribute('data-counter-duration') || '1500', 10);

    if (prefersReduced) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var elapsed = ts - start;
      var pct = Math.min(elapsed / duration, 1);
      var value = target * easeOutCubic(pct);
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (pct < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var counterEls = document.querySelectorAll('[data-counter]:not([data-counter-done])');
    if (!counterEls.length) return;

    if (!('IntersectionObserver' in window)) {
      counterEls.forEach(function (el) {
        animateCounter(el);
        el.setAttribute('data-counter-done', '1');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.hasAttribute('data-counter-done')) {
          animateCounter(entry.target);
          entry.target.setAttribute('data-counter-done', '1');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counterEls.forEach(function (el) { observer.observe(el); });
  }

  /* ──────────────── 3. Sticky mobile CTA bar ──────────────── */
  var STICKY_DISMISS_KEY = 'sypb-sticky-dismissed';
  var STICKY_PATH_EXCLUDE = /^\/(get-offer|thank-you|privacy-policy)\/?$/;
  var STICKY_SCROLL_THRESHOLD = 0.30; // 30% of page

  function initStickyCta() {
    if (STICKY_PATH_EXCLUDE.test(window.location.pathname)) return;
    try {
      if (window.sessionStorage && sessionStorage.getItem(STICKY_DISMISS_KEY) === '1') return;
    } catch (e) { /* sessionStorage blocked — proceed anyway */ }

    if (document.getElementById('sypb-sticky-cta')) return;

    var bar = document.createElement('div');
    bar.id = 'sypb-sticky-cta';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'Get a cash offer');
    bar.innerHTML =
      '<a class="sticky-cta-primary" href="/get-offer/">' +
        '<span class="sticky-cta-icon" aria-hidden="true">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a1 1 0 0 1-1-1v-6h-4v6a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2z"/>' +
          '</svg>' +
        '</span>' +
        'Free cash offer' +
      '</a>' +
      '<a class="sticky-cta-secondary" href="tel:07739063734" aria-label="Call us on 07739 063 734">' +
        '<span class="sticky-cta-icon" aria-hidden="true">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' +
          '</svg>' +
        '</span>' +
        'Call' +
      '</a>' +
      '<button class="sticky-cta-close" type="button" aria-label="Dismiss">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
      '</button>';

    document.body.appendChild(bar);

    bar.querySelector('.sticky-cta-close').addEventListener('click', function () {
      bar.classList.add('is-dismissed');
      try { sessionStorage.setItem(STICKY_DISMISS_KEY, '1'); } catch (e) {}
      setTimeout(function () { bar.remove(); }, 300);
    });

    var ticking = false;
    function check() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var scrolled = window.pageYOffset;
      var pct = docH > 0 ? scrolled / docH : 0;
      if (pct > STICKY_SCROLL_THRESHOLD) {
        bar.classList.add('is-visible');
      } else {
        bar.classList.remove('is-visible');
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(check);
        ticking = true;
      }
    }, { passive: true });
    check();
  }

  /* ──────────────── 4. WhatsApp floating button ──────────────── */
  var WHATSAPP_PATH_EXCLUDE = /^\/(get-offer|thank-you|privacy-policy)\/?$/;
  var WHATSAPP_NUMBER = '447739063734'; // +44 7739 063 734
  var WHATSAPP_MESSAGE = "Hi South Yorkshire Property Buyers — I'd like to discuss a cash offer for my property.";

  function initWhatsApp() {
    if (WHATSAPP_PATH_EXCLUDE.test(window.location.pathname)) return;
    if (document.getElementById('sypb-whatsapp-fab')) return;

    var btn = document.createElement('a');
    btn.id = 'sypb-whatsapp-fab';
    btn.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WHATSAPP_MESSAGE);
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Message us on WhatsApp');
    btn.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>' +
      '</svg>';

    document.body.appendChild(btn);
  }

  /* ──────────────── Boot ──────────────── */
  function boot() {
    initReveal();
    initCounters();
    initStickyCta();
    initWhatsApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
