import { S, save, today } from '../store.js';
import { medsFor, medTaken, careFor, careDone, careDue, lastDone, isHard, addDaysKey, dowOf, diffDays, hmToMin } from '../schedule.js';
import { A, F, esc, uid, I, ic, check, empty, head, seg, fmtShort, fmtDay, fmtLong, DOW, WEEK_ORDER, openSheet, sheetHead, closeSheet, renderSheet, toast, val, del, lineChart, barChart, lastNDays, strip, nowHm } from '../ui.js';
import { medDay, medAdherence, medStreak, careDay, sleepHours, moodOn, avg, sessionsOn } from '../calc.js';
import { moodFace, pruneLog } from './today.js';

let sub = 'ilac';
export const setBenSub = s => { if (['ilac', 'bakim', 'ruh', 'uyku', 'doktor'].includes(s)) sub = s; };
export function benView() {
  return `<div><p class="eyebrow">Kendine özen</p><h1>Ben</h1></div>
  ${seg([['ilac', 'İlaç'], ['bakim', 'Bakım'], ['ruh', 'Ruh hali'], ['uyku', 'Uyku'], ['doktor', 'Doktor']], sub, 'benSub')}
  ${({ ilac: meds, bakim: care, ruh: mood, uyku: sleep, doktor: doctor })[sub]()}`;
}
A.benSub = s => { sub = s; history.replaceState(null, '', '#ben/' + s); };

