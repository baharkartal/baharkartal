import { S, save, today, sync } from '../store.js';
import { blocksFor, medsFor, medTaken, careFor, careDone, dayMin, isHard, isFinalMode, isoWeek, addDaysKey, mondayKey, diffDays } from '../schedule.js';
import { A, F, esc, uid, I, ic, check, ring, empty, head, fmtLong, nowHm, toast, catDot, openSheet, sheetHead, closeSheet, renderSheet, val } from '../ui.js';
import { foodDay, workoutDaysInWeek, careDay, medDay } from '../calc.js';

const MOODS = [[1, 'Çok zor'], [2, 'Zor'], [3, 'İdare eder'], [4, 'İyi'], [5, 'Çok iyi']];
const MOUTH = { 1: 'M8 16.5Q12 12.5 16 16.5', 2: 'M8.5 16Q12 14 15.5 16', 3: 'M8.5 15.2H15.5', 4: 'M8 14.2Q12 17 16 14.2', 5: 'M7.5 13.5Q12 18.5 16.5 13.5' };
export const moodFace = m => m ? `<svg class="mface" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" style="fill:var(--mood-${m})"/><circle cx="9" cy="10" r="1.2" class="mf"/><circle cx="15" cy="10" r="1.2" class="mf"/><path d="${MOUTH[m]}" class="mm"/></svg>` : '';

export function remInfo(r, k) {
  if (r.kind === 'someday') return { cls: 'acc', txt: 'Yapana kadar her gün', ord: 3 };
  const d = diffDays(k, r.date);
  if (d < 0) return { cls: 'danger', txt: `${-d} gün gecikti`, ord: 0 };
  if (r.kind === 'week') return { cls: 'warn', txt: d === 0 ? 'Bu haftanın son günü' : `Hafta içinde · ${d} gün kaldı`, ord: 1 + d / 100 };
  if (d === 0) return { cls: 'warn', txt: 'Bugün' + (r.time ? ' · ' + r.time : ''), ord: 1 };
  if (d === 1) return { cls: '', txt: 'Yarın' + (r.time ? ' · ' + r.time : ''), ord: 2 };
  return { cls: '', txt: `${d} gün sonra`, ord: 2 + d / 1000 };
}

