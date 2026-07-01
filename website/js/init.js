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
      try {
        if (sessionStorage.getItem('sypb_conversion_fired') !== '1') {
          sessionStorage.setItem('sypb_conversion_fired', '1');
          gtag('event', 'conversion', {
            send_to: 'AW-18125556330/uZetCNHoibIcEOqU-MJD',
            value: 300.0,
            currency: 'GBP'
          });
        }
      } catch (_) {}
    }
  }
})();