/* ---------------- medications ---------------- */
function meds() {
  const k = today(), list = medsFor(S, k), d = medDay(k);
  const days = lastNDays(k, 28);
  const adh = medAdherence(30), streak = medStreak();
  return `
  <div class="list">${list.map(x => { const on = medTaken(S, k, x.slot); return `<div class="row ${on ? 'done' : ''}">${check(on, 'medTake', x.slot, k, x.med.name)}<div class="grow"><div class="t">${esc(x.med.name)}</div><div class="small muted">${x.time}${x.med.withMeal ? ' · yemekle' : ''}${x.med.note ? ' · ' + esc(x.med.note) : ''}</div></div>${on ? `<span class="small muted tnum">${esc(S.meds.log[k][x.slot].at || '')}</span>` : ''}</div>`; }).join('') || empty('Bugün ilaç yok.')}</div>
  <div class="statrow"><div class="stat"><b class="tnum">${d.taken}/${d.total}</b><span>bugün</span></div><div class="stat"><b class="tnum">${streak}</b><span>gün üst üste</span></div><div class="stat"><b class="tnum">${adh == null ? '–' : '%' + adh}</b><span>son 30 gün</span></div></div>
  <section class="stack-s">${head('Son 4 hafta')}
    <div class="card">${strip(days.map(x => { const m = medDay(x); return { label: DOW[dowOf(x)], level: x < (S.settings.createdAt || '') ? 0 : m.pct, title: `${fmtShort(x)}: ${m.taken}/${m.total}` }; }))}</div>
    <p class="small muted">Her ilaç saatinde bildirim gelir. "Aldım" işaretlemezsen 30 dakika ve 1,5 saat sonra tekrar hatırlatırım. İlk haftalarda iPhone'un Sağlık uygulamasındaki İlaçlar bölümünü de yedek olarak kurmanı öneririm.</p>
  </section>
  <section class="stack-s">${head('İlaçlarım', `<button class="btn sm" data-a="medEdit" data-id="">+ İlaç</button>`)}
    <div class="list">${S.meds.list.map(m => `<button class="row pick" data-a="medEdit" data-id="${m.id}"><span class="grow"><span class="t">${esc(m.name)}</span>${m.paused ? ' <span class="chip">durduruldu</span>' : ''}<br><span class="small muted">${esc(m.times.join(', '))} · ${m.days && m.days.length ? m.days.map(x => DOW[x]).join(' ') : 'her gün'}${m.withMeal ? ' · yemekle' : ''}</span></span>${I.chev}</button>`).join('')}</div>
  </section>`;
}
let medId = null, medDays = null;
function medSheet() {
  const m = S.meds.list.find(x => x.id === medId) || { name: '', times: ['09:00'], days: null, withMeal: false, note: '', paused: false };
  if (medDays === null) medDays = m.days && m.days.length ? [...m.days] : [0, 1, 2, 3, 4, 5, 6];
  return `${sheetHead(medId ? 'İlacı düzenle' : 'Yeni ilaç')}
  <form data-form="medSave" class="stack">
    <div class="field"><label for="mdName">İlaç</label><input class="inp" id="mdName" required value="${esc(m.name)}"></div>
    <div class="field"><label for="mdTimes">Saat(ler) — birden fazlaysa virgülle: 09:00, 21:00</label><input class="inp" id="mdTimes" required value="${esc(m.times.join(', '))}" inputmode="numeric"></div>
    <div class="field"><span class="lbl">Günler</span><div class="days">${WEEK_ORDER.map(d => `<button type="button" class="${medDays.includes(d) ? 'on' : ''}" data-a="mdDay" data-id="${d}">${DOW[d]}</button>`).join('')}</div></div>
    <label class="toggle"><input type="checkbox" id="mdMeal" ${m.withMeal ? 'checked' : ''}><span>Yemekle birlikte alınır</span></label>
    <div class="field"><label for="mdNote">Not</label><input class="inp" id="mdNote" value="${esc(m.note || '')}" placeholder="ör. Aç karnına, 1 tablet"></div>
    ${medId ? `<label class="toggle"><input type="checkbox" id="mdPaused" ${m.paused ? 'checked' : ''}><span>Şimdilik kullanmıyorum (bildirim gelmesin)</span></label>` : ''}
    <button class="btn block" type="submit">Kaydet</button></form>
  ${medId ? del('medDel', medId) : ''}`;
}
A.medEdit = id => { medId = id || null; medDays = null; openSheet(medSheet); };
A.mdDay = d => { d = Number(d); medDays = medDays.includes(d) ? medDays.filter(x => x !== d) : medDays.concat(d); renderSheet(); };
F.medSave = () => {
  const times = val('mdTimes').split(/[,\s]+/).map(t => t.trim()).filter(t => /^\d{1,2}[:.]\d{2}$/.test(t)).map(t => { const [h, m] = t.replace('.', ':').split(':'); return `${h.padStart(2, '0')}:${m}`; });
  if (!val('mdName').trim() || !times.length) { toast('İlaç adı ve en az bir saat (ör. 09:00) gerekli.'); return; }
  if (!medDays.length) { toast('En az bir gün seç.'); return; }
  const data = { name: val('mdName').trim(), times, days: medDays.length === 7 ? null : medDays.sort(), withMeal: document.getElementById('mdMeal').checked, note: val('mdNote').trim() };
  const pz = document.getElementById('mdPaused'); if (pz) data.paused = pz.checked;
  const m = S.meds.list.find(x => x.id === medId);
  if (m) Object.assign(m, data); else S.meds.list.push({ id: uid(), ...data });
  save('meds'); closeSheet(); toast('Kaydedildi; bildirimler bu saatlere göre gelecek.');
};
A.medDel = id => { S.meds.list = S.meds.list.filter(x => x.id !== id); save('meds'); closeSheet(); };

