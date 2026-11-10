import { S, save, today } from '../store.js';
import { addDaysKey, mondayKey, dowOf, diffDays, isFinalMode } from '../schedule.js';
import { A, F, esc, uid, I, ic, check, empty, head, seg, bar, fmtShort, fmtDay, fmtLong, DOW, openSheet, sheetHead, closeSheet, renderSheet, toast, val, num, del, barChart, lastNDays, minsLabel } from '../ui.js';
import { studyMinutes, englishDone, englishStreak } from '../calc.js';
import { notesView, goalsView, reviewView, settingsView } from './alanlar2.js';

export const AREAS_HUB = [
  ['okul', 'Okul', 'book', 'Quizler, ödevler, çalışma süresi'],
  ['ingilizce', 'İngilizce', 'globe', '8 haftalık A2 programı, kelime kartları'],
  ['gelir', 'Gelir Lab', 'coin', 'CrowdGen, fikirler, bakılacaklar'],
  ['notlar', 'Notlar', 'note', 'Unutma, notlar, yapılacaklar, alınacaklar'],
  ['hedefler', 'Hedefler & ödüller', 'target', 'Büyük hedefler ve kendine ödüller'],
  ['degerlendirme', 'Haftalık değerlendirme', 'review', 'Pazar akşamı 5 dakika'],
  ['ayarlar', 'Ayarlar', 'gear', 'Bildirimler, eşitleme, hedefler, şifre']
];
export function alanlarView(sub) {
  const views = { okul: school, ingilizce: english, gelir: income, notlar: notesView, hedefler: goalsView, degerlendirme: reviewView, ayarlar: settingsView };
  if (sub && views[sub]) {
    const t = AREAS_HUB.find(x => x[0] === sub);
    return `<a class="back" href="#alanlar">${I.back}<span>Alanlar</span></a><div><h1>${t[1]}</h1></div>${views[sub]()}`;
  }
  const k = today();
  const nextItem = S.school.items.filter(i => !i.done && i.date >= k).sort((a, b) => a.date.localeCompare(b.date))[0];
  const badges = {
    okul: nextItem ? `${diffDays(k, nextItem.date) === 0 ? 'Bugün' : diffDays(k, nextItem.date) + ' gün'}: ${courseName(nextItem.courseId)} ${TYPE[nextItem.type]}` : '',
    ingilizce: englishStreak() ? `${englishStreak()} gün seri` : '',
    gelir: S.income.inbox.filter(i => !i.done).length ? `${S.income.inbox.filter(i => !i.done).length} bakılacak` : '',
    notlar: S.notes.items.filter(n => !n.done && n.list !== 'not').length ? `${S.notes.items.filter(n => !n.done && n.list !== 'not').length} açık madde` : ''
  };
  return `<div><p class="eyebrow">Hayatının alanları</p><h1>Alanlar</h1></div>
  <div class="hub">${AREAS_HUB.map(([id, n, icon, d]) => `<a class="hubtile" href="#alanlar/${id}">${ic(icon)}<b>${n}</b><span class="small muted">${d}</span>${badges[id] ? `<span class="chip acc">${esc(badges[id])}</span>` : ''}</a>`).join('')}</div>`;
}
const TYPE = { quiz: 'Quiz', odev: 'Ödev', sinav: 'Sınav' };
const courseName = id => (S.school.courses.find(c => c.id === id) || {}).name || 'Ders';