export function todayView() {
  const k = today(), hm = nowHm(), nowM = dayMin(hm), hard = isHard(S, k);
  const blocks = blocksFor(S, k);
  const cur = blocks.find(b => dayMin(b.start) <= nowM && nowM < dayMin(b.end));
  const next = blocks.find(b => dayMin(b.start) > nowM);
  const meds = medsFor(S, k), md = medDay(k), cd = careDay(k);
  const mood = S.mood.log[k];
  const total = md.total + cd.total + 1, done = md.taken + cd.done + (mood ? 1 : 0);
  const pct = Math.round(done / total * 100);
  const h = new Date().getHours();
  const greet = h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const fd = foodDay(k), t = S.settings.targets, water = S.food.water[k] || 0;
  const wk = workoutDaysInWeek(mondayKey(k));
  const finals = diffDays(k, S.settings.finalsDate || '2027-01-04');
  const rems = S.reminders.items.filter(r => !r.done).map(r => ({ r, i: remInfo(r, k) })).sort((a, b) => a.i.ord - b.i.ord);
  const unutma = S.notes.items.filter(n => n.list === 'unutma' && !n.done);
  const lastWeek = S.review.weeks[isoWeek(addDaysKey(mondayKey(k), -1))];
  const prios = (S.review.weeks[isoWeek(k)] && S.review.weeks[isoWeek(k)].nextPrios) || (lastWeek && lastWeek.nextPrios) || [];
  const careWhen = h >= 17 || h < 5 ? 'aksam' : 'sabah';
  const careList = careFor(S, k, careWhen).concat(careFor(S, k, 'gun'));
  const sched = S.schedule.done || {};

  return `
  <div class="topbar">${syncBadge()}<div class="row-actions">
    ${S.settings.pin ? `<button class="iconbtn" data-a="lockNow" aria-label="Kilitle">${I.lock}</button>` : ''}
    <a class="iconbtn" href="#alanlar/ayarlar" aria-label="Ayarlar">${I.gear}</a></div></div>
  <header class="hello">
    <div class="stack-xs">
      <p class="eyebrow">${esc(fmtLong(k))}</p>
      <h1>${greet}, ${esc(S.settings.name || 'Bahar')}</h1>
      <div class="chips wrap">
        ${finals > 0 ? `<span class="chip ${isFinalMode(S, k) ? 'warn' : ''}">Finallere ${finals} gün</span>` : ''}
        <button class="chip ${hard ? 'hardon' : 'ghostchip'}" data-a="toggleHard">${hard ? 'Zor gün modu açık' : 'Bugün zor bir gün mü?'}</button>
      </div>
    </div>
    ${ring(pct, 84, 8, pct + '%')}
  </header>
  ${hard ? `<div class="banner soft"><p><b>Bugün sadece temel şeyler.</b> İlaçların, dişlerin, yüzün ve biraz su. Gerisi bekleyebilir; serilerin bozulmaz. Kendine nazik ol.</p></div>` : ''}
  ${S.settings.starter ? `<div class="banner"><p>Senin anlattıklarına göre başlangıç planını kurdum: ilaçların, ders programın, haftalık plan, bakım rutinleri ve hedefler. Hepsine dokunup değiştirebilirsin. Bildirimler için <a href="#alanlar/ayarlar">Ayarlar</a>'a bak.</p><button class="iconbtn" data-a="dismissStarter" aria-label="Kapat">${I.x}</button></div>` : ''}

  ${!hard ? `<a class="now card" href="#program">
    <div class="now-l"><span class="eyebrow">Şimdi</span>
      ${cur ? `<b>${catDot(cur.cat)} ${esc(cur.title)}</b><span class="muted small">${cur.start}–${cur.end}</span>` : `<b>Serbest zaman</b><span class="muted small">Planında şu an bir şey yok</span>`}
    </div>
    <div class="now-r">${next ? `<span class="eyebrow">Sıradaki · ${next.start}</span><span class="small">${esc(next.title)}</span>` : `<span class="eyebrow">Sıradaki</span><span class="small muted">Bugünlük bu kadar</span>`}</div>
  </a>` : ''}

  ${unutma.length || prios.length ? `<section class="stack-s">
    ${unutma.length ? `<div class="unutma">${unutma.map(n => `<span class="ut">${ic('pin')}<span>${esc(n.text)}</span><button class="mini" data-a="nToggle" data-id="${n.id}" aria-label="Kaldır">${I.x}</button></span>`).join('')}</div>` : ''}
    ${prios.length ? `<div class="card prio"><span class="eyebrow">Bu haftanın öncelikleri</span><ol>${prios.filter(Boolean).map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}
  </section>` : ''}

  <section class="stack-s">
    ${head('İlaçlar', `<span class="meta tnum">${md.taken}/${md.total}</span>`)}
    <div class="list">${meds.map(x => { const on = medTaken(S, k, x.slot); return `<div class="row ${on ? 'done' : ''}">${check(on, 'medTake', x.slot, k, x.med.name)}<div class="grow"><div class="t">${esc(x.med.name)}</div><div class="small muted">${x.time}${x.med.withMeal ? ' · yemekle' : ''}${x.med.note ? ' · ' + esc(x.med.note) : ''}</div></div>${on ? `<span class="small muted tnum">${esc(S.meds.log[k][x.slot].at || '')}</span>` : ''}</div>`; }).join('') || empty('Bugün ilaç yok.')}</div>
  </section>

  <section class="stack-s">
    ${head('Hatırlatmalar', `<button class="linkbtn" data-a="quick" data-id="rem">+ Ekle</button>`)}
    <div class="list">${rems.length ? rems.map(({ r, i }) => `<div class="row">${check(false, 'remDone', r.id, null, r.text)}<div class="grow"><div class="t">${esc(r.text)}</div><span class="chip ${i.cls}">${esc(i.txt)}</span></div><button class="iconbtn" data-a="remDel" data-id="${r.id}" aria-label="Sil">${I.trash}</button></div>`).join('')
      : empty('Bekleyen hatırlatma yok. "Bu hafta bankaya uğra" gibi bir şey eklersen yapana kadar her gün burada durur ve bildirim gelir.')}</div>
  </section>

  <section class="stack-s">
    ${head(careWhen === 'aksam' ? 'Gece bakımı' : 'Sabah bakımı', `<a class="linkbtn" href="#ben/bakim">Tümü</a>`)}
    <div class="list">${careList.map(i => { const on = careDone(S, k, i.id); return `<div class="row ${on ? 'done' : ''}">${check(on, 'careToggle', i.id, k, i.text, true)}<div class="grow"><div class="t">${esc(i.text)}</div>${i.product ? `<div class="small muted">${esc(i.product)}</div>` : ''}</div></div>`; }).join('') || empty('Şimdilik bakım adımı yok.')}</div>
  </section>

  <section class="tiles3">
    <div class="tile"><span class="eyebrow">Su</span><b class="tnum">${water}<small>/${t.water}</small></b><div class="pm"><button class="iconbtn sm" data-a="water" data-id="-1" aria-label="Bir bardak çıkar">−</button><button class="iconbtn sm acc" data-a="water" data-id="1" aria-label="Bir bardak ekle">${I.plus}</button></div></div>
    <a class="tile" href="#beden"><span class="eyebrow">Kalori</span><b class="tnum">${Math.round(fd.kcal)}<small>/${t.kcal}</small></b><span class="small muted tnum">Protein ${Math.round(fd.p)}/${t.p} g</span></a>
    <a class="tile" href="#beden/spor"><span class="eyebrow">Spor</span><b class="tnum">${wk}<small>/${S.settings.workoutTarget} gün</small></b><span class="small muted">bu hafta</span></a>
  </section>

  ${!hard ? `<section class="stack-s">
    ${head('Bugünün planı', `<a class="linkbtn" href="#program">Düzenle</a>`)}
    <div class="list">${blocks.map(b => { const on = !!(sched[k] && sched[k][b.id]); const past = dayMin(b.end) <= nowM; return `<div class="row ${on ? 'done' : ''} ${past && !on ? 'past' : ''}">${b.cat === 'okul' ? `<span class="check ghost">${catDot('okul')}</span>` : check(on, 'blockDone', b.id, k, b.title, true)}<div class="grow"><div class="t">${esc(b.title)}</div><div class="small muted tnum">${b.start}–${b.end}</div></div>${b.notify ? `<span class="muted" title="Bildirim açık">${ic('bell', 'xs')}</span>` : ''}</div>`; }).join('') || empty('Bugün için plan yok. Program sekmesinden ekleyebilirsin.')}</div>
  </section>` : ''}

  <section class="stack-s">
    ${head('Bugün nasılsın?', mood ? `<a class="linkbtn" href="#ben/ruh">Geçmiş</a>` : '')}
    <div class="moods">${MOODS.map(([m, l]) => `<button class="mood ${mood && mood.m === m ? 'on' : ''}" data-a="moodSet" data-id="${m}">${moodFace(m)}<span>${l}</span></button>`).join('')}</div>
  </section>

  <section class="stack-s">
    ${head('Aklına geleni yaz', `<a class="linkbtn" href="#alanlar/notlar">Notlar</a>`)}
    <form class="inline" data-form="quicknote"><input class="inp" id="qn" placeholder="Bir fikir, bir not…" autocomplete="off"><button class="btn" type="submit">Kaydet</button></form>
  </section>`;
}

export function syncBadge() {
  const m = { ok: ['ok', 'Eşitlendi'], syncing: ['', 'Eşitleniyor'], idle: ['', 'Bağlanıyor'], offline: ['local', 'Çevrimdışı'], error: ['local', 'Eşitlenemedi'], local: ['local', 'Bu cihazda'] }[sync.status] || ['', ''];
  return `<a class="sync ${m[0]}" href="#alanlar/ayarlar" title="${esc(sync.message || '')}"><span class="dot"></span>${m[1]}</a>`;
}

/* actions */
A.dismissStarter = () => { S.settings.starter = false; save('settings'); };
A.toggleHard = () => { const k = today(); if (S.mood.hard[k]) delete S.mood.hard[k]; else S.mood.hard[k] = true; save('mood'); if (S.mood.hard[k]) toast('Zor gün modu açık. Bugün sadece temel şeyler.'); };
A.medTake = (slot, k) => {
  const l = S.meds.log[k] = S.meds.log[k] || {};
  if (l[slot]) delete l[slot]; else l[slot] = { at: nowHm() };
  save('meds');
};
A.careToggle = (id, k) => { const l = S.care.log[k] = S.care.log[k] || {}; if (l[id]) delete l[id]; else l[id] = 1; pruneLog(S.care.log, 400); save('care'); };
A.blockDone = (id, k) => { const d = S.schedule.done = S.schedule.done || {}; const l = d[k] = d[k] || {}; if (l[id]) delete l[id]; else l[id] = 1; pruneLog(d, 120); save('schedule'); };
A.water = d => { const k = today(); S.food.water[k] = Math.max(0, (S.food.water[k] || 0) + Number(d)); save('food'); };
A.moodSet = m => { const k = today(); const cur = S.mood.log[k] || {}; S.mood.log[k] = { ...cur, m: Number(m), at: Date.now() }; save('mood'); toast('Kaydedildi. İstersen Ben → Ruh hali\'nden bir not ekleyebilirsin.'); };
A.remDone = id => { const r = S.reminders.items.find(x => x.id === id); r.done = true; r.doneAt = Date.now(); trimDone(); save('reminders'); toast('Tamamlandı', () => { r.done = false; save('reminders'); }); };
A.remDel = id => { const i = S.reminders.items.findIndex(x => x.id === id); const [r] = S.reminders.items.splice(i, 1); save('reminders'); toast('Hatırlatma silindi', () => { S.reminders.items.splice(i, 0, r); save('reminders'); }); };
A.nToggle = id => { const n = S.notes.items.find(x => x.id === id); n.done = !n.done; save('notes'); };
F.quicknote = () => { const v = val('qn').trim(); if (!v) return; S.notes.items.push({ id: uid(), list: 'not', text: v, created: Date.now(), done: false, pinned: false }); document.getElementById('qn').value = ''; save('notes'); toast('Not kaydedildi'); };

function trimDone() { const d = S.reminders.items.filter(r => r.done).sort((a, b) => b.doneAt - a.doneAt); if (d.length > 80) { const drop = new Set(d.slice(80).map(r => r.id)); S.reminders.items = S.reminders.items.filter(r => !drop.has(r.id)); } }
export function pruneLog(log, days) { const cut = addDaysKey(today(), -days); for (const k in log) if (k < cut) delete log[k]; }

/* quick add (the + button) */
let qType = 'rem', remKind = 'week';
const QT = [['rem', 'Hatırlatma'], ['unutma', 'Unutma'], ['not', 'Not'], ['yap', 'Yapılacak'], ['al', 'Alınacak'], ['bak', 'Bakılacak']];
function quickSheet() {
  const k = today();
  return `${sheetHead('Hızlı ekle')}
  <div class="chips wrap">${QT.map(([t, l]) => `<button class="fchip ${qType === t ? 'on' : ''}" data-a="qType" data-id="${t}">${l}</button>`).join('')}</div>
  <form data-form="quick" class="stack">
    <div class="field"><label for="qText">${{ rem: 'Neyi hatırlatayım?', unutma: 'Her gün en üstte görmek istediğin şey', bak: 'Neye bakacaksın? (repo, video, fikir…)' }[qType] || 'Yaz'}</label>
      ${qType === 'not' ? '<textarea class="inp" id="qText" required placeholder="Aklına gelen…"></textarea>' : `<input class="inp" id="qText" required autocomplete="off" placeholder="${{ rem: 'ör. Bankaya uğra', unutma: 'ör. Perşembe kimlik fotokopisi götür', yap: 'ör. Analog ödevini bitir', al: 'ör. Dambıl seti 2 kg', bak: 'ör. GitHub\'da gördüğüm repo, Claude\'da dene' }[qType]}">`}
    </div>
    ${qType === 'bak' ? `<div class="field"><label for="qLink">Link (isteğe bağlı)</label><input class="inp" id="qLink" type="url" inputmode="url" placeholder="https://"></div>` : ''}
    ${qType === 'rem' ? `<div class="field"><span class="lbl">Ne zaman?</span><div class="radios">
      ${[['week', 'Bu hafta içinde bir gün', 'Pazar\'a kadar her sabah bildirim ve listede'], ['date', 'Belirli bir gün', 'O gün (saat verirsen o saatte) bildirim'], ['someday', 'Tarih yok', 'Yapana kadar her sabah bildirim ve listede']].map(([x, l, d]) => `<button type="button" class="radio ${remKind === x ? 'on' : ''}" data-a="remKind" data-id="${x}"><span class="rd"></span><span><span class="d">${l}</span><span class="small muted">${d}</span></span></button>`).join('')}
    </div></div>
    ${remKind === 'date' ? `<div class="inline"><div class="field grow"><label for="rDate">Tarih</label><input class="inp" id="rDate" type="date" value="${addDaysKey(k, 1)}"></div><div class="field grow"><label for="rTime">Saat</label><input class="inp" id="rTime" type="time"></div></div>` : ''}` : ''}
    <button class="btn block" type="submit">Ekle</button>
  </form>`;
}
A.quick = id => { qType = id || 'rem'; openSheet(quickSheet); setTimeout(() => { const el = document.getElementById('qText'); if (el) el.focus(); }, 280); };
A.qType = id => { qType = id; renderSheet(); };
A.remKind = id => { remKind = id; renderSheet(); };
F.quick = () => {
  const v = val('qText').trim(); if (!v) return;
  const k = today();
  if (qType === 'rem') {
    const r = { id: uid(), text: v, kind: remKind, created: Date.now(), done: false, time: '' };
    if (remKind === 'week') { const dow = new Date().getDay(); r.date = addDaysKey(k, (7 - dow) % 7); }
    if (remKind === 'date') { r.date = val('rDate') || addDaysKey(k, 1); r.time = val('rTime') || ''; }
    S.reminders.items.push(r); save('reminders'); toast('Hatırlatma eklendi');
  } else if (qType === 'bak') {
    S.income.inbox.push({ id: uid(), text: v, link: val('qLink').trim(), done: false, created: Date.now() }); save('income'); toast('Bakılacaklar listesine eklendi');
  } else {
    S.notes.items.push({ id: uid(), list: qType, text: v, created: Date.now(), done: false, pinned: false }); save('notes'); toast(qType === 'unutma' ? 'Bugün sayfasının en üstünde duracak' : 'Eklendi');
  }
  closeSheet();
};
