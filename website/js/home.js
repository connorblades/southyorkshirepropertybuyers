/* South Yorkshire Property Buyers, homepage-only behaviour (deferred).
   Split from the shared site.js so its weight is not paid on the other
   96 pages. Every feature is element-guarded. Runs after DOM parse. */
(function () {
  'use strict';

  /* ---- Ad video: tap to unmute (audio synced to the muted looping video) ---- */
  (function () {
    var wrap = document.getElementById('videoWrap');
    var v = document.getElementById('adVideo');
    var iconMuted = document.getElementById('iconMuted');
    var iconSound = document.getElementById('iconSound');
    if (!wrap || !v) return;
    var src = window.innerWidth <= 600 ? '/media/sypb-video-ad-9x16.mp4' : '/media/sypb-video-ad-16x9.mp4';
    v.src = src;
    var isMuted = true;

    var audioEl = document.createElement('audio');
    audioEl.src = src;
    audioEl.loop = true;
    audioEl.volume = 1;
    document.body.appendChild(audioEl);

    wrap.addEventListener('click', function () {
      if (isMuted) {
        audioEl.currentTime = v.currentTime;
        audioEl.play();
        isMuted = false;
      } else {
        audioEl.pause();
        isMuted = true;
      }
      if (iconMuted) iconMuted.style.display = isMuted ? 'block' : 'none';
      if (iconSound) iconSound.style.display = isMuted ? 'none' : 'block';
    });
  })();

  /* ---- Hero video crossfade between two clips ---- */
  (function () {
    var v1 = document.getElementById('heroVid1');
    var v2 = document.getElementById('heroVid2');
    if (!v1 || !v2) return;
    var FADE_S = 1.5; // must match CSS transition duration
    var current = v1, next = v2;
    var prepared = false, fading = false;

    function onTimeUpdate(e) {
      if (e.target !== current || !current.duration) return;
      var remaining = current.duration - current.currentTime;
      if (!prepared && remaining < 2) {
        prepared = true;
        next.currentTime = 0;
        next.play().catch(function () {});
      }
      if (!fading && remaining < FADE_S) {
        fading = true;
        var incoming = next, outgoing = current;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            incoming.style.opacity = '1';
            outgoing.style.opacity = '0';
            current = incoming;
            next = outgoing;
            prepared = false;
            fading = false;
          });
        });
      }
    }
    v1.addEventListener('timeupdate', onTimeUpdate);
    v2.addEventListener('timeupdate', onTimeUpdate);
  })();

  /* ---- Scroll progress bar ---- */
  (function () {
    var scrollBar = document.getElementById('scrollProgress');
    if (!scrollBar) return;
    window.addEventListener('scroll', function () {
      var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
      scrollBar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
  })();

  /* ---- Nav active-section highlight ---- */
  (function () {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-links a');
    if (!sections.length || !navLinks.length) return;
    window.addEventListener('scroll', function () {
      var current = '';
      sections.forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      });
      navLinks.forEach(function (a) {
        a.style.color = a.getAttribute('href') === '#' + current ? 'var(--green)' : '';
      });
    }, { passive: true });
  })();

  /* ---- About-stats count-up ---- */
  (function () {
    var anchor = document.querySelector('.about-stats');
    var stats = document.querySelectorAll('.stat-val[data-count]');
    if (!anchor || !stats.length || !('IntersectionObserver' in window)) return;
    var observed = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !observed) {
          observed = true;
          stats.forEach(function (el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var numEl = el.querySelector('.count-num');
            if (!numEl || target === 0) return;
            var duration = 1400;
            var startTime = null;
            function step(ts) {
              if (!startTime) startTime = ts;
              var progress = Math.min((ts - startTime) / duration, 1);
              var ease = 1 - Math.pow(1 - progress, 3);
              numEl.textContent = Math.floor(ease * target);
              if (progress < 1) requestAnimationFrame(step);
              else numEl.textContent = target;
            }
            requestAnimationFrame(step);
          });
        }
      });
    }, { threshold: 0.5 });
    observer.observe(anchor);
  })();

  /* ---- Modal close helpers (the blog-preview modal shell is inert:
         it is never opened, but its markup keeps these onclick hooks) ---- */
  function closePost() {
    var o = document.getElementById('modalOverlay');
    if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  }
  window.closePost = closePost;
  window.closePostOutside = function (e) {
    if (e && e.target === document.getElementById('modalOverlay')) closePost();
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePost(); });
})();