/* ---------------- school ---------------- */
const LS_TIMER = 'glow.timer';
const timerGet = () => { try { return JSON.parse(localStorage.getItem(LS_TIMER) || 'null'); } catch (e) { return null; } };
const timerSet = v => { try { if (v) localStorage.setItem(LS_TIMER, JSON.stringify(v)); else localStorage.removeItem(LS_TIMER); } catch (e) { } };
export const timerRunning = () => { const t = timerGet(); return t && t.running; };
const elapsed = t => t ? Math.floor(((t.acc || 0) + (t.running ? Date.now() - t.start : 0)) / 1000) : 0;
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function school() {
  const k = today(), mon = mondayKey(k), sun = addDaysKey(mon, 6);
  const finals = diffDays(k, S.settings.finalsDate);
  const items = S.school.items.filter(i => !i.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const doneItems = S.school.items.filter(i => i.done).slice(-5);
  const t = timerGet(), sec = elapsed(t);
  const goal = t && t.goal ? t.goal * 60 : 0;
  const weeks = Array.from({ length: 6 }, (_, i) => addDaysKey(mon, -7 * (5 - i)));
  const weekMins = weeks.map(w => Math.round(studyMinutes(null, w, addDaysKey(w, 6)) / 6) / 10);
  return `
  <div class="statrow"><div class="stat"><b class="tnum">${finals > 0 ? finals : '–'}</b><span>gün finallere</span></div><div class="stat"><b class="tnum">${minsLabel(studyMinutes(null, mon, sun))}</b><span>bu hafta</span></div><div class="stat"><b class="tnum">${items.filter(i => i.date && diffDays(k, i.date) <= 7 && diffDays(k, i.date) >= 0).length}</b><span>7 gün içinde</span></div></div>
  ${isFinalMode(S, k) ? `<div class="banner warnb"><p><b>Final dönemi başladı.</b> Ders saat hedeflerin otomatik 1,5 katına çıktı.</p></div>` : ''}

  <div class="card timer stack-s">
    <div class="sec-h"><h3>${ic('timer', 'xs')} Çalışma zamanlayıcısı</h3>${t ? `<span class="small muted">${esc(courseName(t.courseId))}</span>` : ''}</div>
    ${t ? `<div class="clock tnum" id="clock">${mmss(sec)}</div>${goal ? bar(sec / goal * 100) : ''}
      <div class="inline">${t.running ? `<button class="btn ghost grow" data-a="tmPause">${ic('pause', 'xs')} Ara ver</button>` : `<button class="btn ghost grow" data-a="tmResume">${ic('play', 'xs')} Devam</button>`}<button class="btn grow" data-a="tmStop">Bitir ve kaydet</button></div>
      <button class="linkbtn" data-a="tmCancel">Kaydetmeden iptal et</button>`
    : `<div class="chips wrap">${S.school.courses.map(c => `<button class="fchip ${tmCourse === c.id ? 'on' : ''}" data-a="tmCourse" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>
      <div class="seg">${[[25, '25 dk'], [45, '45 dk'], [60, '60 dk'], [0, 'Serbest']].map(([m, l]) => `<button class="${tmGoal === m ? 'on' : ''}" data-a="tmGoal" data-id="${m}">${l}</button>`).join('')}</div>
      <button class="btn block" data-a="tmStart" ${tmCourse ? '' : 'disabled'}>${ic('play', 'xs')} Başlat</button>`}
  </div>

  <section class="stack-s">${head('Quiz, ödev, sınav', `<button class="btn sm" data-a="itemEdit" data-id="">+ Ekle</button>`)}
    <div class="list">${items.map(i => { const d = i.date ? diffDays(k, i.date) : null; return `<div class="row">${check(false, 'itemDone', i.id, null, i.title, true)}<button class="grow pickt" data-a="itemEdit" data-id="${i.id}"><span class="t">${esc(courseName(i.courseId))} · ${esc(i.title || TYPE[i.type])}</span><span class="small muted">${TYPE[i.type]}${i.date ? ' · ' + esc(fmtDay(i.date)) : ''}${i.time ? ' ' + i.time : ''}</span></button>${d != null ? `<span class="chip ${d < 0 ? 'danger' : d <= 3 ? 'warn' : ''}">${d < 0 ? `${-d} gün geçti` : d === 0 ? 'Bugün' : d + ' gün'}</span>` : ''}</div>`; }).join('') || empty('Quiz ve ödev tarihlerini ekle: 3 gün önce, 1 gün önce ve o sabah hatırlatırım.')}</div>
    ${doneItems.length ? `<p class="small muted">Tamamlananlar: ${doneItems.map(i => esc(courseName(i.courseId) + ' ' + (i.title || TYPE[i.type]))).join(', ')}</p>` : ''}
  </section>

  <section class="stack-s">${head('Bu haftaki çalışma', `<button class="linkbtn" data-a="studyAdd">+ Elle ekle</button>`)}
    <div class="card stack-s">${S.school.courses.map(c => { const m = studyMinutes(c.id, mon, sun), tg = (c.weeklyHours || 0) * 60 * (isFinalMode(S, k) ? 1.5 : 1); return `<div class="stack-xs"><div class="sec-h"><span>${esc(c.name)}${c.focus ? '' : ' <span class="chip">sadece ödev</span>'}</span><span class="small muted tnum">${minsLabel(m)}${tg ? ' / ' + minsLabel(Math.round(tg)) : ''}</span></div>${tg ? bar(m / tg * 100) : ''}</div>`; }).join('')}</div>
  </section>
  <section class="stack-s">${head('Son 6 hafta (saat)')}<div class="card">${barChart(weekMins, { labels: weeks.map(w => fmtShort(w)), unit: ' sa' })}</div></section>

  <section class="stack-s">${head('Derslerim', `<button class="btn sm" data-a="courseEdit" data-id="">+ Ders</button>`)}
    <div class="list">${S.school.courses.map(c => `<button class="row pick" data-a="courseEdit" data-id="${c.id}"><span class="grow"><span class="t">${esc(c.name)}</span><br><span class="small muted">${c.focus ? `odak · haftada ${c.weeklyHours} saat` : 'sadece ödev'}</span></span>${I.chev}</button>`).join('')}</div>
    <p class="small muted">Ders programın Program sekmesinde "Okul" bloğu olarak duruyor. Saat değişirse oradan düzenleyebilirsin.</p></section>`;
}
let tmCourse = null, tmGoal = 25;
A.tmCourse = id => { tmCourse = id; };
A.tmGoal = m => { tmGoal = Number(m); };
A.tmStart = () => { if (!tmCourse) return; timerSet({ courseId: tmCourse, goal: tmGoal, start: Date.now(), acc: 0, running: true, date: today() }); };
A.tmPause = () => { const t = timerGet(); t.acc += Date.now() - t.start; t.running = false; timerSet(t); };
A.tmResume = () => { const t = timerGet(); t.start = Date.now(); t.running = true; timerSet(t); };
A.tmCancel = () => { timerSet(null); };
A.tmStop = () => {
  const t = timerGet(); const min = Math.round(elapsed(t) / 60); timerSet(null);
  if (min < 1) { toast('1 dakikadan kısa, kaydetmedim.'); return; }
  S.school.sessions.push({ date: t.date || today(), courseId: t.courseId, min }); save('school');
  toast(`${courseName(t.courseId)}: ${minsLabel(min)} kaydedildi. Aferin!`);
};
export function tickTimer() { const el = document.getElementById('clock'); const t = timerGet(); if (el && t) el.textContent = mmss(elapsed(t)); if (t && t.running && t.goal && elapsed(t) === t.goal * 60) toast('Süre doldu! Kısa bir mola ver.'); }
function studySheet() {
  return `${sheetHead('Çalışma ekle')}<form data-form="studySave" class="stack">
    <div class="field"><label for="stCourse">Ders</label><select class="inp" id="stCourse">${S.school.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
    <div class="inline"><div class="field grow"><label for="stMin">Dakika</label><input class="inp" id="stMin" type="number" inputmode="numeric" required></div><div class="field grow"><label for="stDate">Tarih</label><input class="inp" id="stDate" type="date" value="${today()}"></div></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.studyAdd = () => openSheet(studySheet);
F.studySave = () => { const m = num('stMin'); if (!m) return; S.school.sessions.push({ date: val('stDate') || today(), courseId: val('stCourse'), min: Math.round(m) }); save('school'); closeSheet(); };
let itemId = null, itemType = 'quiz';
function itemSheet() {
  const i = S.school.items.find(x => x.id === itemId) || { courseId: (S.school.courses[0] || {}).id, type: itemType, title: '', date: addDaysKey(today(), 7), time: '', note: '' };
  return `${sheetHead(itemId ? 'Düzenle' : 'Yeni quiz / ödev / sınav')}
  <form data-form="itemSave" class="stack">
    <div class="seg">${Object.entries(TYPE).map(([t, l]) => `<button type="button" class="${itemType === t ? 'on' : ''}" data-a="itemType" data-id="${t}">${l}</button>`).join('')}</div>
    <div class="field"><label for="itCourse">Ders</label><select class="inp" id="itCourse">${S.school.courses.map(c => `<option value="${c.id}" ${c.id === i.courseId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="itTitle">Başlık (isteğe bağlı)</label><input class="inp" id="itTitle" value="${esc(i.title)}" placeholder="ör. Quiz 2: Laplace dönüşümü"></div>
    <div class="inline"><div class="field grow"><label for="itDate">Tarih</label><input class="inp" id="itDate" type="date" required value="${i.date}"></div><div class="field grow"><label for="itTime">Saat</label><input class="inp" id="itTime" type="time" value="${i.time || ''}"></div></div>
    <div class="field"><label for="itNote">Konular / not</label><textarea class="inp" id="itNote" rows="2">${esc(i.note || '')}</textarea></div>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${itemId ? del('itemDel', itemId) : ''}`;
}
A.itemEdit = id => { itemId = id || null; const i = S.school.items.find(x => x.id === itemId); itemType = i ? i.type : 'quiz'; openSheet(itemSheet); };
A.itemType = t => { itemType = t; renderSheet(); };
F.itemSave = () => { const data = { type: itemType, courseId: val('itCourse'), title: val('itTitle').trim(), date: val('itDate'), time: val('itTime'), note: val('itNote').trim() }; if (!data.date) return; const i = S.school.items.find(x => x.id === itemId); if (i) Object.assign(i, data); else S.school.items.push({ id: uid(), done: false, ...data }); save('school'); closeSheet(); toast('Kaydedildi; zamanı gelince hatırlatırım.'); };
A.itemDel = id => { S.school.items = S.school.items.filter(x => x.id !== id); save('school'); closeSheet(); };
A.itemDone = id => { const i = S.school.items.find(x => x.id === id); i.done = true; save('school'); toast('Tamamlandı!', () => { i.done = false; save('school'); }); };
let courseId = null;
function courseSheet() {
  const c = S.school.courses.find(x => x.id === courseId) || { name: '', weeklyHours: 2, focus: true };
  return `${sheetHead(courseId ? 'Dersi düzenle' : 'Yeni ders')}
  <form data-form="courseSave" class="stack">
    <div class="field"><label for="crName">Ders adı</label><input class="inp" id="crName" required value="${esc(c.name)}"></div>
    <label class="toggle"><input type="checkbox" id="crFocus" ${c.focus ? 'checked' : ''}><span>Odak dersi (haftalık çalışma hedefi var)</span></label>
    <div class="field"><label for="crHours">Haftalık hedef (saat)</label><input class="inp" id="crHours" type="number" step="0.5" min="0" value="${c.weeklyHours}"></div>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${courseId ? del('courseDel', courseId) : ''}`;
}
A.courseEdit = id => { courseId = id || null; openSheet(courseSheet); };
F.courseSave = () => { const focus = document.getElementById('crFocus').checked; const data = { name: val('crName').trim(), focus, weeklyHours: focus ? (num('crHours') || 0) : 0 }; if (!data.name) return; const c = S.school.courses.find(x => x.id === courseId); if (c) Object.assign(c, data); else S.school.courses.push({ id: uid(), ...data }); save('school'); closeSheet(); };
A.courseDel = id => { S.school.courses = S.school.courses.filter(x => x.id !== id); save('school'); closeSheet(); };

/* ---------------- english ---------------- */
export const EN_WEEKS = [
  { t: 'To be ve Present Simple', v: 'Günlük rutin, saatler, sıklık zarfları (always, usually, never)', g: 'am/is/are · I work / she works · do/does soruları' },
  { t: 'Present Continuous', v: 'Ev, aile, şu an yaptıkların', g: 'I am working · Present Simple ile farkı' },
  { t: 'Past Simple (düzenli fiiller, was/were)', v: 'Geçen hafta sonu, okul anıları', g: 'was/were · -ed · did/didn\'t' },
  { t: 'Past Simple (düzensiz fiiller)', v: 'Yemek, alışveriş, en sık 40 düzensiz fiil', g: 'went, ate, bought, saw… · soru ve olumsuz' },
  { t: 'Gelecek: going to ve will', v: 'Planlar, tahminler, kararlar', g: 'I\'m going to · I\'ll · Present Continuous ile plan' },
  { t: 'Karşılaştırma', v: 'Şehirler, seyahat, ürünler', g: 'bigger / more expensive / the best · as … as' },
  { t: 'Modal fiiller (final dönemi, hafif tempo)', v: 'Kurallar, tavsiyeler, izinler', g: 'can, could, should, must, have to' },
  { t: 'Present Perfect girişi + genel tekrar (hafif)', v: 'Deneyimler, hayatındaki değişiklikler', g: 'have/has + V3 · ever, never, just, already' }
];
const EN_DAY = { // dow -> tasks
  1: [['kurs', 'Udemy: 1-2 ders (20 dk)'], ['kelime', '5 yeni kelime kartı ekle'], ['tekrar', 'Kart tekrarı (5 dk)'], ['gramer', 'Haftanın gramer konusundan 10 alıştırma']],
  2: [['kurs', 'Udemy: 1-2 ders (20 dk)'], ['kelime', '5 yeni kelime kartı ekle'], ['tekrar', 'Kart tekrarı (5 dk)'], ['dinle', '10 dk dinleme (podcast / YouTube, İngilizce altyazı)']],
  3: [['tekrar', 'Kart tekrarı (5 dk)'], ['dinle', '10 dk dinleme (okul günü, kısa tut)']],
  4: [['kurs', 'Udemy: 1-2 ders (20 dk)'], ['kelime', '5 yeni kelime kartı ekle'], ['tekrar', 'Kart tekrarı (5 dk)'], ['yaz', 'Haftanın konusuyla 5 cümle yaz']],
  5: [['kurs', 'Udemy: 1-2 ders (20 dk)'], ['tekrar', 'Kart tekrarı (5 dk)'], ['konus', 'Kendini 2 dk sesli kaydet: gününü anlat']],
  6: [['tekrar', 'Haftalık büyük kart tekrarı (15 dk)'], ['test', 'Mini test: haftanın kelimelerini Türkçeden İngilizceye çevir'], ['yaz', 'Bu hafta öğrendiklerinle kısa bir paragraf']],
  0: [['dizi', 'Serbest: İngilizce altyazılı bir bölüm dizi/film (isteğe bağlı)']]
};
const BOX_DAYS = [0, 1, 2, 4, 8, 16]; // Leitner: box -> days until next review
export const enWeekIndex = k => Math.floor(diffDays(S.english.startWeek, mondayKey(k)) / 7);
let enSub = 'bugun';
function english() {
  const k = today(), wi = enWeekIndex(k), w = EN_WEEKS[Math.max(0, Math.min(EN_WEEKS.length - 1, wi))];
  const tasks = EN_DAY[dowOf(k)], log = S.english.log[k] || {};
  const c = S.english.course;
  const due = S.english.cards.filter(x => x.due <= k);
  const days = lastNDays(k, 14);
  return `
  ${seg([['bugun', 'Bugün'], ['kartlar', `Kartlar${due.length ? ' · ' + due.length : ''}`], ['program', 'Program']], enSub, 'enSub')}
  ${enSub === 'bugun' ? `
  <div class="card stack-xs"><p class="eyebrow">${wi >= 0 && wi < 8 ? `Hafta ${wi + 1}/8` : wi >= 8 ? 'A2 programı bitti, B1\'e hazırsın' : 'Program başlamadı'}</p><h3>${esc(w.t)}</h3><p class="small">Kelime teması: ${esc(w.v)}</p><p class="small muted">${esc(w.g)}</p></div>
  <section class="stack-s">${head('Bugünün görevleri', `<span class="meta">${englishStreak()} gün seri</span>`)}
    <div class="list">${tasks.map(([id, l]) => `<div class="row ${log[id] ? 'done' : ''}">${check(!!log[id], 'enTask', id, k, l, true)}<span class="grow t">${esc(l)}</span>${id === 'kelime' ? `<button class="linkbtn" data-a="cardNew">Ekle</button>` : id === 'tekrar' || id === 'test' ? `<button class="linkbtn" data-a="enSub" data-id="kartlar">Aç</button>` : ''}</div>`).join('')}</div></section>
  <div class="card stack-s"><div class="sec-h"><h3>${esc(c.name || 'Udemy kursu')}</h3><button class="linkbtn" data-a="courseEnEdit">Düzenle</button></div>
    ${c.total ? `${bar(c.done / c.total * 100)}<div class="sec-h"><span class="small muted tnum">${c.done}/${c.total} ders · %${Math.round(c.done / c.total * 100)}</span><div class="row-actions"><button class="iconbtn sm" data-a="enLesson" data-id="-1" aria-label="Bir ders geri">−</button><button class="iconbtn sm acc" data-a="enLesson" data-id="1" aria-label="Bir ders bitirdim">${I.plus}</button></div></div>` : `<p class="small muted">Kursu seçince adını ve toplam ders sayısını gir; her bitirdiğin dersi + ile işaretlersin.</p>`}
    ${c.url ? `<a class="linkbtn" href="${esc(c.url)}" target="_blank" rel="noopener">Kursu aç ${ic('link', 'xs')}</a>` : ''}</div>
  <section class="stack-s">${head('Son 14 gün')}<div class="strip">${days.map(x => `<span class="cell" style="--l:${englishDone(x) ? Math.min(1, Object.keys(S.english.log[x]).length / 3) : 0}"><i></i><b>${DOW[dowOf(x)]}</b></span>`).join('')}</div></section>`
  : enSub === 'kartlar' ? cards(due) : program(wi)}`;
}
A.enSub = s => { enSub = s; flip = false; cardIdx = 0; };
A.enTask = (id, k) => { const l = S.english.log[k] = S.english.log[k] || {}; if (l[id]) delete l[id]; else l[id] = 1; save('english'); };
A.enLesson = d => { const c = S.english.course; c.done = Math.max(0, Math.min(c.total || 999, (c.done || 0) + Number(d))); if (Number(d) > 0) { const l = S.english.log[today()] = S.english.log[today()] || {}; l.kurs = 1; } save('english'); };
function courseEnSheet() {
  const c = S.english.course;
  return `${sheetHead('Kursum')}<form data-form="courseEnSave" class="stack">
    <div class="field"><label for="ceName">Kurs adı</label><input class="inp" id="ceName" value="${esc(c.name)}" placeholder="ör. English Grammar A2 (Udemy)"></div>
    <div class="field"><label for="ceUrl">Link</label><input class="inp" id="ceUrl" type="url" value="${esc(c.url || '')}" placeholder="https://www.udemy.com/…"></div>
    <div class="inline"><div class="field grow"><label for="ceTotal">Toplam ders</label><input class="inp" id="ceTotal" type="number" min="0" value="${c.total || ''}"></div><div class="field grow"><label for="ceDone">Bitirdiğim</label><input class="inp" id="ceDone" type="number" min="0" value="${c.done || 0}"></div></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.courseEnEdit = () => openSheet(courseEnSheet);
F.courseEnSave = () => { Object.assign(S.english.course, { name: val('ceName').trim(), url: val('ceUrl').trim(), total: num('ceTotal') || 0, done: num('ceDone') || 0 }); save('english'); closeSheet(); };

let flip = false, cardIdx = 0, cardQ = '';
function cards(due) {
  const all = S.english.cards;
  const c = due[cardIdx % Math.max(1, due.length)];
  const boxes = [1, 2, 3, 4, 5].map(b => all.filter(x => x.box === b).length);
  const q = cardQ.toLocaleLowerCase('tr');
  return `
  ${due.length ? `<div class="flash ${flip ? 'flipped' : ''}" data-a="flip">
      <span class="eyebrow">${due.length} kart tekrar bekliyor · kutu ${c.box}</span>
      <b class="fw">${esc(c.en)}</b>
      ${flip ? `<span class="ft">${esc(c.tr)}</span>${c.ex ? `<span class="fx">${esc(c.ex)}</span>` : ''}` : `<span class="small muted">Anlamını düşün, sonra dokun</span>`}
    </div>
    ${flip ? `<div class="inline"><button class="btn ghost grow" data-a="cardAns" data-id="0">Bilemedim</button><button class="btn grow" data-a="cardAns" data-id="1">Bildim</button></div>` : ''}`
    : `<div class="card"><p>${all.length ? 'Bugünlük tekrar bitti. Harika!' : 'Henüz kartın yok. Kurstan ya da dizilerden öğrendiğin kelimeleri ekle.'}</p></div>`}
  <button class="btn ghost block" data-a="cardNew">+ Kelime kartı ekle</button>
  <div class="statrow">${boxes.map((n, i) => `<div class="stat"><b class="tnum">${n}</b><span>kutu ${i + 1}</span></div>`).join('')}</div>
  <p class="small muted">Bildiğin kart bir sonraki kutuya geçer ve daha seyrek gelir (1, 2, 4, 8, 16 gün). Bilemediğin kart 1. kutuya döner. Unutmak üzereyken tekrar etmek en kalıcı yöntem.</p>
  <section class="stack-s">${head('Kelime defterim', `<span class="meta">${all.length} kelime</span>`)}
    <input class="inp" id="cq" placeholder="Ara" value="${esc(cardQ)}" data-input="cardQ" autocomplete="off">
    <div class="list">${all.filter(x => !q || x.en.toLocaleLowerCase('tr').includes(q) || x.tr.toLocaleLowerCase('tr').includes(q)).slice().reverse().slice(0, 60).map(x => `<div class="row"><div class="grow"><div class="t"><b>${esc(x.en)}</b> · ${esc(x.tr)}</div>${x.ex ? `<div class="small muted">${esc(x.ex)}</div>` : ''}</div><button class="iconbtn" data-a="cardDel" data-id="${x.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Boş.')}</div></section>`;
}
A.flip = () => { flip = !flip; };
A.cardAns = ok => {
  const k = today(); const due = S.english.cards.filter(x => x.due <= k); const c = due[cardIdx % due.length]; if (!c) return;
  c.box = ok === '1' ? Math.min(5, c.box + 1) : 1; c.due = addDaysKey(k, BOX_DAYS[c.box]);
  const l = S.english.log[k] = S.english.log[k] || {}; l.tekrar = 1;
  flip = false; save('english');
};
A.cardQ = v => { cardQ = v; };
A.cardDel = id => { S.english.cards = S.english.cards.filter(x => x.id !== id); save('english'); };
function cardSheet() {
  return `${sheetHead('Yeni kelime kartı')}<form data-form="cardSave" class="stack">
    <div class="field"><label for="cdEn">İngilizce</label><input class="inp" id="cdEn" required autocomplete="off" autocapitalize="none" placeholder="ör. to get used to"></div>
    <div class="field"><label for="cdTr">Türkçe anlamı</label><input class="inp" id="cdTr" required autocomplete="off" placeholder="ör. alışmak"></div>
    <div class="field"><label for="cdEx">Örnek cümle (isteğe bağlı)</label><input class="inp" id="cdEx" autocomplete="off" placeholder="I'm getting used to waking up early."></div>
    <button class="btn block" type="submit">Kaydet ve yenisini ekle</button></form>
    <p class="small muted">Bugün eklediğin: ${S.english.cards.filter(x => x.added === today()).length}</p>`;
}
A.cardNew = () => openSheet(cardSheet);
F.cardSave = () => {
  const en = val('cdEn').trim(), tr = val('cdTr').trim(); if (!en || !tr) return;
  const k = today(); S.english.cards.push({ id: uid(), en, tr, ex: val('cdEx').trim(), box: 1, due: k, added: k });
  if (S.english.cards.filter(x => x.added === k).length >= 5) { const l = S.english.log[k] = S.english.log[k] || {}; l.kelime = 1; }
  save('english'); ['cdEn', 'cdTr', 'cdEx'].forEach(id => { const el = document.getElementById(id); el.value = ''; el.dataset.fresh = '1'; });
  renderSheet(); document.getElementById('cdEn').focus(); toast('Kart eklendi');
};
function program(wi) {
  const start = S.english.startWeek;
  return `<p class="small muted">A2'yi 8 haftada sağlamlaştırma planı. Kursundaki ilgili bölümleri haftanın konusuna göre seç. Son iki hafta finallere denk geliyor, o yüzden hafif.</p>
  <div class="list">${EN_WEEKS.map((w, i) => `<div class="row ${i < wi ? 'done' : ''} ${i === wi ? 'cur' : ''}"><span class="dayb ${i === wi ? 'on' : ''}">${i + 1}</span><div class="grow"><div class="t">${esc(w.t)}</div><div class="small muted">${esc(fmtShort(addDaysKey(start, i * 7)))} · ${esc(w.v)}</div><div class="small muted">${esc(w.g)}</div></div></div>`).join('')}</div>
  <div class="card stack-xs"><span class="lbl">Haftanın ritmi</span>${[1, 2, 3, 4, 5, 6, 0].map(d => `<p class="small"><b>${DOW[d]}:</b> ${EN_DAY[d].map(x => x[1]).join(' · ')}</p>`).join('')}</div>
  <p class="small muted">8 hafta bitince aynı yapıyla B1 programına geçeriz.</p>`;
}

/* ---------------- income lab ---------------- */
const STATUS = [['fikir', 'Fikir'], ['arastir', 'Araştırıyorum'], ['deniyorum', 'Deniyorum'], ['gelir', 'Gelir getiriyor'], ['birak', 'Bıraktım']];
function income() {
  const k = today(), mon = mondayKey(k), month = k.slice(0, 7);
  const w = S.income.work;
  const monthEarn = w.filter(x => x.date.slice(0, 7) === month).reduce((a, x) => a + (+x.earn || 0), 0);
  const weekMin = w.filter(x => x.date >= mon).reduce((a, x) => a + (+x.min || 0), 0);
  const total = w.reduce((a, x) => a + (+x.earn || 0), 0);
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1 - (5 - i), 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; });
  const cur = S.income.currency || 'USD';
  return `
  <div class="statrow"><div class="stat"><b class="tnum">${monthEarn.toFixed(0)}</b><span>${cur} bu ay</span></div><div class="stat"><b class="tnum">${minsLabel(weekMin)}</b><span>bu hafta</span></div><div class="stat"><b class="tnum">${total.toFixed(0)}</b><span>${cur} toplam</span></div></div>
  <section class="stack-s">${head('Çalışma kaydı', `<button class="btn sm" data-a="workAdd">+ Kayıt</button>`)}
    ${w.length ? `<div class="card">${barChart(months.map(m => Math.round(w.filter(x => x.date.slice(0, 7) === m).reduce((a, x) => a + (+x.earn || 0), 0))), { labels: months.map(m => m.slice(5) + '/' + m.slice(2, 4)), unit: ' ' + cur })}</div>` : ''}
    <div class="list">${w.slice(-6).reverse().map(x => `<div class="row"><div class="grow"><div class="t">${esc(x.what || 'CrowdGen')}</div><div class="small muted">${esc(fmtShort(x.date))} · ${minsLabel(x.min || 0)}</div></div><span class="tnum">${x.earn ? (+x.earn).toFixed(2) + ' ' + cur : ''}</span><button class="iconbtn" data-a="workDel" data-id="${x.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('CrowdGen ya da başka bir işte çalıştığında süreyi ve kazancı buraya yaz.')}</div></section>

  <section class="stack-s">${head('Bakılacaklar', `<button class="linkbtn" data-a="quick" data-id="bak">+ Ekle</button>`)}
    <div class="list">${S.income.inbox.filter(i => !i.done).slice().reverse().map(i => `<div class="row">${check(false, 'inboxDone', i.id, null, i.text, true)}<div class="grow"><div class="t">${esc(i.text)}</div>${i.link ? `<a class="small linkbtn" href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.link.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : ''}</div><button class="iconbtn" data-a="inboxDel" data-id="${i.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('"GitHub\'da bir repo buldum, Claude\'da denemeliyim" gibi şeyleri buraya at.')}</div></section>

  <section class="stack-s">${head('Fikirlerim', `<button class="btn sm" data-a="ideaEdit" data-id="">+ Fikir</button>`)}
    ${STATUS.map(([s, l]) => { const xs = S.income.ideas.filter(i => i.status === s); return xs.length ? `<span class="lbl">${l}</span><div class="list">${xs.map(i => { const open = i.tasks.filter(t => !t.done).length; return `<button class="row pick" data-a="ideaView" data-id="${i.id}"><span class="grow"><span class="t">${esc(i.title)}</span><br><span class="small muted">${open ? `${open} açık adım` : 'Açık adım yok'}${i.links.length ? ` · ${i.links.length} link` : ''}</span></span>${I.chev}</button>`; }).join('')}</div>` : ''; }).join('')}
  </section>`;
}
function workSheet() {
  return `${sheetHead('Çalışma kaydı')}<form data-form="workSave" class="stack">
    <div class="field"><label for="wkWhat">Ne üzerinde?</label><input class="inp" id="wkWhat" value="CrowdGen" list="workList"><datalist id="workList">${[...new Set(S.income.work.map(x => x.what))].map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div class="inline"><div class="field grow"><label for="wkDur">Süre (dk)</label><input class="inp" id="wkDur" type="number" inputmode="numeric"></div><div class="field grow"><label for="wkEarn">Kazanç (${S.income.currency})</label><input class="inp" id="wkEarn" type="number" step="0.01" inputmode="decimal"></div></div>
    <div class="field"><label for="wkDate">Tarih</label><input class="inp" id="wkDate" type="date" value="${today()}"></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.workAdd = () => openSheet(workSheet);
F.workSave = () => { const min = num('wkDur') || 0, earn = num('wkEarn') || 0; if (!min && !earn) return; S.income.work.push({ id: uid(), what: val('wkWhat').trim() || 'CrowdGen', min, earn, date: val('wkDate') || today() }); save('income'); closeSheet(); toast('Kaydedildi'); };
A.workDel = id => { S.income.work = S.income.work.filter(x => x.id !== id); save('income'); };
A.inboxDone = id => { const i = S.income.inbox.find(x => x.id === id); i.done = true; save('income'); toast('Bakıldı', () => { i.done = false; save('income'); }); };
A.inboxDel = id => { S.income.inbox = S.income.inbox.filter(x => x.id !== id); save('income'); };

let ideaId = null, ideaEditing = false;
function ideaSheet() {
  const i = S.income.ideas.find(x => x.id === ideaId);
  if (i && !ideaEditing) return `${sheetHead(esc(i.title), STATUS.find(s => s[0] === i.status)[1])}
    <div class="chips wrap">${STATUS.map(([s, l]) => `<button class="fchip ${i.status === s ? 'on' : ''}" data-a="ideaStatus" data-id="${s}">${l}</button>`).join('')}</div>
    <form data-form="ideaNotes" class="stack-xs"><label class="lbl" for="idNotes">Notlar, örnekler, araştırdıklarım</label><textarea class="inp" id="idNotes" rows="5">${esc(i.notes || '')}</textarea><button class="btn ghost" type="submit">Notları kaydet</button></form>
    <span class="lbl">Adımlar</span>
    <div class="list">${i.tasks.map(t => `<div class="row ${t.done ? 'done' : ''}">${check(t.done, 'ideaTask', t.id, null, t.text, true)}<span class="grow t">${esc(t.text)}</span><button class="iconbtn" data-a="ideaTaskDel" data-id="${t.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Henüz adım yok.')}</div>
    <form class="inline" data-form="ideaTaskAdd"><input class="inp" id="itText" placeholder="Yeni adım" autocomplete="off"><button class="btn" type="submit">Ekle</button></form>
    <span class="lbl">Linkler ve örnekler</span>
    <div class="list">${i.links.map((l, n) => `<div class="row"><a class="grow t linkbtn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title || l.url)}</a><button class="iconbtn" data-a="ideaLinkDel" data-id="${n}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Henüz link yok.')}</div>
    <form class="stack-xs" data-form="ideaLinkAdd"><input class="inp" id="ilUrl" type="url" inputmode="url" placeholder="https://"><div class="inline"><input class="inp" id="ilTitle" placeholder="Açıklama (isteğe bağlı)"><button class="btn" type="submit">Ekle</button></div></form>
    <div class="inline"><button class="btn ghost grow" data-a="ideaEdit" data-id="${i.id}">Adı değiştir</button>${del('ideaDel', i.id)}</div>`;
  return `${sheetHead(i ? 'Fikri düzenle' : 'Yeni fikir')}<form data-form="ideaSave" class="stack">
    <div class="field"><label for="idTitle">Fikir</label><input class="inp" id="idTitle" required value="${esc(i ? i.title : '')}" placeholder="ör. Canva'da düğün davetiyesi şablonu satmak"></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.ideaView = id => { ideaId = id; ideaEditing = false; openSheet(ideaSheet); };
A.ideaEdit = id => { ideaId = id || null; ideaEditing = true; if (document.getElementById('sheetBody')) renderSheet(); else openSheet(ideaSheet); };
const idea = () => S.income.ideas.find(x => x.id === ideaId);
F.ideaSave = () => { const t = val('idTitle').trim(); if (!t) return; const i = idea(); if (i) i.title = t; else { ideaId = uid(); S.income.ideas.push({ id: ideaId, title: t, status: 'fikir', notes: '', links: [], tasks: [], created: Date.now() }); } ideaEditing = false; save('income'); renderSheet(); };
A.ideaStatus = s => { idea().status = s; save('income'); renderSheet(); };
F.ideaNotes = () => { idea().notes = val('idNotes'); save('income'); toast('Kaydedildi'); };
A.ideaTask = id => { const t = idea().tasks.find(x => x.id === id); t.done = !t.done; save('income'); renderSheet(); };
A.ideaTaskDel = id => { idea().tasks = idea().tasks.filter(x => x.id !== id); save('income'); renderSheet(); };
F.ideaTaskAdd = () => { const v = val('itText').trim(); if (!v) return; idea().tasks.push({ id: uid(), text: v, done: false }); save('income'); const el = document.getElementById('itText'); el.dataset.fresh = '1'; renderSheet(); };
F.ideaLinkAdd = () => { const u = val('ilUrl').trim(); if (!u) return; idea().links.push({ url: /^https?:\/\//.test(u) ? u : 'https://' + u, title: val('ilTitle').trim() }); save('income'); ['ilUrl', 'ilTitle'].forEach(x => { document.getElementById(x).dataset.fresh = '1'; }); renderSheet(); };
A.ideaLinkDel = n => { idea().links.splice(Number(n), 1); save('income'); renderSheet(); };
A.ideaDel = id => { S.income.ideas = S.income.ideas.filter(x => x.id !== id); save('income'); closeSheet(); };