/* ---------------- care ---------------- */
const AREAS = { yuz: 'Yüz', sac: 'Saç', vucut: 'Vücut', agiz: 'Ağız & diş', genel: 'Genel' };
const WHEN = [['sabah', 'Sabah'], ['gun', 'Gün içinde'], ['aksam', 'Akşam']];
const freqTxt = f => !f || f.type === 'daily' ? 'her gün' : f.type === 'every' ? `${f.n} günde bir` : (f.days || []).map(d => DOW[d]).join(' ');
function care() {
  const k = today(), hard = isHard(S, k);
  const days = lastNDays(k, 14);
  return `
  <div class="card stack-xs"><div class="sec-h"><h3>${hard ? 'Zor gün modu açık' : 'Zor bir gün mü?'}</h3><button class="btn sm ${hard ? '' : 'ghost'}" data-a="toggleHard">${hard ? 'Kapat' : 'Aç'}</button></div>
    <p class="small muted">Açınca sadece temel adımlar (⭐) görünür. Dişler, yüz, ilaçlar. Hepsi bu. Yapamadığın günler başarısızlık değil.</p></div>
  ${WHEN.map(([w, l]) => { const items = careFor(S, k, w); const done = items.filter(i => careDone(S, k, i.id)).length;
    return `<section class="stack-s">${head(l, `<span class="meta tnum">${done}/${items.length}</span>`)}
    <div class="list">${items.map(i => { const on = careDone(S, k, i.id); const last = i.freq && i.freq.type === 'every' ? lastDone(S, i.id, addDaysKey(k, 1)) : null;
      return `<div class="row ${on ? 'done' : ''}">${check(on, 'careToggle', i.id, k, i.text, true)}<button class="grow pickt" data-a="careEdit" data-id="${i.id}"><span class="t">${i.essential ? '⭐ ' : ''}${esc(i.text)}</span><span class="small muted">${esc(AREAS[i.area] || '')} · ${freqTxt(i.freq)}${i.product ? ' · ' + esc(i.product) : ''}${last && !on ? ` · son: ${diffDays(last, k)} gün önce` : ''}</span></button></div>`; }).join('') || empty('Bugün bu bölümde adım yok.')}</div></section>`; }).join('')}
  <button class="btn ghost block" data-a="careEdit" data-id="">+ Bakım adımı ekle</button>
  <section class="stack-s">${head('Son 2 hafta')}
    <div class="card">${strip(days.map(x => { const c = careDay(x); return { label: DOW[dowOf(x)], level: c.pct, title: `${fmtShort(x)}: ${c.done}/${c.total}` }; }))}</div>
    <p class="small muted">Kremlerinin adını adımın içine yazabilirsin. Sabah 09:15, akşam 18:30 ve gece 23:45'te bitmemiş adımlar için nazik bir hatırlatma gelir (Ayarlar'dan değişir).</p></section>`;
}
let careId = null, cForm = null;
function careSheet() {
  const c = cForm;
  return `${sheetHead(careId ? 'Bakım adımı' : 'Yeni bakım adımı')}
  <form data-form="careSave" class="stack">
    <div class="field"><label for="cText">Adım</label><input class="inp" id="cText" required value="${esc(c.text)}" placeholder="ör. C vitamini serumu"></div>
    <div class="field"><label for="cProd">Kullandığın ürün (isteğe bağlı)</label><input class="inp" id="cProd" value="${esc(c.product || '')}" placeholder="ör. La Roche-Posay Cicaplast"></div>
    <div class="field"><span class="lbl">Bölge</span><div class="chips wrap">${Object.entries(AREAS).map(([a, l]) => `<button type="button" class="fchip ${c.area === a ? 'on' : ''}" data-a="cArea" data-id="${a}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Ne zaman?</span><div class="seg">${WHEN.map(([w, l]) => `<button type="button" class="${c.when === w ? 'on' : ''}" data-a="cWhen" data-id="${w}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Sıklık</span><div class="seg">${[['daily', 'Her gün'], ['every', 'X günde bir'], ['days', 'Belirli günler']].map(([t, l]) => `<button type="button" class="${c.freq.type === t ? 'on' : ''}" data-a="cFreq" data-id="${t}">${l}</button>`).join('')}</div></div>
    ${c.freq.type === 'every' ? `<div class="field"><label for="cN">Kaç günde bir?</label><input class="inp" id="cN" type="number" min="1" max="60" value="${c.freq.n || 2}"></div>` : ''}
    ${c.freq.type === 'days' ? `<div class="days">${WEEK_ORDER.map(d => `<button type="button" class="${(c.freq.days || []).includes(d) ? 'on' : ''}" data-a="cDay" data-id="${d}">${DOW[d]}</button>`).join('')}</div>` : ''}
    <label class="toggle"><input type="checkbox" id="cEss" ${c.essential ? 'checked' : ''}><span>Temel adım (zor günlerde de görünsün)</span></label>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${careId ? del('careDel', careId) : ''}`;
}
A.careEdit = id => { careId = id || null; const c = S.care.items.find(x => x.id === careId); cForm = c ? JSON.parse(JSON.stringify(c)) : { text: '', area: 'yuz', when: 'aksam', freq: { type: 'daily' }, essential: false, product: '' }; openSheet(careSheet); };
A.cArea = a => { cForm.area = a; renderSheet(); };
A.cWhen = w => { cForm.when = w; renderSheet(); };
A.cFreq = t => { cForm.freq = t === 'every' ? { type: 'every', n: cForm.freq.n || 2 } : t === 'days' ? { type: 'days', days: cForm.freq.days || [1, 4] } : { type: 'daily' }; renderSheet(); };
A.cDay = d => { d = Number(d); const ds = cForm.freq.days || []; cForm.freq.days = ds.includes(d) ? ds.filter(x => x !== d) : ds.concat(d); renderSheet(); };
F.careSave = () => {
  const text = val('cText').trim(); if (!text) return;
  const freq = cForm.freq.type === 'every' ? { type: 'every', n: Math.max(1, Number(val('cN')) || 2) } : cForm.freq;
  const data = { text, product: val('cProd').trim(), area: cForm.area, when: cForm.when, freq, essential: document.getElementById('cEss').checked };
  const c = S.care.items.find(x => x.id === careId);
  if (c) Object.assign(c, data); else S.care.items.push({ id: uid(), ...data });
  save('care'); closeSheet();
};
A.careDel = id => { S.care.items = S.care.items.filter(x => x.id !== id); save('care'); closeSheet(); };

/* ---------------- mood ---------------- */
const TAGS = ['Yorgun', 'Kaygılı', 'Üzgün', 'Gergin', 'Yalnız', 'Sakin', 'Motive', 'Umutlu', 'Mutlu', 'Enerjik'];
const MOODS = [[1, 'Çok zor'], [2, 'Zor'], [3, 'İdare eder'], [4, 'İyi'], [5, 'Çok iyi']];
function mood() {
  const k = today(), m = S.mood.log[k] || {};
  const days = lastNDays(k, 30);
  const pts = days.filter(x => moodOn(x) != null).map(x => ({ x: fmtShort(x), v: moodOn(x) }));
  // simple, honest comparisons (need enough data)
  const withW = [], withoutW = [], goodSleep = [], badSleep = [];
  for (const x of lastNDays(k, 60)) { const mv = moodOn(x); if (mv == null) continue; (sessionsOn(x).length ? withW : withoutW).push(mv); const h = sleepHours(addDaysKey(x, 0)); if (h != null) (h >= 7 ? goodSleep : badSleep).push(mv); }
  const ins = [];
  if (withW.length >= 3 && withoutW.length >= 3) ins.push(`Spor yaptığın günlerde ruh halin ortalama <b>${avg(withW)}</b>, yapmadığın günlerde <b>${avg(withoutW)}</b>.`);
  if (goodSleep.length >= 3 && badSleep.length >= 3) ins.push(`7+ saat uyuduğun günler: <b>${avg(goodSleep)}</b>, daha az uyuduğun günler: <b>${avg(badSleep)}</b>.`);
  return `
  <div class="card stack-s"><h3>Bugün</h3>
    <div class="moods">${MOODS.map(([v, l]) => `<button class="mood ${m.m === v ? 'on' : ''}" data-a="moodSet" data-id="${v}">${moodFace(v)}<span>${l}</span></button>`).join('')}</div>
    <div class="chips wrap">${TAGS.map(t => `<button class="fchip ${(m.tags || []).includes(t) ? 'on' : ''}" data-a="moodTag" data-id="${t}">${t}</button>`).join('')}</div>
    <form data-form="moodNote" class="stack-xs"><textarea class="inp" id="moodNote" rows="2" placeholder="Bugün aklında ne var? (isteğe bağlı, sadece sen görürsün)">${esc(m.note || '')}</textarea><button class="btn ghost" type="submit">Notu kaydet</button></form>
  </div>
  <section class="stack-s">${head('Son 30 gün')}
    <div class="card">${pts.length >= 2 ? lineChart(pts, { yPad: 0.5 }) : '<p class="small muted">Birkaç gün kaydettikten sonra grafiğin burada çıkacak.</p>'}</div>
    ${ins.length ? `<div class="card stack-xs"><span class="lbl">Fark ettiklerim</span>${ins.map(i => `<p class="small">${i}</p>`).join('')}</div>` : `<p class="small muted">Birkaç hafta sonra spor, uyku ve ruh halin arasındaki ilişkiyi burada göstereceğim.</p>`}
  </section>
  <section class="stack-s">${head('Notlarım')}
    <div class="list">${days.slice().reverse().filter(x => S.mood.log[x] && (S.mood.log[x].note || (S.mood.log[x].tags || []).length)).slice(0, 10).map(x => { const e = S.mood.log[x]; return `<div class="row"><span>${moodFace(e.m)}</span><div class="grow"><div class="small muted">${esc(fmtLong(x))}${(e.tags || []).length ? ' · ' + esc(e.tags.join(', ')) : ''}</div>${e.note ? `<div class="t">${esc(e.note)}</div>` : ''}</div></div>`; }).join('') || empty('Henüz not yok.')}</div>
  </section>
  <div class="banner soft"><p>Kendini çok kötü hissettiğin, kendine zarar verme düşüncelerinin olduğu bir an olursa lütfen yalnız kalma: doktorunu ara, güvendiğin birine yaz ya da <b>112</b>'yi ara.</p></div>`;
}
A.moodTag = t => { const k = today(); const e = S.mood.log[k] = S.mood.log[k] || { m: null }; e.tags = (e.tags || []).includes(t) ? e.tags.filter(x => x !== t) : (e.tags || []).concat(t); save('mood'); };
F.moodNote = () => { const k = today(); const e = S.mood.log[k] = S.mood.log[k] || { m: null }; e.note = val('moodNote').trim(); save('mood'); toast('Kaydedildi'); };

