(function () {
  "use strict";

  var $  = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    function onScroll() {
      if (window.scrollY > 40) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 76;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  function initReveals() {
    var items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });

    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 0.06 + "s";
      io.observe(el);
    });

    setTimeout(function () {
      items.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  function initHeroCanvas() {
    var canvas = $("[data-hero-canvas]");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var hero = canvas.closest(".hero-visual");
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var t0 = performance.now();

    var COLORS = ["201,161,90", "79,124,138", "241,233,216"];

    function resize() {
      var r = hero.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", debounce(resize, 200), { passive: true });

    function makeEmbers(n) {
      var arr = [];
      for (var i = 0; i < n; i++) {
        arr.push({
          x: Math.random() * w,
          y: h + Math.random() * h * 0.4,
          r: 1 + Math.random() * 2.2,
          speed: 8 + Math.random() * 16,
          drift: 20 + Math.random() * 40,
          phase: Math.random() * Math.PI * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 0.25 + Math.random() * 0.45
        });
      }
      return arr;
    }
    var embers = makeEmbers(46);

    function ribbon(seed, colorIdx) {
      return {
        seed: seed,
        color: COLORS[colorIdx],
        points: [0, 1, 2, 3].map(function (i) {
          return { baseY: 0.2 + i * 0.22, amp: 40 + Math.random() * 60, speed: 0.00006 + Math.random() * 0.00006, phase: Math.random() * Math.PI * 2 };
        })
      };
    }
    var ribbons = [ribbon(1, 0), ribbon(2, 1)];

    function drawRibbon(rb, time) {
      var pts = rb.points.map(function (p, i) {
        var x = (w / 3) * i - w * 0.15 + Math.sin(time * p.speed + p.phase + rb.seed) * 60;
        var y = h * p.baseY + Math.sin(time * p.speed * 1.3 + p.phase) * p.amp;
        return { x: x, y: y };
      });
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length - 1; i++) {
        var xc = (pts[i].x + pts[i + 1].x) / 2;
        var yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      var grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(" + rb.color + ",0)");
      grad.addColorStop(0.5, "rgba(" + rb.color + ",0.35)");
      grad.addColorStop(1, "rgba(" + rb.color + ",0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    function frame(now) {
      var time = now - t0;
      ctx.fillStyle = "rgba(14,12,10,0.16)";
      ctx.fillRect(0, 0, w, h);

      ribbons.forEach(function (rb) { drawRibbon(rb, time); });

      embers.forEach(function (e) {
        e.y -= (e.speed / 60);
        e.x += Math.sin(time * 0.0006 + e.phase) * (e.drift / 6000);
        if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + e.color + "," + e.alpha + ")";
        ctx.fill();
      });

      raf = requestAnimationFrame(frame);
    }

    var raf;
    if (reduced) {
      ctx.fillStyle = "rgba(14,12,10,1)";
      ctx.fillRect(0, 0, w, h);
      ribbons.forEach(function (rb) { drawRibbon(rb, 4000); });
      embers.forEach(function (e) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + e.color + "," + e.alpha + ")";
        ctx.fill();
      });
      return;
    }

    ctx.fillStyle = "rgba(14,12,10,1)";
    ctx.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { raf = requestAnimationFrame(frame); }
    });
  }

  function debounce(fn, ms) {
    var id;
    return function () {
      clearTimeout(id);
      var args = arguments;
      id = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  function initMagnetic() {
    if (!fineHover) return;
    var els = $$("[data-magnetic]");
    els.forEach(function (el) {
      var strength = 14;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (x / r.width) * strength + "px," + (y / r.height) * strength + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initReveals, "initReveals");
    safe(initMagnetic, "initMagnetic");
    safe(initHeroCanvas, "initHeroCanvas");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
