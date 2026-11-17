/* VitaTakip — açık / koyu / sistem teması + gündüz/gece anahtarı ve "portal" geçişi (V3 madde 1, V4 madde 2).
   Tercih cihaz düzeyinde localStorage "vitatakip_theme" anahtarında tutulur (sağlık verisi değildir): light | dark | system.
   İlk boyama <head> içindeki küçük betikle yapılır. Anahtara basıldığında, destekleyen tarayıcılarda document.startViewTransition
   ile tıklanan noktadan dışa açılan dairesel bir dalga (clip-path) oynatılır; desteklemeyenlerde yumuşak renk geçişi uygulanır.
   Koyu renkler css/tema-v2.css içinde yalnızca ekran için üretilir; yazdırma/PDF her zaman açık kalır. */
(function () {
  "use strict";
  var KEY = "vitatakip_theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function pref() { try { var v = localStorage.getItem(KEY); return v === "dark" || v === "system" ? v : "light"; } catch (_) { return "light"; } }
  function isDark(p) { return p === "dark" || (p === "system" && !!(mq && mq.matches)); }
  function meta(name, content) { var m = document.querySelector('meta[name="' + name + '"]'); if (m) m.setAttribute("content", content); }

  function syncControls(p) {
    var dark = isDark(p);
    Array.prototype.forEach.call(document.querySelectorAll("[data-vt-theme]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-vt-theme") === p ? "true" : "false"); });
    Array.prototype.forEach.call(document.querySelectorAll(".vt-dn"), function (b) {
      b.setAttribute("aria-checked", dark ? "true" : "false");
      b.setAttribute("aria-label", dark ? "Koyu tema açık — açık temaya geç" : "Açık tema açık — koyu temaya geç");
      b.title = dark ? "Açık temaya geç" : "Koyu temaya geç";
    });
    var sys = document.getElementById("vtThemeSystem"); if (sys) sys.checked = p === "system";
  }
  function apply(p) {
    var dark = isDark(p);
    if (dark) document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme");
    meta("color-scheme", dark ? "dark" : "light");
    meta("theme-color", dark ? "#020617" : "#0f172a");
    syncControls(p);
  }
  function store(p) { try { localStorage.setItem(KEY, p); } catch (_) {} }
  function set(p) { store(p); apply(p); }

  /* Portal geçişi: (x, y) noktasından ekranın en uzak köşesine kadar genişleyen daire */
  function transitionTo(p, x, y) {
    var before = isDark(pref()), after = isDark(p);
    store(p);
    if (before === after) { apply(p); return; }
    var root = document.documentElement;
    // Önceki geçiş sürerken yeni geçiş başlatılmaz (art arda tıklama); sekme gizliyken de animasyon yok
    if (document.startViewTransition && !(reduce && reduce.matches) && !root.classList.contains("vt-portal") && document.visibilityState === "visible") {
      var w = window.innerWidth, h = window.innerHeight;
      var cx = typeof x === "number" ? x : w / 2, cy = typeof y === "number" ? y : h / 2;
      var r = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      root.style.setProperty("--vt-px", cx + "px"); root.style.setProperty("--vt-py", cy + "px"); root.style.setProperty("--vt-pr", Math.ceil(r) + "px");
      root.classList.add("vt-portal");
      try {
        var t = document.startViewTransition(function () { apply(p); });
        var done = function () { root.classList.remove("vt-portal"); };
        var swallow = function () {};   // geçiş atlanırsa (InvalidStateError/AbortError) tema yine uygulanmış olur
        if (t && t.ready) t.ready.catch(swallow);
        if (t && t.updateCallbackDone) t.updateCallbackDone.catch(swallow);
        if (t && t.finished) t.finished.then(done, done); else setTimeout(done, 700);
        return;
      } catch (_) { root.classList.remove("vt-portal"); }
    }
    root.classList.add("vt-theme-fade");
    apply(p);
    setTimeout(function () { root.classList.remove("vt-theme-fade"); }, 520);
  }

  function toggleMarkup(id) {
    return '<button type="button" class="vt-dn" id="' + id + '" role="switch" aria-checked="false" aria-label="Koyu temaya geç">' +
      '<span class="vt-dn-stars" aria-hidden="true"></span><span class="vt-dn-cloud" aria-hidden="true"></span><span class="vt-dn-knob" aria-hidden="true"></span></button>';
  }
  function mount() {
    // Üst bar: günlük özet düğmesinin soluna
    var anchor = document.getElementById("btnHeaderDailySummary");
    if (anchor && !document.getElementById("vtThemeToggleHeader")) anchor.insertAdjacentHTML("beforebegin", toggleMarkup("vtThemeToggleHeader"));
    // Ayarlar > Görünüm: gündüz/gece anahtarı + "Sistem temasını izle"
    var seg = document.querySelector("#settingsSectionTheme .vt-seg");
    if (seg && !document.getElementById("vtThemeToggleSettings")) {
      var row = document.createElement("div"); row.className = "vt-theme-row";
      row.innerHTML = toggleMarkup("vtThemeToggleSettings") + '<label class="vt-theme-sys"><input type="checkbox" class="vt-liquid" id="vtThemeSystem"> Sistem temasını izle</label>';
      seg.replaceWith(row);
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".vt-dn, [data-vt-theme]");
    if (!t) return;
    if (t.classList.contains("vt-dn")) {
      var r = t.getBoundingClientRect();
      transitionTo(isDark(pref()) ? "light" : "dark", r.left + r.width / 2, r.top + r.height / 2);
    } else set(t.getAttribute("data-vt-theme"));
  });
  document.addEventListener("change", function (e) {
    if (!e.target || e.target.id !== "vtThemeSystem") return;
    if (e.target.checked) transitionTo("system");
    else set(isDark("system") ? "dark" : "light");   // sistemden çıkınca görünüm değişmez
  });
  if (mq) { var onChange = function () { if (pref() === "system") transitionTo("system"); }; if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange); }
  function init() { mount(); apply(pref()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.VitaTheme = { set: set, get: pref, isDark: function () { return isDark(pref()); }, toggle: function (x, y) { transitionTo(isDark(pref()) ? "light" : "dark", x, y); } };
})();
