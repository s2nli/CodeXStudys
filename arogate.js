/* AroGate - key gate through a LiteShort short link. This site has its own key, valid 24 hours; the "generate key" screen shows when an app is opened. */
(function () {
  "use strict";
  var APP = "hub";
  var OK = "aro_ok_" + APP, NONCE = "aro_n_" + APP, HOURS = 24, MIN_MS = 8000;
  // Cloudflare Turnstile "security verification" card: paste your Site Key between the quotes ("" = switched off)
  var TS_KEY = "", TS_NAME = "CODEX STUDYS";
  // "Watch tutorial" video: change the link, start time (seconds) or the crop (fraction of the video height hidden at top/bottom) here
  var TUTORIAL = {
    src: "https://res.cloudinary.com/s6oiiwr6/video/upload/v1794073685/VID_20261107_222411_866.mp4",
    start: 20,
    end: 90, // video stops here (seconds, 90 = 1:30)
    cropTop: 0.055,
    cropBottom: 0,
    title: "How to Generate Your Key"
  };
  function gc(k) { var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  function sc(k, v, sec) { document.cookie = k + "=" + encodeURIComponent(v) + "; path=/; max-age=" + sec + "; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : ""); }
  function dc(k) { document.cookie = k + "=; path=/; max-age=0"; }

  // coming back from the short link: ?aro=<nonce>
  try {
    var u = new URL(location.href), v = u.searchParams.get("aro");
    if (v) {
      var n = gc(NONCE).split(".");
      if (n[0] && n[0] === v && Date.now() - Number(n[1]) >= MIN_MS) sc(OK, "1", HOURS * 3600);
      dc(NONCE);
      u.searchParams.delete("aro");
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    }
  } catch (e) {}

  // owner pass: open any page once with ?owner=<your OWNER_KEY>; this browser then skips the key gate for a year
  try {
    var ou = new URL(location.href), ov = ou.searchParams.get("owner");
    if (ov) {
      ou.searchParams.delete("owner");
      history.replaceState(history.state, "", ou.pathname + ou.search + ou.hash);
      fetch("/api/arolinks?owner=" + encodeURIComponent(ov), { cache: "no-store" }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.owner) { sc("aro_owner", "1", 365 * 86400); location.reload(); } }).catch(function () {});
    }
  } catch (e) {}

  var tsToken = "";
  // full-screen "Security Verification" card with the Cloudflare Turnstile check; calls done() once it is passed
  function showVerify(done) {
    if (!TS_KEY) { if (done) done(); return; }
    if (document.getElementById("aro-ver")) return;
    var w = document.createElement("div");
    w.id = "aro-ver";
    w.innerHTML =
      '<style>#aro-ver{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:#05060a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '#aro-ver .c{width:min(100%,420px);padding:34px 26px 28px;text-align:center;border:1px solid #23262e;border-radius:28px;background:#111318;box-shadow:0 24px 60px rgba(0,0,0,.6)}' +
      '#aro-ver .s{width:70px;height:70px;margin:0 auto 22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0c2a30;border:1px solid #12414a}' +
      '#aro-ver h2{margin:0 0 12px;color:#fff;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:.02em;text-transform:uppercase}' +
      '#aro-ver p{margin:0 0 22px;color:#8b909c;font-size:15px;line-height:1.5}' +
      '#aro-ver .t{min-height:65px;display:flex;justify-content:center}' +
      '#aro-ver .pw{margin-top:22px;color:#4a4f5a;font-size:12px;letter-spacing:.18em;font-weight:700;text-transform:uppercase}</style>' +
      '<div class="c"><div class="s"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.3 7.5 10 4.4-1.7 7.5-5.4 7.5-10v-6L12 2.5Z" fill="#9fb7c9"/><path d="M12 2.5v19c4.4-1.7 7.5-5.4 7.5-10v-6L12 2.5Z" fill="#6f8aa0"/></svg></div>' +
      "<h2>" + TS_NAME + " Security Verification</h2><p>Please complete the security verification to continue.</p>" +
      '<div class="t" id="aro-ts"></div><div class="pw">Powered by ' + TS_NAME + "</div></div>";
    document.body.appendChild(w);
    function draw() {
      window.turnstile.render("#aro-ts", {
        sitekey: TS_KEY, theme: "dark",
        callback: function (t) { tsToken = t; setTimeout(function () { w.remove(); if (done) done(); }, 350); },
        "expired-callback": function () { tsToken = ""; }
      });
    }
    if (window.turnstile) draw();
    else { var sc2 = document.createElement("script"); sc2.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; sc2.async = true; sc2.onload = draw; document.head.appendChild(sc2); }
  }

  var busy = false;
  // returns true when the visitor is already unlocked; otherwise sends them to the short link and returns false
  function check(proceed) {
    if (gc(OK) === "1" || gc("aro_owner") === "1") return true;
    if (busy) return false;
    if (TS_KEY && !tsToken) { showVerify(function () { check(proceed); }); return false; }
    busy = true;
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var back = new URL(location.href);
    back.searchParams.set("aro", nonce);
    sc(NONCE, nonce + "." + Date.now(), 1800);
    var cf = tsToken; tsToken = "";
    fetch("/api/arolinks?url=" + encodeURIComponent(back.href) + (cf ? "&cf=" + encodeURIComponent(cf) : ""))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.error === "captcha") { busy = false; dc(NONCE); showVerify(function () { check(proceed); }); return; }
        if (j && j.shortenedUrl) { location.href = j.shortenedUrl; return; }
        throw new Error("no short link");
      })
      .catch(function () { // never lock people out if the service is down: 10 minutes free pass
        busy = false; dc(NONCE); sc(OK, "1", 600);
        if (typeof proceed === "function") proceed();
      });
    return false;
  }

  // full-screen "generate key" screen - same look as the site's own modals (logo, fonts, buttons, theme colours)
  function showWall() {
    if (gc(OK) === "1" || gc("aro_owner") === "1" || document.getElementById("aro-wall")) return;
    var st = document.createElement("style");
    st.textContent =
      "#aro-wall{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;overflow-y:auto;background:rgba(8,10,15,.86);background:color-mix(in srgb,var(--bg,#080a0f) 88%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:var(--text,#f4f6fb);font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}" +
      "#aro-wall .m{position:relative;width:min(100%,420px);padding:28px 24px 24px;text-align:center;border:1px solid var(--line-strong,rgba(255,255,255,.16));border-radius:22px;background:var(--panel-solid,#11151f);box-shadow:var(--shadow,0 24px 70px rgba(0,0,0,.32))}" +
      "#aro-wall .bm{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;overflow:hidden;display:block;border:2px solid rgba(166,156,255,.5);box-shadow:0 8px 26px rgba(139,124,255,.32)}" +
      "#aro-wall .bm img{width:100%;height:100%;object-fit:cover;display:block}" +
      "#aro-wall .tt{margin:0 0 16px;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;letter-spacing:.04em;line-height:1.1}" +
      "#aro-wall .tt span{color:var(--brand-bright,#a69cff)}" +
      "#aro-wall .fi{width:40px;height:40px;margin:0 auto 14px;display:grid;place-items:center;border-radius:12px;color:var(--brand-bright,#a69cff);background:rgba(139,124,255,.13)}" +
      "#aro-wall .fi svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
      "#aro-wall h2{margin:0 0 8px;font:600 26px 'Space Grotesk',sans-serif;letter-spacing:-.04em}" +
      "#aro-wall p{margin:0;color:var(--muted,#8d96a8);font-size:13px;line-height:1.55}" +
      "#aro-wall ul{display:grid;gap:10px;margin:20px 0 24px;padding:0;list-style:none;text-align:left;color:var(--muted-bright,#b4bdcd);font-size:12px}" +
      "#aro-wall li{display:flex;align-items:center;gap:9px}" +
      "#aro-wall li::before{content:'\\2713';flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;color:#0d2623;background:var(--mint,#55ddbb);font-weight:800;font-size:11px}" +
      "#aro-wall .btn{display:flex;justify-content:center;align-items:center;gap:9px;width:100%;min-height:46px;padding:0 18px;border:1px solid transparent;border-radius:12px;color:#fff;background:linear-gradient(135deg,#9487ff,#6c5bed);box-shadow:0 10px 24px rgba(109,91,237,.24);font:700 13px 'DM Sans',sans-serif;cursor:pointer;transition:transform .2s,box-shadow .2s}" +
      "#aro-wall .btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(109,91,237,.36)}#aro-wall .btn:active{transform:scale(.96)}" +
      "#aro-wall .btn svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#aro-wall .btn[disabled]{opacity:.65}" +
      "#aro-wall .btn.ghost{margin-top:10px;color:var(--text,#f4f6fb);background:transparent;border-color:var(--line-strong,rgba(255,255,255,.16));box-shadow:none}#aro-wall .btn.ghost:hover{background:rgba(255,255,255,.05);box-shadow:none}#aro-wall .btn.ghost svg{stroke:currentColor}";
    document.head.appendChild(st);
    var w = document.createElement("div");
    w.id = "aro-wall";
    w.innerHTML = '<div class="m">' +
      '<span class="bm"><img src="https://files.catbox.moe/1phadr.png" alt="CODEX STUDYS" referrerpolicy="no-referrer"></span>' +
      '<div class="tt">CODEX <span>STUDYS</span></div>' +
      '<div class="fi"><svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg></div>' +
      '<h2>Free 24H Access</h2>' +
      '<p>Complete a quick task to generate your access key instantly.</p>' +
      '<ul><li>Valid for exactly 24 Hours</li><li>Direct video playback</li><li>Please disable AdBlockers</li></ul>' +
      '<button type="button" class="btn" id="aro-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8l4 4-4 4"/></svg><span>GENERATE KEY</span></button>' +
      '<button type="button" class="btn ghost" id="aro-tut"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></svg><span>Watch tutorial</span></button>' +
      '</div>';
    document.body.appendChild(w);
    document.documentElement.style.overflow = "hidden";
    document.getElementById("aro-tut").addEventListener("click", openTutorial);
    document.getElementById("aro-btn").addEventListener("click", function () {
      var b = this; b.disabled = true; b.querySelector("span").textContent = "PLEASE WAIT...";
      check(function () { w.remove(); document.documentElement.style.overflow = ""; });
    });
  }
  // ---- "Watch tutorial": bottom sheet that slides up and plays the video from TUTORIAL.start, status bar cropped ----
  var sheet = null, tv = null, tcrop = null;
  function buildSheet() {
    var st = document.createElement("style");
    st.textContent = [
      "#aro-sheet{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.62);opacity:0;visibility:hidden;transition:opacity .25s,visibility 0s .32s;font-family:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}",
      "#aro-sheet.on{opacity:1;visibility:visible;transition:opacity .25s}",
      "#aro-sheet .sh{width:min(100%,520px);max-height:92vh;max-height:92svh;display:flex;flex-direction:column;padding:0 18px calc(16px + env(safe-area-inset-bottom,0px));border:1px solid var(--line-strong,rgba(255,255,255,.16));border-bottom:0;border-radius:26px 26px 0 0;background:var(--panel-solid,#11151f);color:var(--text,#f4f6fb);box-shadow:0 -20px 60px rgba(0,0,0,.4);transform:translateY(100%);transition:transform .34s cubic-bezier(.2,.8,.2,1)}",
      "#aro-sheet.on .sh{transform:translateY(0)}",
      "#aro-sheet .sh.drag{transition:none}",
      "#aro-sheet .gp{padding:10px 0 12px;touch-action:none;cursor:grab}",
      "#aro-sheet .gp i{display:block;width:46px;height:5px;margin:0 auto;border-radius:3px;background:rgba(255,255,255,.24)}",
      "#aro-sheet .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}",
      "#aro-sheet h3{margin:0;font:700 19px 'Space Grotesk',sans-serif;letter-spacing:-.02em}",
      "#aro-sheet .x{flex:none;width:44px;height:44px;display:grid;place-items:center;border-radius:50%;border:1px solid var(--line-strong,rgba(255,255,255,.16));background:rgba(255,255,255,.05);color:inherit;cursor:pointer}",
      "#aro-sheet .x svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}",
      "#aro-sheet .vf{display:flex;justify-content:center;background:#000;border-radius:18px;overflow:hidden;min-height:0}",
      "#aro-sheet .vc{--r:.5;position:relative;overflow:hidden;aspect-ratio:var(--r);width:min(100%,calc(58vh * var(--r)));width:min(100%,calc(58svh * var(--r)))}",
      "#aro-sheet .vf,#aro-sheet .vc{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}",
      "#aro-sheet video{display:block;width:100%;height:auto;background:#000;pointer-events:none}",
      "#aro-sheet .pl{position:absolute;inset:0;display:grid;place-items:center;border:0;padding:0;background:none;cursor:pointer;-webkit-touch-callout:none}",
      "#aro-sheet .pl span{width:64px;height:64px;display:grid;place-items:center;border-radius:50%;background:rgba(0,0,0,.55)}",
      "#aro-sheet .pl svg{width:26px;height:26px;fill:#fff;margin-left:3px}",
      "#aro-sheet .pl.hide span{display:none}",
      "#aro-sheet .mu{position:absolute;right:10px;bottom:10px;width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;cursor:pointer}",
      "#aro-sheet .mu svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
      "#aro-sheet .mu .off{display:none}#aro-sheet .mu.m .off{display:block}#aro-sheet .mu.m .on{display:none}",
      "#aro-sheet button:focus-visible{outline:2px solid var(--brand-bright,#a69cff);outline-offset:2px}",
      "@media (prefers-reduced-motion:reduce){#aro-sheet,#aro-sheet .sh{transition:none}}"
    ].join("");
    document.head.appendChild(st);
    sheet = document.createElement("div");
    sheet.id = "aro-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", TUTORIAL.title);
    sheet.innerHTML =
      '<div class="sh">' +
        '<div class="gp"><i></i></div>' +
        '<div class="hd"><h3></h3><button type="button" class="x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="vf"><div class="vc">' +
          '<video playsinline preload="none" disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback"></video>' +
          '<button type="button" class="pl" aria-label="Play video"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></button>' +
          '<button type="button" class="mu" aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="on" d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/><path class="off" d="M17 9l5 6M22 9l-5 6"/></svg></button>' +
        '</div></div>' +
      '</div>';
    sheet.querySelector("h3").textContent = TUTORIAL.title;
    document.body.appendChild(sheet);

    tv = sheet.querySelector("video");
    tcrop = sheet.querySelector(".vc");
    var big = sheet.querySelector(".pl"), mu = sheet.querySelector(".mu"), sh = sheet.querySelector(".sh");

    function toStart() { if (tv.currentTime < TUTORIAL.start) tv.currentTime = TUTORIAL.start; }
    function crop() {
      if (!tv.videoWidth || !tv.videoHeight) return;
      tcrop.style.setProperty("--r", tv.videoWidth / (tv.videoHeight * (1 - TUTORIAL.cropTop - TUTORIAL.cropBottom)));
      tv.style.transform = "translateY(" + (-TUTORIAL.cropTop * 100) + "%)";
    }
    function toggle() { if (tv.paused) { toStart(); tv.play().catch(function () { big.classList.remove("hide"); }); } else tv.pause(); }
    tv.addEventListener("loadedmetadata", function () { crop(); toStart(); });
    tv.addEventListener("play", function () { big.classList.add("hide"); });
    tv.addEventListener("pause", function () { big.classList.remove("hide"); });
    function finish() { tv.pause(); tv.currentTime = TUTORIAL.start; }
    tv.addEventListener("ended", finish);
    tv.addEventListener("timeupdate", function () { if (TUTORIAL.end && tv.currentTime >= TUTORIAL.end) finish(); });
    tv.addEventListener("seeking", function () { if (tv.currentTime < TUTORIAL.start || (TUTORIAL.end && tv.currentTime >= TUTORIAL.end)) tv.currentTime = TUTORIAL.start; });
    tcrop.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    tv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    big.addEventListener("click", toggle);
    mu.addEventListener("click", function () { tv.muted = !tv.muted; mu.classList.toggle("m", tv.muted); });

    sheet.querySelector(".x").addEventListener("click", closeTutorial);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeTutorial(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("on")) closeTutorial(); });

    // swipe the handle down to close
    var gp = sheet.querySelector(".gp"), y0 = null, dy = 0;
    gp.addEventListener("pointerdown", function (e) { y0 = e.clientY; dy = 0; sh.classList.add("drag"); gp.setPointerCapture(e.pointerId); });
    gp.addEventListener("pointermove", function (e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = "translateY(" + dy + "px)"; });
    function endDrag() {
      if (y0 === null) return;
      y0 = null; sh.classList.remove("drag"); sh.style.transform = "";
      if (dy > 90) closeTutorial();
    }
    gp.addEventListener("pointerup", endDrag);
    gp.addEventListener("pointercancel", endDrag);
  }

  function openTutorial() {
    if (!sheet) buildSheet();
    if (!tv.getAttribute("src")) tv.src = TUTORIAL.src + "#t=" + TUTORIAL.start;
    sheet.classList.add("on");
    if (tv.readyState > 0) tv.currentTime = TUTORIAL.start;
    var p = tv.play();
    if (p && p.catch) p.catch(function () {});
  }

  function closeTutorial() {
    if (!sheet) return;
    sheet.classList.remove("on");
    tv.pause();
  }

  function boot() { if (gc(OK) === "1" || gc("aro_owner") === "1") return; if (TS_KEY) showVerify(showWall); else showWall(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.AroGate = { check: check };
})();