/* ---------------- sleep ---------------- */
function sleep() {
  const k = today(), l = S.sleep.log[k] || {};
  const days = lastNDays(k, 14);
  const hrs = days.map(x => sleepHours(x) ?? 0);
  const logged = days.filter(x => sleepHours(x) != null);
  const beds = logged.map(x => { let m = hmToMin(S.sleep.log[x].bed); if (m < 12 * 60) m += 1440; return m; });
  const avgBed = beds.length ? Math.round(beds.reduce((a, b) => a + b, 0) / beds.length) : null;
  const fmtM = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `
  <div class="card stack-s"><h3>Dün gece</h3>
    <form data-form="sleepSave" class="stack-s"><div class="inline"><div class="field grow"><label for="slBed">Yattım</label><input class="inp" id="slBed" type="time" value="${l.bed || S.settings.bed}"></div><div class="field grow"><label for="slWake">Kalktım</label><input class="inp" id="slWake" type="time" value="${l.wake || S.settings.wake}"></div></div>
    <button class="btn" type="submit">${l.bed ? 'Güncelle' : 'Kaydet'}</button></form>
    ${sleepHours(k) != null ? `<p class="small">${sleepHours(k)} saat uyudun.</p>` : ''}
  </div>
  <section class="stack-s">${head('Son 14 gün', `<span class="meta">hedef 8 saat</span>`)}
    <div class="card">${barChart(hrs, { labels: days.map(x => DOW[dowOf(x)]), target: 8, max: 10, unit: ' sa' })}</div>
    <div class="statrow"><div class="stat"><b class="tnum">${avg(logged.map(sleepHours)) ?? '–'}</b><span>ort. saat</span></div><div class="stat"><b class="tnum">${avgBed != null ? fmtM(avgBed) : '–'}</b><span>ort. yatış</span></div><div class="stat"><b class="tnum">${esc(S.settings.bed)}</b><span>hedef yatış</span></div></div>
    <p class="small muted">Düzenli saat, uykunun süresi kadar önemli. Magnezyum bildirimi yatıştan 30 dk önce gelir; o an ekranları bırakmayı dene.</p>
  </section>`;
}
F.sleepSave = () => { const k = today(); S.sleep.log[k] = { bed: val('slBed'), wake: val('slWake') }; pruneLog(S.sleep.log, 400); save('sleep'); toast('Kaydedildi'); };

