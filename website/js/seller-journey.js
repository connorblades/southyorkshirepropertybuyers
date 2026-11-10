/* Consented diagnostic events for seller landing pages and the enquiry form.
   This file is not loaded by the homepage. It never changes form behaviour,
   submits data, configures Ads, or emits a conversion or generate_lead event.
   Only controlled codes and public paths are sent. Never read field values. */
(function () {
  'use strict';

  var GA = 'G-VBWY8SPSCL';
  var CONTEXT_KEY = 'sypb_seller_cta';
  var CONTEXT_AGE = 30 * 60 * 1000;
  var VERSION = '20261110';

  function pathOnly(value) {
    var path = String(value || '').split(/[?#]/)[0];
    return /^\/[a-z0-9\/-]{0,180}$/i.test(path) ? path : '';
  }

  function consented() {
    try { return localStorage.getItem('sypb_consent') === 'granted'; }
    catch (_) { return false; }
  }

  function clearContext() {
    try { sessionStorage.removeItem(CONTEXT_KEY); } catch (_) {}
  }

  var placements = ['hero', 'header', 'mobile_menu', 'process_1', 'process_2',
    'process_3', 'sticky', 'helper', 'closing', 'footer', 'guide', 'content'];

  function ctaContext() {
    if (!consented()) { clearContext(); return null; }
    try {
      var saved = JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || 'null');
      var cleanPath = saved && pathOnly(saved.path);
      if (saved && cleanPath && placements.indexOf(saved.placement) > -1 &&
          typeof saved.at === 'number' && Date.now() - saved.at >= 0 &&
          Date.now() - saved.at < CONTEXT_AGE) {
        return { path: cleanPath, placement: saved.placement, at: saved.at };
      }
    } catch (_) {}
    clearContext();
    return null;
  }

  function rememberCTA(path, placement) {
    if (!consented()) return;
    try {
      sessionStorage.setItem(CONTEXT_KEY, JSON.stringify({
        path: path, placement: placement, at: Date.now()
      }));
    } catch (_) {}
  }

  function boot() {
    var page = pathOnly(window.location.pathname);
    if (!page || page === '/') return;
    var form = document.getElementById('offerForm');
    var landing = document.querySelector('main.simple-landing');
    var guide = document.querySelector('main.seller-guide');
    if (!landing && !guide && !(page.replace(/\/$/, '') === '/get-offer' && form)) return;

    var pageSent = false;
    var active = false;
    var sections;
    var sectionSeen = {};
    var stepSeen = {};
    var stepStarted = {};
    var lastStep = null;
    var pendingMove = null;
    var pendingSubmit = false;
    var invalidSeen = {};
    var lastHeroClick = 0;
    var entry = 'content';
    if (form) {
      try { entry = new URLSearchParams(window.location.search).has('postcode') ? 'postcode_link' : 'direct'; }
      catch (_) { entry = 'direct'; }
    }

    function emit(name, details) {
      if (!consented() || typeof window.gtag !== 'function') return false;
      var params = {
        send_to: GA,
        page_location: window.location.origin + page,
        page_referrer: '',
        seller_entry: entry,
        seller_version: VERSION
      };
      try {
        if (document.referrer) {
          var ref = new URL(document.referrer);
          params.page_referrer = ref.origin + (ref.origin === window.location.origin ? pathOnly(ref.pathname) : '/');
        }
        var context = form ? ctaContext() : null;
        params.seller_origin = context ? context.path : page;
        if (context) params.seller_placement = context.placement;
        Object.keys(details || {}).forEach(function (key) { params[key] = details[key]; });
        window.gtag('event', name, params);
        return true;
      } catch (_) { return false; }
    }

    function placement(el) {
      if (el.closest('.sypb-helper')) return 'helper';
      if (el.closest('#sypb-sticky-cta')) return 'sticky';
      if (el.closest('#mobileMenu')) return 'mobile_menu';
      if (el.closest('nav, header')) return 'header';
      if (el.closest('footer')) return 'footer';
      if (el.closest('.sl-hero, .page-hero, #heroPostcode')) return 'hero';
      if (el.closest('.sl-last')) return 'closing';
      if (el.closest('.sl-guide-link, .sl-guides')) return 'guide';
      var card = el.closest('.how-step');
      if (card) {
        var cards = [].slice.call(document.querySelectorAll('.sl-process .how-step'));
        var index = cards.indexOf(card);
        if (index >= 0 && index < 3) return 'process_' + (index + 1);
      }
      return 'content';
    }

    function currentStep() {
      if (!form) return '';
      var steps = [].slice.call(form.querySelectorAll('.form-step'));
      var visible = steps.filter(function (step) { return !step.hidden; });
      if (visible.length !== 1) return 'all';
      var number = visible[0].getAttribute('data-step');
      return ['1', '2', '3'].indexOf(number) > -1 ? number : 'all';
    }

    function viewStep() {
      if (!form) return;
      var step = currentStep();
      if (!stepSeen[step] && emit('seller_form_step', { seller_step: step, seller_action: 'view' })) {
        stepSeen[step] = true;
      }
    }

    function watchSections() {
      if (!window.IntersectionObserver || sections) return;
      var targets = [
        ['.sl-hero h1', 'hero'], ['.sl-benefits', 'benefits'],
        ['.sl-intro h2', 'context'], ['.sl-process h2', 'process'],
        ['.sl-understanding h2', 'understanding'], ['.sl-faq h2', 'faq'],
        ['.sl-guide-link h2', 'guide'], ['.sl-last h2', 'closing'],
        ['.seller-guide h1', 'guide_intro'], ['.seller-guide .sl-last h2', 'closing']
      ];
      sections = new IntersectionObserver(function (entries) {
        entries.forEach(function (item) {
          var code = item.target.getAttribute('data-seller-section');
          if (!item.isIntersecting || item.intersectionRatio < 0.5 || sectionSeen[code] || document.visibilityState === 'hidden') return;
          if (emit('seller_section_view', { seller_section: code })) {
            sectionSeen[code] = true;
            sections.unobserve(item.target);
          }
        });
      }, { threshold: 0.5 });
      targets.forEach(function (target) {
        var el = document.querySelector(target[0]);
        if (!el) return;
        el.setAttribute('data-seller-section', target[1]);
        if (!sectionSeen[target[1]]) sections.observe(el);
      });
    }

    function activate() {
      if (!consented()) {
        active = false;
        clearContext();
        if (sections) { sections.disconnect(); sections = null; }
        return false;
      }
      if (!active) {
        active = true;
        if (!pageSent) pageSent = emit('seller_page_view', { seller_action: 'entry' });
        viewStep();
        watchSections();
      }
      return true;
    }

    function recordCTA(el, destination, action) {
      var where = placement(el);
      if (destination === '/get-offer/') rememberCTA(page, where);
      emit('seller_cta_click', {
        seller_placement: where, seller_destination: destination, seller_action: action
      });
    }

    document.addEventListener('click', function (event) {
      if (!event.isTrusted) return;
      // Consent controls run before this bubbling handler. Do not replay any
      // earlier interactions when someone accepts measurement later.
      if (!activate()) return;
      var el = event.target.closest ? event.target.closest('a, button') : null;
      if (!el) return;
      var hero = el.closest('#heroPostcode');
      if (hero && el.type === 'submit') {
        lastHeroClick = Date.now();
        recordCTA(el, '/get-offer/', 'click');
        return;
      }
      if (el.tagName !== 'A') return;
      var href = el.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) { recordCTA(el, 'phone', 'click'); return; }
      try {
        var url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        var destination = pathOnly(url.pathname);
        if (destination.replace(/\/$/, '') === '/get-offer') {
          recordCTA(el, '/get-offer/', 'click');
        } else if (/^\/(guides|blog)\//.test(destination)) {
          emit('seller_guide_click', {
            seller_placement: placement(el), seller_destination: destination, seller_action: 'click'
          });
        }
      } catch (_) {}
    });

    // Capture before the existing form's click handlers. A .click() used by
    // postcode handoff is untrusted and never completes a user form step.
    if (form) form.addEventListener('click', function (event) {
      if (!event.isTrusted || !consented()) return;
      var button = event.target.closest ? event.target.closest('.form-next, .form-back') : null;
      if (!button) return;
      pendingMove = {
        from: currentStep(), action: button.classList.contains('form-back') ? 'back' : 'complete', at: Date.now()
      };
    }, true);
    if (form) form.addEventListener('keydown', function (event) {
      // form-steps.js turns a real Enter key into a synthetic Next click.
      // Preserve that real intent without counting postcode auto advancement.
      if (!event.isTrusted || event.defaultPrevented || event.repeat || event.key !== 'Enter' ||
          event.target.tagName === 'TEXTAREA' || !consented()) return;
      var step = currentStep();
      if (step === '1' || step === '2') {
        pendingMove = { from: step, action: 'complete', at: Date.now() };
      }
    }, true);

    var heroForm = document.getElementById('heroPostcode');
    if (heroForm) heroForm.addEventListener('submit', function () {
      if (!activate()) return;
      // An Enter key can navigate without a preceding pointer click.
      if (Date.now() - lastHeroClick > 1000) recordCTA(heroForm, '/get-offer/', 'keyboard_submit');
    });

    var fieldCodes = {
      postcode: 'postcode', heroPostcodeInput: 'postcode', address: 'address',
      type: 'property_type', timeline: 'timeline', situation: 'situation',
      name: 'name', phone: 'phone', email: 'email', message: 'message'
    };
    document.addEventListener('invalid', function (event) {
      var field = fieldCodes[event.target.id];
      if (!field || !event.target.closest('#offerForm, #heroPostcode') || !activate()) return;
      var state = event.target.validity || {};
      var error = state.valueMissing ? 'required' : state.typeMismatch ? 'type' :
        state.patternMismatch ? 'pattern' : state.tooLong ? 'length' : 'invalid';
      var step = form ? currentStep() : 'hero';
      var key = step + ':' + field + ':' + error;
      // checkValidity then reportValidity can raise the same invalid event.
      if (invalidSeen[key] && Date.now() - invalidSeen[key] < 1000) return;
      if (emit('seller_form_validation', {
        seller_step: step, seller_field: field, seller_error: error
      })) invalidSeen[key] = Date.now();
      pendingMove = null;
    }, true);

    if (form) {
      ['input', 'change'].forEach(function (name) {
        form.addEventListener(name, function (event) {
          if (!event.isTrusted || !fieldCodes[event.target.id] || !activate()) return;
          var step = currentStep();
          if (!stepStarted[step] && emit('seller_form_step', { seller_step: step, seller_action: 'start' })) {
            stepStarted[step] = true;
          }
        });
      });
      form.addEventListener('submit', function () {
        pendingSubmit = true;
        if (activate()) emit('seller_form_step', { seller_step: currentStep(), seller_action: 'submit_attempt' });
      }, true);
      lastStep = currentStep();
      if (window.MutationObserver) new MutationObserver(function () {
        var step = currentStep();
        if (step !== lastStep) {
          if (pendingMove && pendingMove.from === lastStep && Date.now() - pendingMove.at < 2000) {
            emit('seller_form_step', { seller_step: lastStep, seller_action: pendingMove.action });
          }
          pendingMove = null;
          lastStep = step;
          viewStep();
        }
        var submit = form.querySelector('.form-submit');
        if (pendingSubmit && document.getElementById('formErrorNote') && submit && !submit.disabled) {
          emit('seller_form_error', { seller_step: currentStep(), seller_error: 'submit_failed' });
          pendingSubmit = false;
        }
      }).observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
    }

    [].slice.call(document.querySelectorAll('main details')).forEach(function (item, index) {
      var seen = false;
      item.addEventListener('toggle', function () {
        if (seen || !item.open || !activate()) return;
        if (emit('seller_faq_open', { seller_section: 'details_' + (index + 1) })) seen = true;
      });
    });
    [].slice.call(document.querySelectorAll('main .faq-q')).forEach(function (button, index) {
      var seen = false;
      button.addEventListener('click', function (event) {
        if (!event.isTrusted || seen) return;
        setTimeout(function () {
          if (button.getAttribute('aria-expanded') === 'true' && activate() &&
              emit('seller_faq_open', { seller_section: 'question_' + (index + 1) })) seen = true;
        }, 0);
      });
    });
    window.addEventListener('storage', function (event) {
      if (event.key === 'sypb_consent') activate();
    });
    activate();
  }

  function safeBoot() { try { boot(); } catch (_) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBoot);
  else safeBoot();
})();
