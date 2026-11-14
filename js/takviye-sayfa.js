/* Takviye Ekle sayfası: kompakt kullanım planı (günde kaç adet −/+, Her gün / belirli günler, çoklu vakit + saat),
   canlı özet, akıllı zamanlama önerisi ve mevcut takviye/ilaçlarla saat çakışması uyarısı (en az 2 saat).
   Kayıt commitManualSupplement'ta: her vakit için bir kayıt (aynı groupId), gün listesi scheduleDays. */
(function () {
  "use strict";
  var ORDER = ["Sabah", "Öğle", "Akşam", "Gece"];
  var DEFAULT_CLOCK = { "Sabah": "08:00", "Öğle": "13:00", "Akşam": "19:00", "Gece": "22:00" };
  var ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
  var st = { freq: "daily", days: new Set(ALL_DAYS), vakits: { "Sabah": DEFAULT_CLOCK["Sabah"] } };

  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fold(v) { return typeof window.vitaFold === "function" ? window.vitaFold(v) : String(v || "").toLocaleLowerCase("tr-TR"); }
  function isClock(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || "")); }
  function mins(c) { var p = String(c || "00:00").split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function clockFrom(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }

  /* Ürün türüne göre kısa zamanlama/emilim önerisi */
  var ADVICE = [
    [/omega|balik yagi|\bepa\b|\bdha\b/, "Emilim için akşam veya yağlı bir öğünle tok karnına alınması önerilir."],
    [/d3|d vitamini|vitamin d|kolekalsiferol|k2|menakinon/, "Sabah veya öğlen saatlerinde, yağ içeren bir öğünle alınması tavsiye edilir."],
    [/demir|ferro|iron|feramat|microfer|lipofer/, "Aç karnına veya yemeklerden 2 saat sonra alınız; çay, kahve ve süt ürünlerinden 2 saat uzak tutun."],
    [/magnezyum|magnesium/, "Akşam veya yatmadan önce alınması önerilir; demir ve tiroid ilacından ayrı saatte alın."],
    [/kalsiyum|calcium|osteocare/, "Yemekle birlikte alın; demir ve çinkodan en az 2 saat ayrı tutun."],
    [/cinko|zinc/, "Yemekle birlikte alın (aç karnına mide bulandırabilir); demir ve kalsiyumdan ayrı saatte alın."],
    [/b12|kobalamin/, "Sabah alınması önerilir; dilaltı formu dilin altında eriyene kadar bekletin."],
    [/folat|folik/, "Sabah, yemekle veya yemeksiz alınabilir."],
    [/c vitamini|vitamin c|redoxon/, "Yemekle alın; demirle birlikte alınırsa demir emilimini artırır."],
    [/probiyotik/, "Kahvaltıdan önce alın; sıcak içecekle birlikte almayın."],
    [/kolajen|collagen/, "Bol suyla, tercihen sabah aç karnına alın."],
    [/multivitamin|supradyn|pharmaton/, "Kahvaltıda, yemekle birlikte alın."]
  ];
  function adviceFor(text) { var t = fold(text); for (var i = 0; i < ADVICE.length; i++) if (ADVICE[i][0].test(t)) return ADVICE[i][1]; return ""; }

  /* Emilim rekabeti: birbirinden en az 2 saat ayrı alınması önerilen mineraller; tiroid ilacı ile 4 saat */
  var MINERALS = { demir: /demir|ferro|iron|feramat|microfer|lipofer/, kalsiyum: /kalsiyum|calcium|osteocare/, cinko: /cinko|zinc/, magnezyum: /magnezyum|magnesium/ };
  var LABEL = { demir: "Demir", kalsiyum: "Kalsiyum", cinko: "Çinko", magnezyum: "Magnezyum" };
  var PAIRS = [["demir", "kalsiyum"], ["demir", "cinko"], ["demir", "magnezyum"], ["kalsiyum", "cinko"], ["kalsiyum", "magnezyum"]];
  function mineralsOf(text) { var t = fold(text); return Object.keys(MINERALS).filter(function (k) { return MINERALS[k].test(t); }); }
  function competes(a, b) { return PAIRS.some(function (p) { return (a === p[0] && b === p[1]) || (a === p[1] && b === p[0]); }); }
  function daysOverlap(a, b) { return a.some(function (d) { return b.indexOf(d) > -1; }); }

  function conflicts() {
    var name = ($("manualSupName") || {}).value || "", brand = ($("manualSupBrandActive") || {}).value || "";
    var mine = mineralsOf(name + " " + brand);
    if (!mine.length) return [];
    var plan = getPlan(), out = [];
    var state0 = typeof state !== "undefined" ? state : null;
    (state0 && Array.isArray(state0.supplements) ? state0.supplements : []).forEach(function (s) {
      var theirs = mineralsOf((s.name || "") + " " + (s.markaEtken || ""));
      var clash = mine.filter(function (m) { return theirs.some(function (o) { return competes(m, o); }); });
      if (!clash.length) return;
      var theirDays = Array.isArray(s.scheduleDays) && s.scheduleDays.length ? s.scheduleDays.map(Number) : ALL_DAYS;
      if (!daysOverlap(plan.days, theirDays)) return;
      var theirClock = typeof getSupplementTimeLabel === "function" ? getSupplementTimeLabel(s) : "08:00";
      plan.vakits.forEach(function (v) {
        var diff = Math.abs(mins(v.clock) - mins(theirClock)); diff = Math.min(diff, 1440 - diff);
        if (diff < 120) out.push({ vakit: v.vakit, clock: v.clock, other: s.name, otherClock: theirClock, need: 120, what: clash.map(function (m) { return LABEL[m]; }).join("/") + " – " + theirs.map(function (m) { return LABEL[m]; }).join("/") });
      });
    });
    // Tiroid ilacı (levotiroksin) ile demir/kalsiyum/magnezyum: en az 4 saat
    if (mine.some(function (m) { return m !== "cinko"; }) && state0 && Array.isArray(state0.medications)) {
      state0.medications.forEach(function (med) {
        if (!/levotiroksin|euthyrox|levotiron|tefor/.test(fold(med.name + " " + (med.etkenMadde || "")))) return;
        (med.clocks || []).forEach(function (mc) {
          plan.vakits.forEach(function (v) {
            var diff = Math.abs(mins(v.clock) - mins(mc)); diff = Math.min(diff, 1440 - diff);
            if (diff < 240) out.push({ vakit: v.vakit, clock: v.clock, other: med.name, otherClock: mc, need: 240, what: "tiroid ilacı" });
          });
        });
      });
    }
    return out;
  }

  function getPlan() {
    var vakits = ORDER.filter(function (v) { return st.vakits[v]; }).map(function (v) { return { vakit: v, clock: isClock(st.vakits[v]) ? st.vakits[v] : DEFAULT_CLOCK[v] }; });
    var days = st.freq === "daily" ? ALL_DAYS.slice() : ALL_DAYS.filter(function (d) { return st.days.has(d); });
    return { vakits: vakits, days: days };
  }

  function renderChips() {
    document.querySelectorAll("#modalDoseFieldset .vsp-segbtn").forEach(function (b) {
      var on = b.dataset.freq === st.freq; b.classList.toggle("is-on", on); b.setAttribute("aria-checked", on ? "true" : "false");
    });
    var days = $("vspDays"); if (days) days.classList.toggle("hidden", st.freq !== "days");
    document.querySelectorAll("#vspDays .vsp-chip").forEach(function (b) { var on = st.days.has(Number(b.dataset.day)); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    document.querySelectorAll("#vspVakits .vsp-chip").forEach(function (b) { var on = !!st.vakits[b.dataset.vakit]; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }
  function renderClocks() {
    var box = $("vspClocks"); if (!box) return;
    var plan = getPlan(), daily = Math.max(1, parseInt(($("manualSupDailyDose") || {}).value, 10) || 1);
    var total = Math.max(plan.vakits.length, daily), k = plan.vakits.length || 1;
    var unit = ($("manualSupDoseUnit") || {}).value || "adet";
    box.innerHTML = plan.vakits.map(function (v, i) {
      var amount = Math.floor(total / k) + (i < total % k ? 1 : 0);
      return '<label class="vsp-clock"><span>' + esc(v.vakit) + ' <small>' + amount + " " + esc(unit) + '</small></span><input type="time" step="300" value="' + v.clock + '" data-vakit="' + esc(v.vakit) + '" aria-label="' + esc(v.vakit) + ' saati"/></label>';
    }).join("");
  }
  function renderPreview() {
    var p = $("manualSupDosePreview"); if (!p) return;
    var plan = getPlan();
    var daily = Math.max(plan.vakits.length || 1, parseInt(($("manualSupDailyDose") || {}).value, 10) || 1);
    var unit = ($("manualSupDoseUnit") || {}).value || "tablet";
    var strength = String(($("manualSupDose") || {}).value || "").trim();
    var hunger = String(($("manualSupHungerNote") || {}).value || "").trim();
    var dayLabel = typeof getSupplementScheduleDaysLabel === "function" ? getSupplementScheduleDaysLabel({ scheduleDays: plan.days }) : "";
    p.textContent = ["Günde " + daily + " " + unit + (strength ? " (" + strength + ")" : ""), plan.vakits.map(function (v) { return v.vakit + " " + v.clock; }).join(", ") || "vakit seçilmedi", plan.days.length ? dayLabel : "gün seçilmedi", hunger].filter(Boolean).join(" · ");
  }
  function renderAdvice() {
    var box = $("vspAdvice"); if (!box) return;
    var name = ($("manualSupName") || {}).value || "", brand = ($("manualSupBrandActive") || {}).value || "";
    var tip = name.trim().length >= 2 ? adviceFor(name + " " + brand) : "";
    box.classList.toggle("hidden", !tip);
    box.innerHTML = tip ? '<i class="fa-solid fa-circle-info" aria-hidden="true"></i> <span><b>Öneri:</b> ' + esc(tip) + "</span>" : "";
  }
  function renderConflicts() {
    var box = $("vspConflict"); if (!box) return;
    var list = conflicts();
    box.classList.toggle("hidden", !list.length);
    box.innerHTML = list.length ? '<b><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Saat çakışması</b>' + list.map(function (c) {
      var hours = c.need / 60;
      return '<div class="vsp-cf"><span>' + esc(c.vakit) + " " + esc(c.clock) + " — <b>" + esc(c.other) + "</b> (" + esc(c.otherClock) + ") ile " + esc(c.what) + " emilimi yarışır. Aralarına en az " + hours + ' saat bırakın.</span><button type="button" data-shift-vakit="' + esc(c.vakit) + '" data-shift-to="' + clockFrom(mins(c.otherClock) + c.need) + '">' + clockFrom(mins(c.otherClock) + c.need) + "'e kaydır</button></div>";
    }).join("") : "";
  }
  function refresh() {
    // Her vakitte en az 1 adet alınır: "Günde kaç adet" vakit sayısından küçük olamaz (stok hesabı doğru kalsın).
    var di = $("manualSupDailyDose"), n = Object.keys(st.vakits).length;
    if (di && (parseInt(di.value, 10) || 1) < n) di.value = String(n);
    renderChips(); renderClocks(); renderPreview(); renderAdvice(); renderConflicts();
    if (typeof updateManualModalStockPreview === "function") try { updateManualModalStockPreview(false); } catch (_) {}
  }
  function reset() {
    st.freq = "daily"; st.days = new Set(ALL_DAYS); st.vakits = { "Sabah": DEFAULT_CLOCK["Sabah"] };
    refresh();
  }
  function setVakits(list) {
    var next = {};
    (list || []).forEach(function (v) { if (ORDER.indexOf(v) > -1) next[v] = st.vakits[v] || DEFAULT_CLOCK[v]; });
    if (Object.keys(next).length) st.vakits = next;
    refresh();
  }
  function setDays(days) {
    var d = (days || []).map(Number).filter(function (x) { return ALL_DAYS.indexOf(x) > -1; });
    if (!d.length || d.length === 7) { st.freq = "daily"; st.days = new Set(ALL_DAYS); }
    else { st.freq = "days"; st.days = new Set(d); }
    refresh();
  }
  function setClock(vakit, clock) { if (st.vakits[vakit] && isClock(clock)) { st.vakits[vakit] = clock; refresh(); } }
  function syncUnitFromForm() {
    var form = ($("manualSupFormText") || {}).value || "", unit = $("manualSupDoseUnit");
    if (unit && form.trim() && typeof guessVitaDoseUnit === "function") unit.value = guessVitaDoseUnit(form);
    refresh();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var step = t.closest(".vsp-stepbtn");
    if (step) {
      var input = $(step.dataset.target); if (!input) return;
      var v = (parseInt(input.value, 10) || 0) + Number(step.dataset.step);
      var min = Number(input.min || 0), max = Number(input.max || 9999);
      input.value = String(Math.max(min, Math.min(max, v)));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    var seg = t.closest("#modalDoseFieldset .vsp-segbtn");
    if (seg) { st.freq = seg.dataset.freq; if (st.freq === "days" && st.days.size === 7) st.days = new Set(); refresh(); return; }
    var day = t.closest("#vspDays .vsp-chip");
    if (day) { var d = Number(day.dataset.day); if (st.days.has(d)) st.days.delete(d); else st.days.add(d); refresh(); return; }
    var vk = t.closest("#vspVakits .vsp-chip");
    if (vk) {
      var name = vk.dataset.vakit;
      if (st.vakits[name]) { if (Object.keys(st.vakits).length > 1) delete st.vakits[name]; else if (typeof showToast === "function") showToast("En az bir vakit", "Takviyeyi alacağınız en az bir vakit seçili kalmalı.", "info"); }
      else st.vakits[name] = DEFAULT_CLOCK[name];
      refresh(); return;
    }
    var shift = t.closest("#vspConflict [data-shift-vakit]");
    if (shift) { setClock(shift.dataset.shiftVakit, shift.dataset.shiftTo); return; }
  });
  document.addEventListener("change", function (e) {
    var inp = e.target && e.target.closest ? e.target.closest("#vspClocks input[data-vakit]") : null;
    if (inp && isClock(inp.value)) { st.vakits[inp.dataset.vakit] = inp.value; renderPreview(); renderConflicts(); }
  });

  window.VitaSupPage = { refresh: refresh, reset: reset, setVakits: setVakits, setDays: setDays, setClock: setClock, getPlan: getPlan, syncUnitFromForm: syncUnitFromForm, adviceFor: adviceFor, conflicts: conflicts };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true }); else refresh();
})();