/* ---------------- doctor ---------------- */
function doctor() {
  const k = today();
  const up = S.doctor.appts.filter(a => a.date >= k).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = S.doctor.appts.filter(a => a.date < k).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return `
  <section class="stack-s">${head('Randevular', `<button class="btn sm" data-a="apptEdit" data-id="">+ Randevu</button>`)}
    <div class="list">${up.map(a => `<button class="row pick" data-a="apptEdit" data-id="${a.id}"><span class="grow"><span class="t">${esc(a.place || 'Randevu')}</span><br><span class="small muted">${esc(fmtLong(a.date))}${a.time ? ' · ' + a.time : ''}</span></span><span class="chip ${diffDays(k, a.date) <= 2 ? 'warn' : ''}">${diffDays(k, a.date) === 0 ? 'Bugün' : diffDays(k, a.date) + ' gün'}</span></button>`).join('') || empty('Yaklaşan randevu yok. Eklersen bir gün önce ve 2 saat önce hatırlatırım.')}</div></section>
  <section class="stack-s">${head('Doktora soracaklarım')}
    <div class="list">${S.doctor.questions.map(q => `<div class="row ${q.done ? 'done' : ''}">${check(q.done, 'qToggle', q.id, null, q.text, true)}<span class="grow t">${esc(q.text)}</span><button class="iconbtn" data-a="qDel" data-id="${q.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Liste boş.')}</div>
    <form class="inline" data-form="qAdd"><input class="inp" id="qText" placeholder="Aklına gelen soruyu ekle" autocomplete="off"><button class="btn" type="submit">Ekle</button></form></section>
  <section class="stack-s">${head('Görüşme notları')}
    <form data-form="dnAdd" class="stack-xs"><textarea class="inp" id="dnText" rows="3" placeholder="Doktor ne dedi? İlaç değişikliği, dozlar, bir sonraki kontrol…"></textarea><button class="btn ghost" type="submit">Notu kaydet</button></form>
    <div class="list">${S.doctor.notes.slice().reverse().map(n => `<div class="row"><div class="grow"><div class="small muted">${esc(fmtLong(n.date))}</div><div class="t pre">${esc(n.text)}</div></div><button class="iconbtn" data-a="dnDel" data-id="${n.id}" aria-label="Sil">${I.trash}</button></div>`).join('')}</div>
    ${past.length ? `<p class="small muted">Geçmiş randevular: ${past.map(a => esc(fmtShort(a.date))).join(', ')}</p>` : ''}
  </section>`;
}
let apptId = null;
function apptSheet() {
  const a = S.doctor.appts.find(x => x.id === apptId) || { date: addDaysKey(today(), 7), time: '', place: '', note: '' };
  return `${sheetHead(apptId ? 'Randevu' : 'Yeni randevu')}
  <form data-form="apptSave" class="stack">
    <div class="field"><label for="apPlace">Kim / nerede</label><input class="inp" id="apPlace" value="${esc(a.place)}" placeholder="ör. Psikiyatri kontrolü"></div>
    <div class="inline"><div class="field grow"><label for="apDate">Tarih</label><input class="inp" id="apDate" type="date" required value="${a.date}"></div><div class="field grow"><label for="apTime">Saat</label><input class="inp" id="apTime" type="time" value="${a.time}"></div></div>
    <div class="field"><label for="apNote">Not</label><input class="inp" id="apNote" value="${esc(a.note || '')}"></div>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${apptId ? del('apptDel', apptId) : ''}`;
}
A.apptEdit = id => { apptId = id || null; openSheet(apptSheet); };
F.apptSave = () => { const data = { place: val('apPlace').trim(), date: val('apDate'), time: val('apTime'), note: val('apNote').trim() }; if (!data.date) return; const a = S.doctor.appts.find(x => x.id === apptId); if (a) Object.assign(a, data); else S.doctor.appts.push({ id: uid(), ...data }); save('doctor'); closeSheet(); };
A.apptDel = id => { S.doctor.appts = S.doctor.appts.filter(x => x.id !== id); save('doctor'); closeSheet(); };
A.qToggle = id => { const q = S.doctor.questions.find(x => x.id === id); q.done = !q.done; save('doctor'); };
A.qDel = id => { S.doctor.questions = S.doctor.questions.filter(x => x.id !== id); save('doctor'); };
F.qAdd = () => { const v = val('qText').trim(); if (!v) return; S.doctor.questions.push({ id: uid(), text: v, done: false }); save('doctor'); document.getElementById('qText').value = ''; };
F.dnAdd = () => { const v = val('dnText').trim(); if (!v) return; S.doctor.notes.push({ id: uid(), date: today(), text: v }); save('doctor'); document.getElementById('dnText').value = ''; toast('Kaydedildi'); };
A.dnDel = id => { S.doctor.notes = S.doctor.notes.filter(x => x.id !== id); save('doctor'); };
