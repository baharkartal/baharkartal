import { S, save, today } from '../store.js';
import { blocksFor, dayMin, minToHm, hmToMin, addDaysKey, mondayKey, dowOf, isFinalMode, diffDays } from '../schedule.js';
import { A, F, esc, uid, I, ic, empty, head, fmtShort, fmtLong, DOW, DOW_LONG, CATS, catDot, openSheet, sheetHead, closeSheet, renderSheet, toast, val, del, minsLabel } from '../ui.js';

let selDay = null, weekOff = 0;
export function programView() {
  const t = today();
  if (!selDay) selDay = t;
  const mon = addDaysKey(mondayKey(t), weekOff * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(mon, i));
  if (!days.includes(selDay)) selDay = weekOff === 0 ? t : mon;
  const blocks = blocksFor(S, selDay);
  const wake = dayMin(S.settings.wake || '08:30'), bed = dayMin(S.settings.bed || '00:30');
  const items = S.school.items.filter(i => i.date === selDay);

  // timeline with free gaps between wake and bed
  const rows = []; let cursor = wake;
  for (const b of blocks) {
    const s = dayMin(b.start), e = dayMin(b.end);
    if (s - cursor >= 30) rows.push({ gap: true, s: cursor, e: s });
    rows.push({ b }); cursor = Math.max(cursor, e);
  }
  if (bed - cursor >= 30) rows.push({ gap: true, s: cursor, e: bed });

  const fin = isFinalMode(S, selDay);
  return `
  <div class="sec-h"><div><p class="eyebrow">Haftalık plan</p><h1>Program</h1></div>
    <div class="row-actions"><button class="iconbtn" data-a="weekNav" data-id="-1" aria-label="Önceki hafta">${I.back}</button><button class="linkbtn" data-a="weekNav" data-id="0">Bu hafta</button><button class="iconbtn" data-a="weekNav" data-id="1" aria-label="Sonraki hafta">${I.chev}</button></div></div>
  <div class="weekstrip">${days.map(d => {
    const bl = blocksFor(S, d); const has = S.school.items.some(i => i.date === d && !i.done);
    return `<button class="wday ${d === selDay ? 'on' : ''} ${d === t ? 'today' : ''}" data-a="selDay" data-id="${d}">
      <span class="dn">${DOW[dowOf(d)]}</span><span class="dd tnum">${Number(d.slice(8))}</span>
      <span class="mini-bars">${bl.slice(0, 6).map(b => `<i style="background:var(--c-${CATS[b.cat] ? b.cat : 'kisisel'})"></i>`).join('')}</span>
      ${has ? '<span class="flag"></span>' : ''}</button>`;
  }).join('')}</div>
  <p class="small muted center">${esc(fmtShort(mon))} – ${esc(fmtShort(addDaysKey(mon, 6)))}</p>
  ${fin ? `<div class="banner warnb"><p><b>Final dönemi.</b> Ders bloklarına öncelik ver; spor ve İngilizceyi kısa tut ama bırakma.</p></div>` : ''}

  <section class="stack-s">
    ${head(esc(fmtLong(selDay)), `<button class="btn sm" data-a="blockNew" data-id="${minToHm(wake)}">+ Blok</button>`)}
    ${items.length ? `<div class="chips wrap">${items.map(i => `<a class="chip ${i.done ? '' : 'warn'}" href="#alanlar/okul">${esc(courseName(i.courseId))} · ${esc(i.title || TYPE[i.type])}${i.time ? ' ' + i.time : ''}</a>`).join('')}</div>` : ''}
    <div class="timeline">${rows.map(r => r.gap
      ? `<button class="gap" data-a="blockNew" data-id="${minToHm(r.s)}" data-k="${minToHm(r.e)}"><span class="tm tnum">${minToHm(r.s)}</span><span class="gl">Boş · ${minsLabel(r.e - r.s)}</span><span class="add">+ Doldur</span></button>`
      : `<button class="blk cat-${CATS[r.b.cat] ? r.b.cat : 'kisisel'}" data-a="blockEdit" data-id="${r.b.id}" data-k="${r.b.repeat ? 't' : 'd'}">
          <span class="tm tnum">${r.b.start}<br><small>${r.b.end}</small></span>
          <span class="bt"><b>${esc(r.b.title)}</b><span class="small muted">${esc(CATS[r.b.cat] ? CATS[r.b.cat].n : '')}${r.b.repeat ? ' · her hafta' : ' · sadece bu gün'}${r.b.note ? ' · ' + esc(r.b.note) : ''}</span></span>
          ${r.b.notify ? `<span class="muted">${ic('bell', 'xs')}</span>` : ''}
        </button>`).join('') || empty('Bu gün boş. "+ Blok" ile ekle.')}</div>
    <p class="small muted">Kalkış ${esc(S.settings.wake)} · yatış ${esc(S.settings.bed)}. Boşluklara dokunarak doldurabilirsin. Zil simgesi olan bloklar için bildirim gelir.</p>
  </section>

  <section class="stack-s">
    ${head('Bu haftanın dağılımı')}
    <div class="card">${weekDistribution(days)}</div>
  </section>`;
}
const TYPE = { quiz: 'Quiz', odev: 'Ödev', sinav: 'Sınav' };
const courseName = id => (S.school.courses.find(c => c.id === id) || {}).name || '';

