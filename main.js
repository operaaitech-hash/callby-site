/* CALLBY website: parallax, reveals, live app preview, invitation form. No frameworks. */
(function () {
  'use strict';
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:';
  // Where the live CALLBY API and the web build of the app live. Change these for production.
  var CONFIG = {
    api: local ? 'http://localhost:3001' : 'https://api.callby.app',
    app: local ? 'http://localhost:8081' : 'https://preview.callby.app',
  };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- nav
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var onScrollNav = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
  toggle.addEventListener('click', function () { nav.classList.toggle('open'); });
  document.querySelectorAll('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });

  // ---- reveals
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // ---- parallax: each element drifts by (distance from viewport centre) x speed
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0 };
  });
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      var centre = r.top + r.height / 2 - vh / 2;
      if (centre > vh * 1.5 || centre < -vh * 1.5) return;
      it.el.style.transform = 'translate3d(0,' + (centre * it.speed).toFixed(1) + 'px,0)';
    });
  }
  if (!reduce) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', frame);
    frame();
  }

  // ---- hero card tilt follows the pointer
  var card = document.getElementById('promoCard');
  if (card && !reduce && window.matchMedia('(hover: hover)').matches) {
    var hero = card.closest('.hero');
    hero.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / r.width;
      var y = (e.clientY - (r.top + r.height / 2)) / r.height;
      card.style.transform = 'rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
    });
    hero.addEventListener('mouseleave', function () { card.style.transform = ''; });
  }

  // ---- route line draws itself as the hero comes into view
  var route = document.getElementById('routePath');
  if (route && !reduce) {
    var len = route.getTotalLength();
    route.style.strokeDasharray = len; route.style.strokeDashoffset = len;
    route.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.22,.61,.36,1) .4s';
    requestAnimationFrame(function () { requestAnimationFrame(function () { route.style.strokeDashoffset = 0; }); });
  }

  // ---- counters
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; cio.unobserve(el);
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var group = el.getAttribute('data-group') === 'true';
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / 1600);
        var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = (group ? v.toLocaleString('en-GB') : v) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      if (reduce) { el.textContent = (group ? target.toLocaleString('en-GB') : target) + suffix; } else requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });

  // ---- live app preview
  var frameEl = document.getElementById('appFrame');
  var phone = document.getElementById('phone');
  var loading = document.getElementById('phoneLoading');
  var role = 'customer';
  var loaded = false;
  function appUrl(r) { return CONFIG.app + '/home?role=' + r + '&preview=1'; }
  function goOffline() {
    // No live preview host: show a tap-through of the real app screens instead of a blank frame.
    phone.classList.add('offline'); loading.classList.add('hide');
    document.querySelector('.role-switch').style.display = 'none';
    document.getElementById('hints').style.display = 'none';
    var lede = document.getElementById('previewLede');
    if (lede) lede.textContent = 'Tap through the CALLBY app: the map with your chauffeurs nearby, every journey, your favourite chauffeurs, your cars and live tracking from booking to home.';
    startTour();
  }
  function loadApp() {
    if (loaded) return; loaded = true;
    // Probe the preview host first so an unreachable build shows the tour instead of a blank frame.
    var timer = setTimeout(goOffline, 9000);
    fetch(CONFIG.app + '/', { mode: 'no-cors', cache: 'no-store' }).then(function () {
      frameEl.src = appUrl(role);
      frameEl.addEventListener('load', function () { clearTimeout(timer); setTimeout(function () { loading.classList.add('hide'); }, 900); });
    }).catch(function () { clearTimeout(timer); goOffline(); });
  }

  // ---- static tour
  var tourIndex = 0, tourTimer = null;
  function startTour() {
    var track = document.getElementById('tourTrack');
    var slides = track.children.length;
    var dots = document.getElementById('tourDots');
    dots.innerHTML = '';
    for (var i = 0; i < slides; i++) {
      var d = document.createElement('button');
      d.setAttribute('aria-label', 'Screen ' + (i + 1));
      (function (n) { d.addEventListener('click', function () { show(n, true); }); })(i);
      dots.appendChild(d);
    }
    function show(n, user) {
      tourIndex = (n + slides) % slides;
      track.style.transform = 'translateX(' + (-100 * tourIndex) + '%)';
      Array.prototype.forEach.call(dots.children, function (b, i) { b.classList.toggle('on', i === tourIndex); });
      if (user && tourTimer) { clearInterval(tourTimer); tourTimer = null; }
    }
    document.getElementById('tourPrev').addEventListener('click', function () { show(tourIndex - 1, true); });
    document.getElementById('tourNext').addEventListener('click', function () { show(tourIndex + 1, true); });
    var sx = null;
    track.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(tourIndex + (dx < 0 ? 1 : -1), true); sx = null; });
    show(0, false);
    if (!reduce) tourTimer = setInterval(function () { show(tourIndex + 1, false); }, 3800);
  }
  var pio = new IntersectionObserver(function (entries) { if (entries.some(function (e) { return e.isIntersecting; })) { loadApp(); pio.disconnect(); } }, { rootMargin: '400px' });
  pio.observe(phone);
  var hintSets = {
    customer: [['Book a journey', 'Tap "Where shall we take you?" and pick a destination.'], ['Follow your chauffeur', 'Open Journeys to see a live journey on the map.'], ['Choose your car', 'My cars sets which car a chauffeur will drive.']],
    driver: [['Go online', 'The Today screen shows offers as they arrive.'], ['Run a job', 'Open Jobs, go en route, and complete handover with the PIN.'], ['See your earnings', 'Weekly statements and payouts, all in one place.']],
  };
  document.querySelectorAll('.role-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.classList.contains('on')) return;
      document.querySelectorAll('.role-switch button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      role = b.getAttribute('data-role');
      document.getElementById('hints').innerHTML = hintSets[role].map(function (h, i) {
        return '<div class="hint"><i>' + (i + 1) + '</i><div><b>' + h[0] + '</b><br/>' + h[1] + '</div></div>';
      }).join('');
      if (loaded && !phone.classList.contains('offline')) { loading.classList.remove('hide'); frameEl.src = appUrl(role); }
    });
  });

  // ---- invitation form
  var form = document.getElementById('inviteForm');
  var kind = 'customer';
  var seg = document.getElementById('kindSeg');
  function setKind(k) {
    kind = k;
    seg.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-kind') === k); });
    document.getElementById('vehicleField').style.display = k === 'customer' ? '' : 'none';
    document.querySelector('#f-note').placeholder = k === 'customer' ? 'When would you use CALLBY, or what do you drive today?' : 'Your driving experience, licence categories you hold, and where you are based.';
    document.getElementById('formSubmit').textContent = k === 'customer' ? 'Request an invitation' : 'Register as a chauffeur';
  }
  seg.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { setKind(b.getAttribute('data-kind')); }); });
  document.querySelectorAll('a[data-kind="chauffeur"]').forEach(function (a) { a.addEventListener('click', function () { setKind('chauffeur'); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('formErr'); err.style.display = 'none';
    var data = {
      kind: kind,
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || undefined,
      area: form.area.value.trim() || undefined,
      vehicle: kind === 'customer' ? (form.vehicle.value.trim() || undefined) : undefined,
      note: form.note.value.trim() || undefined,
      source: 'website',
      company: form.company.value,
    };
    if (data.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      err.textContent = 'Please add your name and a valid email address.'; err.style.display = 'block'; return;
    }
    var btn = document.getElementById('formSubmit'); btn.disabled = true; btn.textContent = 'Sending';
    fetch(CONFIG.api + '/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : 'Something went wrong');
        form.classList.add('sent');
      })
      .catch(function (ex) {
        err.textContent = ex.message || 'We could not send that just now. Email hello@callby.app and we will add you by hand.';
        err.style.display = 'block'; btn.disabled = false; btn.textContent = kind === 'customer' ? 'Request an invitation' : 'Register as a chauffeur';
      });
  });
})();
