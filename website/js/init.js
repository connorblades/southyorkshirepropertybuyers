/* South Yorkshire Property Buyers, head init (runs before render).
   Loaded as a blocking <script src> in <head> on every page so it can:
     1. Apply the saved colour theme before first paint (no flash).
     2. Bootstrap Google tag + Consent Mode v2 defaults.
     3. On /thank-you/, gate access and fire the lead conversion once.
   Lives in an external file because the editor's format-on-save strips
   empty () from inline <script> blocks; external files are left intact. */
(function () {
  'use strict';

  /* 1. Theme, applied pre-paint to avoid a flash of the wrong mode */
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  } catch (e) {}

  /* 1b. Attribution, stashed before anything can navigate away.
     An ad click lands on the landing page with ?gclid=..., but the hero postcode
     field is a plain GET form pointing at /get-offer/, so submitting it replaces
     the whole query string and the click id is gone. That is the primary paid
     path on all nine landing pages, so without this the leads that matter most
     reach GHL with no click id, no campaign and no landing page: unattributable
     in the CRM and impossible to upload back to Ads as an offline conversion.
     Runs in <head> on every page, so it sees the params before any navigation. */
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
                   'utm_content', 'gclid', 'gbraid', 'wbraid', 'gad_source'];
  try {
    var q = new URLSearchParams(location.search);
    var found = {};
    ATTR_KEYS.forEach(function (k) { if (q.get(k)) found[k] = q.get(k); });
    if (Object.keys(found).length) {
      var prev = {};
      try { prev = JSON.parse(sessionStorage.getItem('sypb_attr') || '{}'); } catch (e) {}
      ATTR_KEYS.forEach(function (k) { if (found[k]) prev[k] = found[k]; });
      sessionStorage.setItem('sypb_attr', JSON.stringify(prev));
    }
    /* First page of the session, kept so a lead submitted on /get-offer/ still
       records which landing page the ad actually paid for. Never overwritten. */
    if (!sessionStorage.getItem('sypb_landing')) {
      sessionStorage.setItem('sypb_landing', JSON.stringify({
        page: location.pathname.replace(/^\/|\/$/g, '') || 'home',
        referrer: document.referrer || ''
      }));
    }
  } catch (e) {}

  /* 2. Google tag + Consent Mode v2 */
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', 'AW-18125556330');

  try {
    if (localStorage.getItem('sypb_consent') === 'granted') {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted'
      });
    }
  } catch (e) {}

  /* 3. Thank-you page: only reachable after a submit; fire conversion once */
  if (location.pathname.replace(/\/+$/, '') === '/thank-you') {
    var fromSubmit = false;
    try { fromSubmit = sessionStorage.getItem('sypb_lead_submitted') === '1'; } catch (_) {}
    if (!fromSubmit) {
      location.replace('/');
    } else {
      /* Enhanced conversions for leads. site.js stashed the seller's email and
         phone at submit. Send them only if advertising consent was actually
         given, then clear the stash either way so contact details never sit in
         storage after the conversion has fired. Google hashes these in the
         browser; nothing unhashed leaves the page. */
      var ec = null;
      try {
        var raw = sessionStorage.getItem('sypb_ec');
        sessionStorage.removeItem('sypb_ec');
        if (raw && localStorage.getItem('sypb_consent') === 'granted') {
          ec = JSON.parse(raw);
        }
      } catch (_) {}

      try {
        if (sessionStorage.getItem('sypb_conversion_fired') !== '1') {
          sessionStorage.setItem('sypb_conversion_fired', '1');
          if (ec && (ec.email || ec.phone_number)) {
            gtag('set', 'user_data', ec);
          }
          /* No value sent. A flat figure on every lead carries no signal that
             conversion-count bidding does not already have, and it reads as
             revenue in reports when nothing has been bought. Real deal values
             belong in an offline conversion upload keyed on the gclid above. */
          gtag('event', 'conversion', {
            send_to: 'AW-18125556330/uZetCNHoibIcEOqU-MJD'
          });
        }
      } catch (_) {}
    }
  }
})();
