// V4: 11 cihaz-testi hatasının gerileme testleri + yeni arayüz (kavisli cam yan menü, gündüz/gece anahtarı,
// yüzen alt gezinme, hızlı eylem menüsü, komut araması, adım çubuğu, halka ve sıvı anahtar). Dış istek olmamalı.
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.on('dialog', d => d.accept());
const ext = []; p.on('request', r => { if (!/^(http:\/\/localhost|data:|blob:)/.test(r.url())) ext.push(r.url()); });
let ok = 0, fail = 0;
const log = (n, c, x = '') => { c ? ok++ : fail++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n}${x !== '' ? ' -> ' + (typeof x === 'string' ? x : JSON.stringify(x)) : ''}`); };
const prep = () => p.evaluate(() => { try { closeProfileModal(); } catch (_) {} try { localStorage.setItem('vitatakip_spotlight_seen_' + activeUserId, '1'); document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'); } catch (_) {} });
await prep();

/* ---------- Bölüm 1–3: hata gerilemeleri ---------- */
await p.evaluate(() => { localStorage.setItem('vitatakip_remember_me', 'true'); localStorage.setItem('vitatakip_remembered_user_id', activeUserId); localStorage.setItem('vitatakip_remembered_fullname', 'Test Kullanici'); localStorage.setItem('vitatakip_active_session_id', activeUserId); handleLogout(); });
await sleep(300);
const p2 = await b.newPage(); await p2.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle2' }); await sleep(1500);
const r1 = await p2.evaluate(() => ({ active: activeUserId, auth: !document.getElementById('authModal').classList.contains('hidden'), quick: !document.getElementById('authRememberedQuickLoginBox').classList.contains('hidden'), forget: !!document.getElementById('authForgetRememberedBtn') }));
log('#1 Güvenli çıkıştan sonra yeniden açılışta giriş ekranı (otomatik giriş yok); hatırlanan hesap kartı + Hesabı Unut', !r1.active && r1.auth && r1.quick && r1.forget, r1);
await p2.evaluate(() => document.getElementById('authForgetRememberedBtn').click()); await sleep(150);
const r1b = await p2.evaluate(() => ({ id: localStorage.getItem('vitatakip_remembered_user_id'), name: localStorage.getItem('vitatakip_remembered_fullname'), box: document.getElementById('authRememberedQuickLoginBox').classList.contains('hidden'), users: JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]').length }));
log('#1 "Hesabı Unut" hatırlanan oturumu temizler; hesap verisi silinmez', r1b.id === null && r1b.name === null && r1b.box && r1b.users >= 1, r1b);
await p2.close();
// tekrar giriş
await p.evaluate(() => { document.getElementById('authInputFullName').value = 'Test Kullanici'; document.getElementById('authInputPassword').value = 'testpass123'; document.getElementById('authSubmitBtn').click(); }); await sleep(1800); await prep();

const r2 = await p.evaluate(() => {
  state.user.gender = 'E';
  state.labHistory = [{ id: 'l1', date: '2026-11-10', hb: 16.9, alt: 51, d3: 28.29, references: { hb: '132 - 173 g/L', alt: '0 - 50 U/L', d3: '30 - 100 ng/mL' }, genderAtTest: 'E', timestamp: Date.now() }]; saveState();
  const hb = getLabHistoryMetric(state.labHistory[0], { key: 'hb', label: 'Hemoglobin', unit: 'g/dL' });
  const unitless = getLabHistoryMetric({ hb: 16.9, references: { hb: '132 - 173' }, genderAtTest: 'E' }, { key: 'hb', label: 'Hemoglobin', unit: 'g/dL' });
  const alt = getLabHistoryMetric(state.labHistory[0], { key: 'alt', label: 'ALT', unit: 'U/L' });
  return { hb: hb.status, unitless: unitless.status, alt: alt.status, out: labRecordHasPortalOutOfRange({ hb: 16.9, references: { hb: '132 - 173 g/L' } }) };
});
log('#2 Geçmiş Tahlillerim: Hb 16,9 g/dL ↔ 132–173 g/L normal (birimsiz referansta da); ALT 51 referans dışı', r2.hb === 'within' && r2.unitless === 'within' && r2.alt === 'outside' && r2.out === false, r2);

const r3 = await p.evaluate(() => { Object.assign(state.user, { age: 30, gender: 'E', height: 178, weight: 75, profileCompleted: true, pregnancyStage: '' }); renderParsedResultsPreview({ creatinine: { value: '0.88', unit: 'mg/dL', name: 'Kreatinin' } }); const t = document.body.textContent.replace(/\s+/g, ' '); const i = t.indexOf('Otomatik Böbrek Fonksiyonu'); return t.slice(i, i + 120); });
await p.evaluate(() => { try { closeENabizModal(); } catch (_) {} });
log('#3 e-Nabız PDF önizlemesi: "G1 — açıklama", undefined yok', /G1 — Normal/.test(r3) && !/undefined/.test(r3), r3);

const r4 = await p.evaluate(async () => {
  localStorage.setItem('vita_gemini_api_key', 'AIzaSyTESTKEYTESTKEYTESTKEYTESTKEY12'); localStorage.setItem('vita_ai_consent_' + activeUserId, 'true');
  const cb = document.getElementById('aiHealthDataConsent'); cb.checked = true; VitaAIChat.setRuntimeStatus('LIVE');
  cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); const afterChange = document.getElementById('ai-runtime-status').textContent;
  VitaAIChat.setRuntimeStatus('LIVE'); VitaAIChat.toggle(true); await new Promise(r => setTimeout(r, 150)); const onOpen = document.getElementById('ai-runtime-status').textContent; VitaAIChat.toggle(false);
  localStorage.removeItem('vita_gemini_api_key'); return { afterChange, onOpen };
});
log('#4 Onay kaldırılınca ve asistan açılınca rozet anında "Yerel bilgi modu"', r4.afterChange === 'Yerel bilgi modu' && r4.onOpen === 'Yerel bilgi modu', r4);

await p.evaluate(() => showToast('Doktora Özet Raporu Hazırlandı', 'test', 'success')); await p.emulateMediaType('print');
const r5 = await p.evaluate(() => ['toastNotification', 'vtSpeedDial', 'appDrawer'].map(id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'yok'; }).concat(getComputedStyle(document.querySelector('.vita-mobile-nav')).display));
log('#5 Yazdırmada toast ve yüzen katmanlar (hızlı menü, yan menü, alt gezinme) gizli', r5.every(d => d === 'none' || d === 'yok'), r5);
const r6b = await p.evaluate(() => { renderLabHistoryPrintSheet(); const c = document.querySelector('#vitaLabHistoryPrintSheet [data-lab-card]'); const cs = getComputedStyle(c); return { bi: cs.breakInside, head: getComputedStyle(c.querySelector('.lab-print-record-head')).breakAfter }; });
await p.emulateMediaType('screen');
const r6 = await p.evaluate(() => { const t = document.getElementById('vitaLabHistoryPrintSheet').innerText; return { eval: /Değerlendirildi/.test(t), high: /Yüksek/.test(t), low: /Düşük/.test(t), normal: /Normal/.test(t), title: t.split('\n').some(l => l.trim() === 'Tahlil Geçmişi ve Boylamsal Takip Raporu') }; });
log('#6 Tahlil geçmişi PDF: Durum Normal/Düşük/Yüksek; "Boylamsal" başlık; bloklar sayfada bölünmez', !r6.eval && r6.high && r6.low && r6.normal && r6.title && r6b.bi === 'avoid' && r6b.head === 'avoid', { r6, r6b });

const r7 = await p.evaluate(() => { state.user.chronic = ['blood_thinner', 'statin']; state.user.medications = []; renderSettingsView(); return document.getElementById('settingsProfileMedsSummary').textContent; });
log('#7 Ayarlar profil kartında Türkçe etiket (ham kod yok)', /Kan Sulandırıcı İlaç/.test(r7) && !/blood_thinner|statin\b/.test(r7), r7);

const r8 = await p.evaluate(async () => { openProfileModal(true); await new Promise(r => setTimeout(r, 250)); const g = document.getElementById('modalInputGender'), s = document.getElementById('modalPregnancyStatus'); g.value = 'K'; g.dispatchEvent(new Event('change', { bubbles: true })); s.value = 't1'; const shownK = !document.getElementById('modalPregnancyBox').hidden; g.value = 'E'; g.dispatchEvent(new Event('change', { bubbles: true })); const r = { shownK, hiddenE: document.getElementById('modalPregnancyBox').hidden, val: s.value }; closeProfileModal(); return r; });
log('#8 Erkek seçilince Gebelik / emzirme alanı gizlenir ve sıfırlanır', r8.shownK && r8.hiddenE && r8.val === '', r8);

const r9 = await p.evaluate(async () => { navigateToView('view-add-supplement'); await new Promise(r => setTimeout(r, 300)); VitaSupPage.setVakits(['Akşam', 'Gece']); VitaSupPage.setClock('Akşam', '19:00'); VitaSupPage.setClock('Gece', '22:00'); document.querySelector('[data-freq="days"]').click(); VitaSupPage.setDays([1, 4, 6, 0]); VitaSupPage.refresh(); return document.getElementById('manualSupDosePreview').textContent; });
log('#9 Takviye özeti: her saat bir kez', (r9.match(/22:00/g) || []).length === 1 && /Pzt, Per, Cmt, Paz/.test(r9), r9);

const r10 = await p.evaluate(async () => { navigateToView('view-home'); state.supplements = []; saveState(); renderDailyTab(); await new Promise(r => setTimeout(r, 200)); const a = document.getElementById('vdsVitaNote').textContent; state.supplements = [{ id: 's1', name: 'Mg', timing: 'Sabah', scheduleTime: '08:00', taken: false, scheduleDays: [0,1,2,3,4,5,6], toplamKutuAdedi: 30, kalanAdet: 30, gunlukDoz: 1, addedDate: Date.now() }]; saveState(); renderDailyTab(); await new Promise(r => setTimeout(r, 200)); return { a, b: document.getElementById('vdsVitaNote').textContent }; });
log('#10 Halka açıklaması: takviye yoksa "Yalnızca su hedefi (%100)", varsa %70 + %30', r10.a === 'Yalnızca su hedefi (%100)' && /%70/.test(r10.b), r10);

const r11 = await p.evaluate(async () => {
  state.labHistory = [{ id: 'a', date: '2026-08-01', hb: 15.2, references: {}, genderAtTest: 'E' }, { id: 'b', date: '2026-11-10', hb: 16.9, references: {}, genderAtTest: 'E' }]; saveState();
  navigateToView('view-labs'); await new Promise(r => setTimeout(r, 300)); document.querySelectorAll('.lt-row').forEach(d => { if (/Hemoglobin/.test(d.textContent)) d.open = true; }); await new Promise(r => setTimeout(r, 300));
  const svg = [...document.querySelectorAll('svg.lt-chart')].find(s => /Hemoglobin/.test(s.getAttribute('aria-label') || ''));
  const u = svg.querySelector('.lt-unit').getBBox(); const top = [...svg.querySelectorAll('text[text-anchor="end"]')].filter(t => /^\d/.test(t.textContent)).map(t => t.getBBox()).sort((x, y) => x.y - y.y)[0];
  Object.assign(state.user, { dietPattern: 'omnivore', fishPerWeek: '1', redMeatPerWeek: '1', sunExposureDaily: '10-20' }); executeCDSSRules();
  const f = state.lastCDSS.findings.find(x => /Yaşam tarzı/.test(x.title));
  return { gap: +(top.y - (u.y + u.height)).toFixed(1), detail: f.detail };
});
log('#11 Grafik birim etiketi en üst eksen sayısıyla çakışmaz; rapor cümlesi "güneşlenme" ile biter', r11.gap > 2 && /10–20 dakika güneşlenme\.$/.test(r11.detail), r11);

/* ---------- Bölüm 4: arayüz ---------- */
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, hasTouch: true }); await sleep(300);
await p.evaluate(() => navigateToView('view-home'));
const s1 = await p.evaluate(() => ({ groups: [...document.querySelectorAll('#appDrawer .vt-grp .vt-grp-t')].map(e => e.textContent), foot: [...document.querySelectorAll('#appDrawer .vt-sb-foot > button')].map(b => b.id), profile: !!document.querySelector('#vtSbProfile #drawerUserName'), ids: ['drawer-nav-view-home', 'drawer-nav-vita-oyunlar', 'drawer-add-supplement', 'drawer-nav-egfr-calculator'].every(id => document.getElementById(id)) }));
log('Yan menü: profil kartı, 6 akordeon grup (Genel Bakış … VitaAI & NeyimVar?), altta Ayarlar + Güvenli Çıkış; eski id\'ler korunur', s1.groups.slice(0, 5).join('|') === 'Genel Bakış|Tahlillerim & Trend|Klinik Analiz & Raporlar|Takviyeler & İlaçlar|VitaAI & NeyimVar?' && s1.foot.length === 2 && s1.profile && s1.ids, s1);
const burger = await p.$('.vt-burger');
await burger.click(); await sleep(650);
const s2 = await p.evaluate(() => ({ exp: document.querySelector('.vt-burger').getAttribute('aria-expanded'), open: document.getElementById('appDrawer').classList.contains('vt-open'), x: Math.round(document.getElementById('appDrawer').getBoundingClientRect().left), blur: getComputedStyle(document.getElementById('drawerBackdrop')).backdropFilter }));
await p.keyboard.press('Escape'); await sleep(650);
const s2b = await p.evaluate(() => ({ exp: document.querySelector('.vt-burger').getAttribute('aria-expanded'), right: Math.round(document.getElementById('appDrawer').getBoundingClientRect().right) }));
log('Mobil: ☰ → × (aria-expanded), cam çekmece soldan açılır, arka plan bulanık; Esc ile kapanır', s2.exp === 'true' && s2.open && s2.x === 0 && /blur/.test(s2.blur) && s2b.exp === 'false' && s2b.right <= 0, { s2, s2b });
await p.evaluate(() => { openAppDrawer(); document.querySelector('.vt-grp[data-grp="klinik"] .vt-grp-h').click(); });
const s3 = await p.evaluate(() => document.querySelector('.vt-grp[data-grp="klinik"]').classList.contains('is-open'));
await p.evaluate(() => document.getElementById('drawer-nav-view-report').click()); await sleep(500);
const s3b = await p.evaluate(() => ({ view: !document.getElementById('view-report').classList.contains('hidden'), closed: !document.getElementById('appDrawer').classList.contains('vt-open') }));
log('Akordeon grup açılır; menü öğesine tıklayınca sayfa açılır ve çekmece kapanır', s3 && s3b.view && s3b.closed, s3b);

const s4 = await p.evaluate(() => { const nav = document.querySelector('nav.vita-mobile-nav'); const btns = [...nav.querySelectorAll('[data-bnav]')]; return { n: btns.length, labels: btns.map(x => x.textContent.trim()), floating: getComputedStyle(nav.querySelector('.vt-bnav-pill')).backdropFilter }; });
await p.evaluate(() => document.getElementById('mobile-nav-view-labs').click()); await sleep(650);
const s4b = await p.evaluate(() => { const on = document.querySelector('.vt-bnav [data-bnav].is-on'), ind = document.querySelector('.vt-bnav-ind'); const label = on.querySelector('span'); const off = document.querySelector('.vt-bnav [data-bnav="home"] span'); return { on: on.dataset.bnav, labelW: label.getBoundingClientRect().width, offW: off.getBoundingClientRect().width, indX: Math.round(ind.getBoundingClientRect().left), onX: Math.round(on.getBoundingClientRect().left), view: !document.getElementById('view-labs').classList.contains('hidden') }; });
log('Yüzen cam alt gezinme: 5 sekme (Ana Sayfa, Tahliller, Analiz, Takviyeler, VitaAI); kapsül etkin sekmeye kayar, yalnız etkin etiket açılır', s4.n === 5 && s4.labels.join('|') === 'Ana Sayfa|Tahliller|Analiz|Takviyeler|VitaAI' && /blur/.test(s4.floating) && s4b.on === 'labs' && s4b.view && s4b.labelW > 20 && s4b.offW < 1 && Math.abs(s4b.indX - s4b.onX) <= 1, { s4, s4b });
await p.evaluate(() => document.getElementById('mobile-nav-vitaai').click()); await sleep(300);
const s5 = await p.evaluate(() => ({ chat: !document.getElementById('vita-ai-chatbox').classList.contains('hidden'), on: document.querySelector('.vt-bnav [data-bnav].is-on')?.dataset.bnav, dialHidden: getComputedStyle(document.getElementById('vtSpeedDial')).display === 'none' }));
await p.evaluate(() => VitaAIChat.toggle(false)); await sleep(200);
log('VitaAI sekmesi asistanı açar (sekme etkin); sohbet açıkken hızlı menü gizlenir', s5.chat && s5.on === 'ai' && s5.dialHidden, s5);

const w0 = await p.evaluate(() => state.hydration.current);
await p.evaluate(() => document.getElementById('vtDialBtn').click()); await sleep(450);
const s6 = await p.evaluate(() => { const fab = document.getElementById('vitaAiFab').getBoundingClientRect(), dial = document.getElementById('vtDialBtn').getBoundingClientRect(); return { open: document.getElementById('vtSpeedDial').classList.contains('is-open'), exp: document.getElementById('vtDialBtn').getAttribute('aria-expanded'), acts: [...document.querySelectorAll('.vt-dial-act b')].map(x => x.textContent), overlap: !(dial.right <= fab.left || dial.left >= fab.right || dial.bottom <= fab.top || dial.top >= fab.bottom) }; });
await p.evaluate(() => document.querySelector('.vt-dial-act[data-act="water"]').click()); await sleep(200);
const w1 = await p.evaluate(() => state.hydration.current);
log('Hızlı eylem (+): VitaAI düğmesini örtmez; 3 kısayol; +250 ml su ekler', s6.open && s6.exp === 'true' && s6.acts.length === 3 && !s6.overlap && w1 - w0 === 250, { s6, w0, w1 });
await p.evaluate(() => { document.getElementById('vtDialBtn').click(); document.querySelector('.vt-dial-act[data-act="pdf"]').click(); }); await sleep(300);
const s6b = await p.evaluate(() => { const m = document.getElementById('eNabizModal'); const open = m && getComputedStyle(m).display !== 'none'; try { closeENabizModal(); } catch (_) {} return { open, labs: !document.getElementById('view-labs').classList.contains('hidden') }; });
log('Hızlı eylem: e-Nabız PDF yükle penceresi açılır', s6b.open && s6b.labs, s6b);

// Komut araması (masaüstü)
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 }); await sleep(500);
await p.keyboard.down('Control'); await p.keyboard.press('KeyK'); await p.keyboard.up('Control'); await sleep(150);
const c0 = await p.evaluate(() => ({ focus: document.activeElement.id, groups: [...document.querySelectorAll('#globalSearchResults .vt-cmd-g')].map(g => g.textContent) }));
await p.keyboard.type('fer'); await sleep(200);
const c1 = await p.evaluate(() => [...document.querySelectorAll('#globalSearchResults .vt-cmd-g')].map(g => g.textContent));
await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement.blur());
await p.keyboard.press('/'); await sleep(100); await p.keyboard.type('ferritin'); await sleep(200);
const c2 = await p.evaluate(() => ({ focus: document.activeElement.id, first: document.querySelector('#globalSearchResults .vt-cmd-i.is-sel b')?.textContent }));
await p.keyboard.press('Enter'); await sleep(600);
const c3 = await p.evaluate(() => ({ labs: !document.getElementById('view-labs').classList.contains('hidden'), focus: document.activeElement.id }));
log('Komut araması: Ctrl+K ve "/" odaklar; boşken Hızlı İşlemler + Modüller; sonuçlar gruplu; Enter ile tahlil alanına gider', c0.focus === 'globalSearchInput' && c0.groups.join('|') === 'Modüller|Hızlı İşlemler' && c1.includes('Tahlil Parametreleri') && c2.focus === 'globalSearchInput' && /Ferritin/.test(c2.first) && c3.labs && c3.focus === 'inputLabFerritin', { c0, c1, c2, c3 });

// Masaüstü ray
const d1 = await p.evaluate(async () => { VitaUiV4.setRail(true); await new Promise(r => setTimeout(r, 650)); const a = { rail: document.body.classList.contains('vt-has-rail'), w: Math.round(document.getElementById('appDrawer').getBoundingClientRect().width), pad: getComputedStyle(document.body).paddingLeft, burger: getComputedStyle(document.querySelector('.vt-burger')).display, bnav: getComputedStyle(document.querySelector('nav.vita-mobile-nav')).display };
  document.getElementById('vtSbPin').click(); await new Promise(r => setTimeout(r, 650));
  closeAppDrawer(); const b = { w: Math.round(document.getElementById('appDrawer').getBoundingClientRect().width), pad: getComputedStyle(document.body).paddingLeft, labelHidden: getComputedStyle(document.querySelector('.vt-grp-t')).display === 'none', saved: localStorage.getItem('vt_rail_open') };
  return { a, b }; });
log('Masaüstü: sabit cam ray (genişletilmiş 284 px ↔ daraltılmış 76 px yalnız ikonlar), içerik kayar; ☰ ve alt gezinme gizli', d1.a.rail && d1.a.w === 284 && d1.a.pad === '284px' && d1.a.burger === 'none' && d1.a.bnav === 'none' && d1.b.w === 76 && d1.b.pad === '76px' && d1.b.labelHidden && d1.b.saved === '0', d1);
const o1 = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
log('Masaüstü 1440 px: yatay taşma yok', o1.sw === o1.iw, o1);

// Gündüz / gece anahtarı
const t1 = await p.evaluate(async () => { const btn = document.getElementById('vtThemeToggleHeader'); const vt = typeof document.startViewTransition === 'function'; btn.click(); const portal = document.documentElement.classList.contains('vt-portal'); await new Promise(r => setTimeout(r, 900)); const r = { vt, portal, dark: document.documentElement.getAttribute('data-theme'), checked: btn.getAttribute('aria-checked'), settings: document.getElementById('vtThemeToggleSettings').getAttribute('aria-checked'), portalEnd: document.documentElement.classList.contains('vt-portal') }; btn.click(); await new Promise(r => setTimeout(r, 900)); r.back = document.documentElement.getAttribute('data-theme'); return r; });
log('Gündüz/gece anahtarı: tıklanan noktadan portal geçişi (View Transitions), iki anahtar eşitlenir, geri alınır', t1.dark === 'dark' && t1.checked === 'true' && t1.settings === 'true' && (!t1.vt || t1.portal) && !t1.portalEnd && t1.back === null, t1);

// Adım çubukları, kademeli kartlar, halka, sıvı anahtar
const g1 = await p.evaluate(async () => { navigateToView('view-neyim'); await new Promise(r => setTimeout(r, 300)); vitaAnamnesisStep(1); vitaAnamnesisStep(1); await new Promise(r => setTimeout(r, 300)); const segs = [...document.querySelectorAll('#anamnesisCategoryProgress .vt-seg-s')]; return { n: segs.length, done: segs.filter(s => s.classList.contains('is-done') && s.querySelector('.fa-check')).length, cur: segs.findIndex(s => s.classList.contains('is-cur')) }; });
log('NeyimVar? 7 adımlı segment çubuğu: tamamlanan adımlar ✓, geçerli adım vurgulu', g1.n === 7 && g1.done === 2 && g1.cur === 2, g1);
const g2 = await p.evaluate(async () => { openProfileModal(true); await new Promise(r => setTimeout(r, 250)); VitaProfileSteps.go(2); await new Promise(r => setTimeout(r, 150)); const r = [...document.querySelectorAll('#profileModal .vpst-tab')].map(t => t.classList.contains('vt-done')); closeProfileModal(); return r; });
log('İlk kurulum / profil sihirbazı: geçilen adımlar ✓ olur', g2.join() === 'true,true,false', g2);
const g3 = await p.evaluate(async () => { navigateToView('view-labs'); navigateToView('view-home'); await new Promise(r => setTimeout(r, 60)); const v = document.getElementById('view-home'); const anim = getComputedStyle(v.firstElementChild).animationName; return { st: v.classList.contains('vt-stagger'), anim, idx: [...v.children].filter(c => c.offsetParent !== null).slice(0, 3).map(c => c.style.getPropertyValue('--vt-i')) }; });
log('Ana Sayfa kartları kademeli (staggered fade-up) yerleşir', g3.st && g3.anim === 'vtFadeUp' && g3.idx.join() === '0,1,2', g3);
const g4 = await p.evaluate(async () => { toggleDailySummaryPanel && toggleDailySummaryPanel(); await new Promise(r => setTimeout(r, 100)); const ring = document.getElementById('vdsVitaRing'); const before = ring; state.supplements[0].taken = true; saveState(); renderDailyTab(); VitaSummaryTabs.render(); await new Promise(r => setTimeout(r, 120)); const mid = ring.querySelector('b').textContent; await new Promise(r => setTimeout(r, 900)); return { same: document.getElementById('vdsVitaRing') === before, mid, end: ring.querySelector('b').textContent, p: ring.style.getPropertyValue('--p'), tr: getComputedStyle(ring).transitionProperty }; });
log('Günlük uyum halkası yerinde güncellenir, yüzde akıcı sayar (Ring Steps)', g4.same && /--p/.test(g4.tr) && g4.end === g4.p + '%' && g4.mid !== g4.end, g4);
const g5 = await p.evaluate(() => ['aiHealthDataConsent', 'settingsCameraAppConsentCheckbox', 'vtThemeSystem'].map(id => { const e = document.getElementById(id); return e && e.classList.contains('vt-liquid') && getComputedStyle(e).appearance === 'none'; }));
log('Ayarlar anahtarları sıvı dolum (Liquid Fill) stilinde', g5.every(Boolean), g5);

// Telefon genişliklerinde taşma
for (const w of [360, 430]) { await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1, hasTouch: true }); await sleep(250); const o = await p.evaluate(() => { const r = []; for (const v of ['view-home', 'view-labs', 'view-settings']) { navigateToView(v); r.push(document.documentElement.scrollWidth); } return { sw: r, iw: innerWidth }; }); log(`${w} px: yatay taşma yok (Ana Sayfa, Tahliller, Ayarlar)`, o.sw.every(x => x === o.iw), o); }
log('Dış istek yok', ext.length === 0, ext.slice(0, 2).join(' '));
log('Sayfa hatası yok', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(`ÖZET ${ok}/${ok + fail}`);
await b.close(); process.exit(fail ? 1 : 0);
