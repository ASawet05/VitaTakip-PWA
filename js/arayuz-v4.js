/* VitaTakip V4 arayüzü (stil: css/arayuz-v4.css)
   1) Kavisli cam yan menü: mevcut #appDrawer akordeon gruplara dönüştürülür (tüm id'ler ve işlevler korunur).
      <1024 px: başlığın altından açılan çekmece + ☰→× düğmesi · ≥1024 px: sabit, daraltılabilir ray.
   3) Yüzen cam alt gezinme (<768 px): Ana Sayfa, Tahliller, Analiz, Takviyeler, VitaAI; kayan kapsül + açılan etiket.
   4) Hızlı eylem menüsü (+): +250 ml su, takviye ekle, e-Nabız PDF yükle (VitaAI düğmesinin solunda).
   5) Komut araması: Ctrl+K / "/" ile odak; sonuçlar Modüller, Tahlil Parametreleri, Semptomlar, Hızlı İşlemler altında; ok tuşları + Enter.
   6) Adım çubuğu (NeyimVar? 7 adım, profil kurulumu 3 adım), Ana Sayfa kademeli kart girişi, sıvı dolum anahtarları.
   Veri yazmaz; yalnızca mevcut işlevleri çağırır. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var desktop = window.matchMedia("(min-width: 1024px)");
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  var call = function (name) { var f = window[name]; if (typeof f === "function") return f.apply(window, [].slice.call(arguments, 1)); };
  var currentView = "view-home";

  /* ========================= 1) Yan menü ========================= */
  var GROUPS = [
    { k: "genel", t: "Genel Bakış", i: "fa-house", views: ["view-home"], items: ["drawer-nav-view-home"] },
    { k: "tahlil", t: "Tahlillerim & Trend", i: "fa-flask-vial", views: ["view-labs"], items: ["drawer-nav-view-labs", "drawer-nav-lab-trend", "drawer-nav-enabiz-pdf"] },
    { k: "klinik", t: "Klinik Analiz & Raporlar", i: "fa-chart-line", views: ["view-clinical-results", "view-report"], items: ["drawer-nav-view-clinical-results", "drawer-nav-view-report"] },
    { k: "takviye", t: "Takviyeler & İlaçlar", i: "fa-capsules", views: ["view-add-supplement", "view-add-medication"], items: ["drawer-add-supplement", "drawer-add-medication"], id: "drawerSectionMedsSupps" },
    { k: "ai", t: "VitaAI & NeyimVar?", i: "fa-robot", views: ["view-neyim"], items: ["drawer-nav-view-neyim", "drawer-nav-vitaai"] },
    { k: "arac", t: "Yönetim & Araçlar", i: "fa-toolbox", views: [], items: ["drawerQuickNotifToggleWrapper", "drawer-nav-egfr-calculator", "drawer-nav-vita-oyunlar", "drawer-nav-onboarding-guide", "drawer-nav-feedback", "drawer-nav-kvkk"] }
  ];
  var drawer, burger, openGroups;

  function navBtn(id, icon, label, fn) {
    var b = document.createElement("button"); b.type = "button"; b.id = id;
    b.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i><span>' + label + "</span>";
    b.addEventListener("click", function () { closeIfMobile(); fn(); });
    return b;
  }
  function closeIfMobile() { if (!desktop.matches) window.closeAppDrawer(); }

  function buildSidebar() {
    drawer = $("appDrawer");
    if (!drawer || drawer.classList.contains("vt-sb")) return;
    var profileCard = drawer.querySelector('[onclick*="openProfileModal(true)"]');
    var kvkk = drawer.querySelector('[onclick*="openKvkkInfoModal"]'); if (kvkk) kvkk.id = "drawer-nav-kvkk";
    var logout = drawer.querySelector('[onclick*="handleLogout"]');
    var settings = $("drawer-nav-view-settings");
    var extra = {
      "drawer-nav-lab-trend": navBtn("drawer-nav-lab-trend", "fa-chart-area", "Tahlil gelişim grafiği", function () {
        call("navigateToView", "view-labs");
        setTimeout(function () { var c = document.querySelector("#view-labs .lt-card, #view-labs [data-lab-trend], #view-labs details"); var h = c && (c.querySelector("summary, button") || c); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); if (c && c.tagName === "DETAILS") c.open = true; }, 260);
      }),
      "drawer-nav-enabiz-pdf": navBtn("drawer-nav-enabiz-pdf", "fa-file-pdf", "e-Nabız PDF yükle", function () { call("navigateToView", "view-labs"); call("openENabizModal"); }),
      "drawer-nav-vitaai": navBtn("drawer-nav-vitaai", "fa-wand-magic-sparkles", "VitaAI Klinik Asistan", function () { if (window.VitaAIChat) VitaAIChat.toggle(true); })
    };
    var nodes = {};
    GROUPS.forEach(function (g) { g.items.forEach(function (id) { nodes[id] = extra[id] || $(id); }); });

    // Yeni iskelet
    var sb = document.createElement("div"); sb.className = "vt-sb-wrap";
    sb.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0";
    sb.innerHTML = '<div class="vt-sb-top"><button type="button" class="vt-sb-brand" id="vtSbBrand" title="Ana Sayfa"><img src="./icons/icon-192.png" alt=""><div><b>VitaTakip</b><small>SAĞLIK &amp; KARAR PORTALI</small></div></button>' +
      '<button type="button" class="vt-sb-pin" id="vtSbPin" aria-label="Menüyü daralt" title="Menüyü daralt / genişlet"><i class="fa-solid fa-angles-left" aria-hidden="true"></i></button></div>' +
      '<div class="vt-sb-profile" id="vtSbProfile"></div><nav class="vt-sb-scroll" id="vtSbScroll" aria-label="Uygulama menüsü"></nav>' +
      '<button type="button" class="vt-sb-alert" id="vtSidebarAlert" hidden></button><div class="vt-sb-foot" id="vtSbFoot"></div>';
    var scroll = sb.querySelector("#vtSbScroll");
    openGroups = (function () { try { return JSON.parse(ls.get("vt_sb_groups") || "null"); } catch (_) { return null; } })() || ["genel", "tahlil"];
    GROUPS.forEach(function (g) {
      var sec = document.createElement("section"); sec.className = "vt-grp"; sec.dataset.grp = g.k;
      var bodyId = "vtGrp_" + g.k;
      sec.innerHTML = '<button type="button" class="vt-grp-h" aria-expanded="false" aria-controls="' + bodyId + '" title="' + esc(g.t) + '"><i class="fa-solid ' + g.i + '" aria-hidden="true"></i><span class="vt-grp-t">' + esc(g.t) + '</span><i class="fa-solid fa-chevron-down vt-grp-c" aria-hidden="true"></i></button>' +
        '<div class="vt-grp-b" id="' + bodyId + '" role="group" aria-label="' + esc(g.t) + '"><div class="vt-grp-in"' + (g.id ? ' id="' + g.id + '"' : "") + "></div></div>";
      var inner = sec.querySelector(".vt-grp-in");
      g.items.forEach(function (id) { if (nodes[id]) inner.appendChild(nodes[id]); });
      scroll.appendChild(sec);
    });
    if (profileCard) sb.querySelector("#vtSbProfile").appendChild(profileCard);
    var foot = sb.querySelector("#vtSbFoot");
    if (settings) foot.appendChild(settings);
    if (logout) { logout.classList.add("vt-logout"); logout.id = logout.id || "drawer-nav-logout"; foot.appendChild(logout); }
    // Eski kabuğu temizle (taşınan öğeler yeni yerinde; eski yinelenen başlık/ayırıcılar kalmasın)
    var oldMed = drawer.querySelector("#drawerSectionMedsSupps:not(.vt-grp-in)"); if (oldMed) oldMed.remove();
    while (drawer.firstChild) drawer.removeChild(drawer.firstChild);
    drawer.appendChild(sb);
    drawer.classList.add("vt-sb");
    drawer.setAttribute("aria-label", "Uygulama menüsü");
    var bd = $("drawerBackdrop"); if (bd) bd.classList.add("vt-scrim");

    scroll.addEventListener("click", function (e) {
      var h = e.target.closest(".vt-grp-h"); if (!h) return;
      var sec = h.parentElement, k = sec.dataset.grp;
      if (desktop.matches && !document.body.classList.contains("vt-rail-open")) { setRail(true); setGroup(k, true); return; }
      setGroup(k, !sec.classList.contains("is-open"));
    });
    $("vtSbPin").addEventListener("click", function () { setRail(!document.body.classList.contains("vt-rail-open")); });
    $("vtSbBrand").addEventListener("click", function () { closeIfMobile(); call("navigateToView", "view-home"); });
    $("vtSidebarAlert").addEventListener("click", function () { var a = this.dataset.go; closeIfMobile(); if (a) call("navigateToView", a); });
    GROUPS.forEach(function (g) { setGroup(g.k, openGroups.indexOf(g.k) >= 0, true); });
  }
  function setGroup(k, open, silent) {
    var sec = drawer && drawer.querySelector('.vt-grp[data-grp="' + k + '"]'); if (!sec) return;
    sec.classList.toggle("is-open", !!open);
    sec.querySelector(".vt-grp-h").setAttribute("aria-expanded", open ? "true" : "false");
    var i = openGroups.indexOf(k);
    if (open && i < 0) openGroups.push(k); if (!open && i >= 0) openGroups.splice(i, 1);
    if (!silent) ls.set("vt_sb_groups", JSON.stringify(openGroups));
  }
  function markActiveGroup(view) {
    if (!drawer) return;
    GROUPS.forEach(function (g) {
      var on = g.views.indexOf(view) >= 0, sec = drawer.querySelector('.vt-grp[data-grp="' + g.k + '"]');
      if (sec) sec.classList.toggle("is-active", on);
      if (on && !sec.classList.contains("is-open")) setGroup(g.k, true, true);
    });
  }
  /* Klinik hatırlatma / uyarı kartı: yaklaşan kontrol ölçümü > güvenlik uyarısı > gizli */
  function refreshAlert() {
    var el = $("vtSidebarAlert"); if (!el) return;
    var html = "", cls = "", go = "";
    try {
      var list = window.VitaRecheck ? VitaRecheck.load() : [];
      if (list.length) {
        var r = list.slice().sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0];
        var today = new Date().toISOString().slice(0, 10), d = r.due.split("-").reverse().join(".");
        var late = r.due <= today;
        html = '<i class="fa-solid ' + (late ? "fa-bell" : "fa-calendar-check") + '" aria-hidden="true"></i><div><b>' + (late ? "Kontrol tahlili zamanı" : "Yaklaşan kontrol ölçümü") + "</b><span>" + esc(r.labels.join(", ")) + " · " + d + "</span></div>";
        cls = late ? "is-rose" : "is-teal"; go = "view-labs";
      }
    } catch (_) {}
    if (!html && typeof state !== "undefined" && state && state.lastCDSS) {
      var n = (state.lastCDSS.contraindications || []).length;
      if (n) { html = '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><b>' + n + " güvenlik uyarısı</b><span>Klinik analizde etkileşim / acil değerlendirme notu var</span></div>"; go = "view-clinical-results"; }
    }
    el.hidden = !html; el.className = "vt-sb-alert" + (cls ? " " + cls : ""); el.innerHTML = html; el.dataset.go = go;
    el.title = el.textContent;
  }
  function setRail(open) {
    document.body.classList.toggle("vt-rail-open", !!open);
    ls.set("vt_rail_open", open ? "1" : "0");
    var pin = $("vtSbPin"); if (pin) pin.setAttribute("aria-label", open ? "Menüyü daralt" : "Menüyü genişlet");
    if (drawer) drawer.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function applyLayout() {
    var hdr = document.querySelector("body > header");
    if (hdr) document.documentElement.style.setProperty("--vt-head-h", Math.round(hdr.getBoundingClientRect().height) + "px");
    if (desktop.matches) {
      document.body.classList.add("vt-has-rail");
      document.body.classList.remove("vt-drawer-open");
      if (drawer) drawer.classList.remove("vt-open");
      var saved = ls.get("vt_rail_open");
      setRail(saved === null ? window.innerWidth >= 1280 : saved === "1");
    } else {
      document.body.classList.remove("vt-has-rail", "vt-rail-open");
    }
  }
  function patchDrawerFns() {
    var origOpen = window.openAppDrawer, origClose = window.closeAppDrawer;
    if (typeof origOpen !== "function" || origOpen.__vt) return;
    var open = function () {
      if (desktop.matches) { setRail(true); refreshAlert(); return; }
      origOpen();
      if (drawer) drawer.classList.add("vt-open");
      document.body.classList.add("vt-drawer-open");
      if (burger) burger.setAttribute("aria-expanded", "true");
      refreshAlert();
    };
    var close = function () {
      if (desktop.matches) return;   // masaüstünde ray yerinde kalır (daraltma düğmesi ayrı)
      origClose();
      if (drawer) drawer.classList.remove("vt-open");
      document.body.classList.remove("vt-drawer-open");
      if (burger) burger.setAttribute("aria-expanded", "false");
    };
    open.__vt = close.__vt = true;
    open.toString = function () { return origOpen.toString(); }; close.toString = function () { return origClose.toString(); };
    window.openAppDrawer = open; window.closeAppDrawer = close;
  }
  function buildBurger() {
    burger = document.querySelector('body > header button[onclick="openAppDrawer()"]');
    if (!burger) return;
    burger.removeAttribute("onclick");
    burger.classList.add("vt-burger");
    burger.setAttribute("aria-label", "Menüyü aç"); burger.setAttribute("aria-controls", "appDrawer"); burger.setAttribute("aria-expanded", "false"); burger.title = "Menü";
    burger.innerHTML = '<span class="vt-bl"></span><span class="vt-bl"></span><span class="vt-bl"></span>';
    burger.addEventListener("click", function () {
      if (drawer && drawer.classList.contains("vt-open")) window.closeAppDrawer(); else window.openAppDrawer();
      burger.setAttribute("aria-label", drawer && drawer.classList.contains("vt-open") ? "Menüyü kapat" : "Menüyü aç");
    });
  }

  /* ========================= 3) Alt gezinme ========================= */
  var bnav, bnavState = "home", supMode = false;
  var BNAV = [
    { k: "home", id: "mobile-nav-view-home", i: "fa-house", t: "Ana Sayfa", view: "view-home" },
    { k: "labs", id: "mobile-nav-view-labs", i: "fa-flask-vial", t: "Tahliller", view: "view-labs" },
    { k: "analiz", id: "mobile-nav-view-clinical-results", i: "fa-chart-line", t: "Analiz", view: "view-clinical-results" },
    { k: "sup", id: "mobile-nav-supplements", i: "fa-capsules", t: "Takviyeler" },
    { k: "ai", id: "mobile-nav-vitaai", i: "fa-wand-magic-sparkles", t: "VitaAI" }
  ];
  function buildBottomNav() {
    bnav = document.querySelector("nav.vita-mobile-nav");
    if (!bnav || bnav.classList.contains("vt-bnav")) return;
    bnav.classList.add("vt-bnav");
    bnav.innerHTML = '<div class="vt-bnav-pill"><span class="vt-bnav-ind" aria-hidden="true"></span>' + BNAV.map(function (b) {
      return '<button type="button" id="' + b.id + '" data-bnav="' + b.k + '"' + (b.view ? ' data-vita-view="' + b.view + '"' : "") + ' aria-label="' + b.t + '"><i aria-hidden="true" class="fa-solid ' + b.i + '"></i><span>' + b.t + "</span></button>";
    }).join("") + "</div>";
    bnav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-bnav]"); if (!b) return;
      var k = b.dataset.bnav, cfg = BNAV.filter(function (x) { return x.k === k; })[0];
      if (k === "ai") { if (window.VitaAIChat) VitaAIChat.toggle(); return; }
      if (k === "sup") {
        supMode = true; call("navigateToView", "view-home");
        if (window.VitaHomeTabs) VitaHomeTabs.show(0);
        setTimeout(function () { var c = $("supplementChecklistContainer"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }, 120);
        setBottom("sup"); return;
      }
      supMode = false; call("navigateToView", cfg.view);
    });
    addEventListener("resize", function () { placeIndicator(); });
  }
  function setBottom(k) {
    bnavState = k;
    if (!bnav) return;
    Array.prototype.forEach.call(bnav.querySelectorAll("[data-bnav]"), function (b) {
      var on = b.dataset.bnav === k;
      b.classList.toggle("is-on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    placeIndicator();
  }
  function placeIndicator() {
    if (!bnav) return;
    var ind = bnav.querySelector(".vt-bnav-ind"), on = bnav.querySelector("[data-bnav].is-on");
    if (!ind) return;
    if (!on) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1"; ind.style.width = on.offsetWidth + "px"; ind.style.transform = "translateX(" + on.offsetLeft + "px)";
  }
  function bottomFromView(view) {
    if (view === "view-add-supplement" || (view === "view-home" && supMode)) return "sup";
    var m = BNAV.filter(function (b) { return b.view === view; })[0];
    return m ? m.k : (view === "view-neyim" || view === "view-report" ? "analiz" : "");
  }

  /* ========================= 4) Hızlı eylem menüsü ========================= */
  function buildSpeedDial() {
    var fab = $("vitaAiFab"), widget = $("vita-ai-widget");
    if (!fab || !widget || $("vtSpeedDial")) return;
    var row = document.createElement("div"); row.className = "vt-fabrow";
    fab.parentNode.insertBefore(row, fab);
    var dial = document.createElement("div"); dial.className = "vt-dial no-print"; dial.id = "vtSpeedDial";
    dial.innerHTML = '<div class="vt-dial-list" id="vtDialList" role="menu" aria-label="Hızlı işlemler">' +
      '<button type="button" class="vt-dial-act" role="menuitem" data-act="pdf" style="--i:2"><b>e-Nabız PDF yükle</b><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></button>' +
      '<button type="button" class="vt-dial-act" role="menuitem" data-act="sup" style="--i:1"><b>+ Takviye ekle</b><i class="fa-solid fa-capsules" aria-hidden="true"></i></button>' +
      '<button type="button" class="vt-dial-act" role="menuitem" data-act="water" style="--i:0"><b>+250 ml su ekle</b><i class="fa-solid fa-glass-water" aria-hidden="true"></i></button></div>' +
      '<button type="button" class="vt-dial-btn" id="vtDialBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="vtDialList" aria-label="Hızlı işlemler"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>';
    row.appendChild(dial); row.appendChild(fab);
    var setOpen = function (o) { dial.classList.toggle("is-open", o); $("vtDialBtn").setAttribute("aria-expanded", o ? "true" : "false"); };
    $("vtDialBtn").addEventListener("click", function (e) { e.stopPropagation(); setOpen(!dial.classList.contains("is-open")); if (window.SoundEffects) SoundEffects.playClick(); });
    dial.addEventListener("click", function (e) {
      var a = e.target.closest("[data-act]"); if (!a) return;
      setOpen(false);
      var k = a.dataset.act;
      if (k === "water") { call("addWater", 250); if (typeof showToast === "function") showToast("+250 ml su", "Günlük sıvı hedefinize eklendi.", "success"); }
      else if (k === "sup") { call("navigateToView", "view-home"); call("openAddSupplementModal"); }
      else if (k === "pdf") { call("navigateToView", "view-labs"); call("openENabizModal"); }
    });
    document.addEventListener("click", function (e) { if (!dial.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && dial.classList.contains("is-open")) { setOpen(false); $("vtDialBtn").focus(); } });
    // Sohbet açıkken hızlı menü gizlenir; alt gezinmedeki VitaAI düğmesi durumu izler
    var box = $("vita-ai-chatbox");
    if (box) new MutationObserver(function () {
      var open = !box.classList.contains("hidden");
      widget.classList.toggle("vt-chat-open", open);
      if (open) setBottom("ai"); else if (bnavState === "ai") setBottom(bottomFromView(currentView));
    }).observe(box, { attributes: true, attributeFilter: ["class"] });
  }

  /* ========================= 5) Komut araması ========================= */
  var cmd = { items: [], sel: -1 };
  var norm = function (s) { return typeof normalizeTurkishText === "function" ? normalizeTurkishText(String(s || "")) : String(s || "").toLocaleLowerCase("tr-TR"); };
  function hi(text, q) {
    var t = String(text || ""); if (!q) return esc(t);
    var n = norm(t), i = n.indexOf(q);
    return i < 0 || n.length !== t.length ? esc(t) : esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
  }
  var LAB_INPUTS = { d3: "inputLabD3", b12: "inputLabB12", ferritin: "inputLabFerritin", mg: "inputLabMg", ca: "inputLabCalcium", zinc: "inputLabZinc", creatinine: "inputLabCreatinine", folate: "inputLabFolate", alt: "inputLabAlt", hb: "inputLabHb", mcv: "inputLabMcv", crp: "inputLabCrp", rbcFolate: "inputLabRbcFolate", hcy: "inputLabHcy" };
  function sources() {
    var mods = [
      ["Ana Sayfa & Günlük Protokol", "Bugünkü takviyeler, su ve günlük özet", "view-home", "fa-house"],
      ["Tahlillerim & e-Nabız PDF", "Kan değerleri, PDF okuyucu ve gelişim grafiği", "view-labs", "fa-flask-vial"],
      ["NeyimVar? Belirti değerlendirmesi", "7 adımlı belirti seçimi", "view-neyim", "fa-clipboard-question"],
      ["Klinik Analiz Sonuçları", "Değerlerim, kontrol hatırlatması, testler", "view-clinical-results", "fa-chart-line"],
      ["Doktora Götürülecek Rapor", "Kısa / ayrıntılı rapor, PDF, paylaşım kartı", "view-report", "fa-file-waveform"],
      ["Ayarlar", "Profil, görünüm, yapay zekâ, yedek", "view-settings", "fa-gear"]
    ].map(function (m) { return { g: "Modüller", t: m[0], s: m[1], i: m[3], run: function () { call("navigateToView", m[2]); } }; });
    var labs = [];
    var E = window.VitaLabEvidence, P = E ? E.PARAMS : {};
    var names = { creatinine: ["Kreatinin / eGFR", "mg/dL"], alt: ["ALT (karaciğer)", "U/L"] };
    Object.keys(LAB_INPUTS).forEach(function (k) {
      var label = P[k] ? P[k].label : (names[k] || [k])[0], unit = P[k] ? P[k].unit : (names[k] || ["", ""])[1];
      var ref = typeof getVitaAppLabReference === "function" ? getVitaAppLabReference(k) : "";
      labs.push({ g: "Tahlil Parametreleri", t: label, s: "Değer gir · genel aralık " + (ref || unit), i: "fa-vial", key: k, run: function () {
        call("navigateToView", "view-labs");
        setTimeout(function () { var el = $(LAB_INPUTS[k]); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } }, 220);
      } });
    });
    var syms = [];
    if (typeof ANAMNESIS_DICTIONARY !== "undefined") Object.keys(ANAMNESIS_DICTIONARY).forEach(function (sk) {
      var s = ANAMNESIS_DICTIONARY[sk];
      syms.push({ g: "Semptomlar", t: s.medicalName, s: s.question, i: "fa-stethoscope", extra: (s.nutrients || []).join(" "), run: function () { call("navigateToView", "view-neyim"); call("switchAnamnesisCategoryTab", s.catId); } });
    });
    var acts = [
      ["+250 ml su ekle", "Günlük sıvı hedefine ekle", "fa-glass-water", function () { call("addWater", 250); if (typeof showToast === "function") showToast("+250 ml su", "Günlük sıvı hedefinize eklendi.", "success"); }],
      ["Takviye ekle", "Barkod, fotoğraf veya elle", "fa-capsules", function () { call("navigateToView", "view-home"); call("openAddSupplementModal"); }],
      ["İlaç ekle", "Düzenli veya geçici ilaç", "fa-prescription-bottle-medical", function () { call("navigateToView", "view-home"); call("openAddMedicationModal"); }],
      ["e-Nabız PDF yükle", "Tahlil sonuçlarını PDF'ten oku", "fa-file-pdf", function () { call("navigateToView", "view-labs"); call("openENabizModal"); }],
      ["VitaAI asistanı aç", "Sorunuzu yazın veya söyleyin", "fa-wand-magic-sparkles", function () { if (window.VitaAIChat) VitaAIChat.toggle(true); }],
      ["Raporu yazdır / PDF", "Doktora özet raporu", "fa-print", function () { call("navigateToView", "view-report"); }],
      ["Tema değiştir (gündüz / gece)", "Açık ↔ koyu görünüm", "fa-circle-half-stroke", function () { if (window.VitaTheme) VitaTheme.toggle(); }],
      ["Yedek indir", "Verilerinizi JSON olarak kaydedin", "fa-download", function () { call("exportDataBackup"); }]
    ].map(function (a) { return { g: "Hızlı İşlemler", t: a[0], s: a[1], i: a[2], run: a[3] }; });
    if (typeof FORM_DOSAGE_CONFIG !== "undefined") Object.keys(FORM_DOSAGE_CONFIG).forEach(function (k) {
      var it = FORM_DOSAGE_CONFIG[k];
      acts.push({ g: "Hızlı İşlemler", t: "Takviye ekle: " + it.name, s: "Katalogdan şablonla ekle", i: "fa-capsules", catalog: true, run: function () {
        call("navigateToView", "view-home"); call("openAddSupplementModal");
        var sel = $("modalCatalogSelect"); if (sel) { sel.value = k; call("onCatalogSelectChange", k); }
      } });
    });
    return { mods: mods, labs: labs, syms: syms, acts: acts };
  }
  var ORDER = ["Modüller", "Tahlil Parametreleri", "Semptomlar", "Hızlı İşlemler"];
  function search(query) {
    var box = $("globalSearchResults"), clear = $("clearSearchBtn");
    if (!box) return;
    var q = norm(String(query || "").trim());
    if (clear) clear.classList.toggle("hidden", !q);
    var src = sources(), list = [];
    if (!q) list = src.acts.filter(function (a) { return !a.catalog; }).slice(0, 5).concat(src.mods);
    else {
      var m = function (x) { return norm(x.t).indexOf(q) >= 0 || norm(x.s).indexOf(q) >= 0 || (x.extra && norm(x.extra).indexOf(q) >= 0) || (x.key && norm(x.key) === q); };
      [src.mods, src.labs, src.syms, src.acts].forEach(function (arr) { list = list.concat(arr.filter(m).slice(0, 5)); });
    }
    cmd.items = list; cmd.sel = list.length ? 0 : -1;
    window._activeSearchMatches = list.map(function (x) { return { action: function () { x.run(); call("clearGlobalSearch"); var i = $("globalSearchInput"); if (i) i.blur(); } }; });
    box.classList.add("vt-cmd");
    if (!list.length) {
      box.innerHTML = '<div class="vt-cmd-empty"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> “' + esc(query) + '” için modül, tahlil, belirti veya işlem bulunamadı.</div>';
    } else {
      var html = "", idx = 0;
      ORDER.forEach(function (g) {
        var part = list.filter(function (x) { return x.g === g; }); if (!part.length) return;
        html += '<div class="vt-cmd-g" role="presentation">' + g + "</div>";
        part.forEach(function (x) {
          html += '<button type="button" class="vt-cmd-i" role="option" id="vtCmd' + idx + '" data-idx="' + idx + '" onclick="executeSearchAction(' + idx + ')"><i class="fa-solid ' + x.i + ' text-teal-700" aria-hidden="true"></i><span><b>' + hi(x.t, q) + "</b><small>" + hi(x.s, q) + "</small></span></button>";
          idx++;
        });
      });
      // DOM sırası grup sırasıdır; eylem dizisini de aynı sıraya getir
      var ordered = []; ORDER.forEach(function (g) { list.forEach(function (x) { if (x.g === g) ordered.push(x); }); });
      cmd.items = ordered;
      window._activeSearchMatches = ordered.map(function (x) { return { action: function () { x.run(); call("clearGlobalSearch"); var i = $("globalSearchInput"); if (i) i.blur(); } }; });
      box.innerHTML = '<div role="listbox" aria-label="Arama sonuçları">' + html + '</div><div class="vt-cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> gezin</span><span><kbd>Enter</kbd> aç</span><span><kbd>Esc</kbd> kapat</span></div>';
    }
    box.classList.remove("hidden");
    markSel();
  }
  function markSel() {
    var box = $("globalSearchResults"), input = $("globalSearchInput"); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll(".vt-cmd-i"), function (b) { var on = Number(b.dataset.idx) === cmd.sel; b.classList.toggle("is-sel", on); b.setAttribute("aria-selected", on ? "true" : "false"); if (on) b.scrollIntoView({ block: "nearest" }); });
    if (input) { if (cmd.sel >= 0) input.setAttribute("aria-activedescendant", "vtCmd" + cmd.sel); else input.removeAttribute("aria-activedescendant"); }
  }
  function buildCommandSearch() {
    var input = $("globalSearchInput"); if (!input || input.dataset.vtCmd) return;
    input.dataset.vtCmd = "1";
    input.setAttribute("role", "combobox"); input.setAttribute("aria-controls", "globalSearchResults"); input.setAttribute("aria-autocomplete", "list");
    // Telefonda kısa yer tutucu (kutuya sığar); geniş ekranda neyin aranabildiğini söyler
    var setPh = function () { input.placeholder = desktop.matches ? "Ara: modül, tahlil, belirti, işlem…" : "Ara…"; };
    setPh(); if (desktop.addEventListener) desktop.addEventListener("change", setPh);
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
    input.insertAdjacentHTML("afterend", '<span class="vt-kbd" aria-hidden="true">' + (mac ? "⌘" : "Ctrl") + " K</span>");
    window.handleGlobalSearch = search;
    input.addEventListener("keydown", function (e) {
      var box = $("globalSearchResults"), open = box && !box.classList.contains("hidden");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!open) search(input.value);
        if (!cmd.items.length) return;
        e.preventDefault();
        cmd.sel = (cmd.sel + (e.key === "ArrowDown" ? 1 : -1) + cmd.items.length) % cmd.items.length; markSel();
      } else if (e.key === "Enter") {
        if (open && cmd.sel >= 0) { e.preventDefault(); call("executeSearchAction", cmd.sel); }
      } else if (e.key === "Escape") { call("clearGlobalSearch"); input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); input.focus(); input.select(); search(input.value); }
      else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); input.focus(); search(input.value); }
    });
  }

  /* ========================= 6) Adım çubuğu, kademeli kartlar, sıvı anahtarlar ========================= */
  function segHtml(n, cur) {
    var h = ""; for (var i = 0; i < n; i++) h += '<span class="vt-seg-s' + (i < cur ? " is-done" : i === cur ? " is-cur" : "") + '">' + (i < cur ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : "") + "</span>";
    return h;
  }
  function buildNeyimSegments() {
    var host = $("anamnesisCategoryProgress"), label = $("anamnesisCategoryProgressLabel");
    if (!host || host.dataset.vtSeg) return;
    host.dataset.vtSeg = "1"; host.classList.add("vt-seg-host");
    var bar = document.createElement("div"); bar.className = "vt-seg-bar"; bar.setAttribute("aria-hidden", "true"); host.appendChild(bar);
    var render = function () {
      var m = String((label && label.textContent) || host.getAttribute("aria-valuetext") || "").match(/(\d+)\s*\/\s*(\d+)/);
      var cur = m ? Number(m[1]) - 1 : 0, n = m ? Number(m[2]) : Number(host.getAttribute("aria-valuemax")) || 7;
      if (bar.dataset.k === cur + "/" + n) return; bar.dataset.k = cur + "/" + n; bar.innerHTML = segHtml(n, cur);
    };
    render();
    new MutationObserver(render).observe(host, { attributes: true, attributeFilter: ["aria-valuenow", "aria-valuetext"] });
    if (label) new MutationObserver(render).observe(label, { childList: true, characterData: true, subtree: true });
  }
  function watchProfileSteps() {
    var modal = $("profileModal"); if (!modal) return;
    var sync = function () {
      var tabs = modal.querySelectorAll(".vpst-tab"); if (!tabs.length) return;
      var cur = -1; Array.prototype.forEach.call(tabs, function (t, i) { if (t.getAttribute("aria-current") === "step") cur = i; });
      Array.prototype.forEach.call(tabs, function (t, i) { t.classList.toggle("vt-done", cur > i); });
    };
    new MutationObserver(sync).observe(modal, { attributes: true, subtree: true, attributeFilter: ["aria-current"] });
    sync();
  }
  function stagger(view) {
    var v = $(view); if (!v || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var kids = Array.prototype.filter.call(v.children, function (c) { return c.offsetParent !== null; });
    kids.forEach(function (c, i) { c.style.setProperty("--vt-i", Math.min(i, 8)); });
    v.classList.remove("vt-stagger"); void v.offsetWidth; v.classList.add("vt-stagger");
    clearTimeout(v._vtSt); v._vtSt = setTimeout(function () { v.classList.remove("vt-stagger"); }, 1300);
  }
  function liquidSwitches() {
    ["aiHealthDataConsent", "settingsCameraAppConsentCheckbox", "vtThemeSystem"].forEach(function (id) { var el = $(id); if (el) el.classList.add("vt-liquid"); });
  }

  /* ========================= Gezinme kancası ========================= */
  function onNavigate(view) {
    currentView = view || currentView;
    if (view !== "view-home") supMode = supMode && view === "view-home";
    markActiveGroup(currentView);
    if (bnavState !== "ai" || !$("vita-ai-chatbox") || $("vita-ai-chatbox").classList.contains("hidden")) setBottom(bottomFromView(currentView));
    refreshAlert();
    if (currentView === "view-home") stagger("view-home");
  }
  function patchNavigate() {
    var orig = window.navigateToView;
    if (typeof orig !== "function" || orig.__vtNav) return;
    var w = function (view) {
      if (view !== "view-home") supMode = false;
      var r = orig.apply(this, arguments);
      try { onNavigate(view); } catch (_) {}
      return r;
    };
    w.__vtNav = true; w.toString = function () { return orig.toString(); };
    window.navigateToView = w;
  }

  function init() {
    buildSidebar(); patchDrawerFns(); buildBurger(); applyLayout();
    buildBottomNav(); buildSpeedDial(); buildCommandSearch(); buildNeyimSegments(); watchProfileSteps(); liquidSwitches();
    patchNavigate();
    var active = document.querySelector("main > section:not(.hidden)[id^='view-']");
    onNavigate(active ? active.id : "view-home");
    if (desktop.addEventListener) desktop.addEventListener("change", applyLayout); else if (desktop.addListener) desktop.addListener(applyLayout);
    addEventListener("resize", function () { clearTimeout(init._r); init._r = setTimeout(applyLayout, 120); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer && drawer.classList.contains("vt-open")) { window.closeAppDrawer(); if (burger) burger.focus(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.VitaUiV4 = { refreshAlert: refreshAlert, setRail: setRail, search: search, setBottom: setBottom };
})();