function weekDistribution(days) {
  const tot = {};
  for (const d of days) for (const b of blocksFor(S, d)) { const m = dayMin(b.end) - dayMin(b.start); tot[b.cat] = (tot[b.cat] || 0) + m; }
  const entries = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  return `<div class="dist">${entries.map(([c, m]) => `<div class="drow"><span class="dl">${catDot(c)} ${esc(CATS[c] ? CATS[c].n : c)}</span><span class="dbar"><i style="width:${m / max * 100}%;background:var(--c-${CATS[c] ? c : 'kisisel'})"></i></span><span class="dv tnum">${minsLabel(m)}</span></div>`).join('')}</div>`;
}

A.weekNav = d => { weekOff = d === '0' ? 0 : weekOff + Number(d); selDay = null; if (weekOff !== 0) selDay = addDaysKey(mondayKey(today()), weekOff * 7); };
A.selDay = d => { selDay = d; };

/* block editor */
let edit = null;
function blockSheet() {
  const b = edit;
  return `${sheetHead(b.id ? 'Bloğu düzenle' : 'Yeni blok', esc(fmtLong(b.date)))}
  <form data-form="block" class="stack">
    <div class="field"><label for="bTitle">Ne yapacaksın?</label><input class="inp" id="bTitle" required value="${esc(b.title)}" placeholder="ör. Ders: Analog, Spor, Duş + cilt bakımı"></div>
    <div class="field"><span class="lbl">Tür</span><div class="chips wrap">${Object.entries(CATS).map(([k, v]) => `<button type="button" class="fchip ${b.cat === k ? 'on' : ''}" data-a="bCat" data-id="${k}">${catDot(k)}${esc(v.n)}</button>`).join('')}</div></div>
    <div class="inline"><div class="field grow"><label for="bStart">Başlangıç</label><input class="inp" id="bStart" type="time" value="${b.start}" required></div><div class="field grow"><label for="bEnd">Bitiş</label><input class="inp" id="bEnd" type="time" value="${b.end}" required></div></div>
    <div class="field"><span class="lbl">Tekrar</span><div class="seg">${[['t', `Her ${DOW_LONG[dowOf(b.date)]}`], ['d', 'Sadece bu gün']].map(([k, l]) => `<button type="button" class="${b.mode === k ? 'on' : ''}" data-a="bMode" data-id="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Bildirim</span><div class="seg">${[[-1, 'Yok'], [0, 'Başlarken'], [10, '10 dk önce'], [30, '30 dk önce']].map(([k, l]) => `<button type="button" class="${(b.notify ? b.lead : -1) === k ? 'on' : ''}" data-a="bNotify" data-id="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><label for="bNote">Not (isteğe bağlı)</label><input class="inp" id="bNote" value="${esc(b.note || '')}" placeholder="ör. 3. bölüm alıştırmalar"></div>
    <button class="btn block" type="submit">Kaydet</button>
  </form>
  ${b.id ? `<div class="stack-s">${b.origMode === 't' ? `<button class="btn ghost" data-a="blockSkip">Sadece bu haftadan kaldır</button>` : ''}${del('blockDel', b.id, null, b.origMode === 't' ? 'Her haftadan sil' : 'Sil')}</div>` : ''}`;
}
A.blockNew = (start, end) => {
  const s = start || '18:00'; const e = end ? minToHm(Math.min(hmToMin(s) + 60, dayMin(end))) : minToHm(hmToMin(s) + 60);
  edit = { id: null, date: selDay || today(), title: '', cat: 'kisisel', start: s, end: e, mode: 'd', notify: true, lead: 0, note: '' };
  openSheet(blockSheet);
};
A.blockEdit = (id, kind) => {
  const src = kind === 't' ? S.schedule.template.find(x => x.id === id) : S.schedule.dated.find(x => x.id === id);
  if (!src) return;
  edit = { ...src, date: selDay, mode: kind, origMode: kind, lead: src.lead || 0 };
  openSheet(blockSheet);
};
A.bCat = c => { edit.cat = c; renderSheet(); };
A.bMode = m => { edit.mode = m; renderSheet(); };
A.bNotify = v => { const n = Number(v); edit.notify = n >= 0; edit.lead = Math.max(0, n); renderSheet(); };
F.block = () => {
  const title = val('bTitle').trim(), start = val('bStart'), end = val('bEnd');
  if (!title || !start || !end) return;
  if (dayMin(end) <= dayMin(start)) { toast('Bitiş saati başlangıçtan sonra olmalı.'); return; }
  const data = { title, cat: edit.cat, start, end, notify: edit.notify, lead: edit.lead, note: val('bNote').trim() };
  const sc = S.schedule, o = edit.origMode, m = edit.mode, id = edit.id;
  if (!id) {
    if (m === 't') sc.template.push({ id: uid(), dow: dowOf(edit.date), ...data }); else sc.dated.push({ id: uid(), date: edit.date, ...data });
  } else if (o === 't' && m === 't') {
    Object.assign(sc.template.find(x => x.id === id), data);
  } else if (o === 't' && m === 'd') { // change only this date: hide the weekly one here, add a one-off copy
    sc.skips.push({ id, date: edit.date }); sc.dated.push({ id: uid(), date: edit.date, ...data });
  } else if (o === 'd' && m === 'd') {
    Object.assign(sc.dated.find(x => x.id === id), data);
  } else { // one-off becomes weekly
    sc.dated = sc.dated.filter(x => x.id !== id); sc.template.push({ id: uid(), dow: dowOf(edit.date), ...data });
  }
  pruneSkips();
  save('schedule'); closeSheet(); toast('Kaydedildi');
};
A.blockSkip = () => { S.schedule.skips.push({ id: edit.id, date: edit.date }); pruneSkips(); save('schedule'); closeSheet(); toast('Bu haftadan kaldırıldı'); };
A.blockDel = id => {
  S.schedule.template = S.schedule.template.filter(x => x.id !== id); S.schedule.dated = S.schedule.dated.filter(x => x.id !== id);
  save('schedule'); closeSheet(); toast('Silindi');
};
function pruneSkips() { const cut = addDaysKey(today(), -30); S.schedule.skips = S.schedule.skips.filter(s => s.date >= cut); S.schedule.dated = S.schedule.dated.filter(b => b.date >= addDaysKey(today(), -90)); }
export const _diff = diffDays;
