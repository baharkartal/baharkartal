// GLOW — shared time and notification logic.
// Used by the app (browser) and by the notification worker (Cloudflare), so it
// must stay free of DOM and storage access.
//
// A "day" in GLOW starts at 04:00, so 00:00 magnesium and a 00:30 bedtime still
// belong to the evening they follow.

export const DAY_START_MIN = 240; // 04:00
const MIN = 60000;
const DAY = 86400000;

export const pad = n => String(n).padStart(2, '0');
export const hmToMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const minToHm = m => { m = ((m % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
// minutes within the GLOW day, so 00:30 sorts after 23:00
export const dayMin = hm => { const m = hmToMin(hm); return m < DAY_START_MIN ? m + 1440 : m; };

export const tzOf = state => (state && state.settings && Number.isFinite(state.settings.tz)) ? state.settings.tz : 180;

// calendar date key (YYYY-MM-DD) of a timestamp in the user's zone
export function calKey(ms, tz) { const d = new Date(ms + tz * MIN); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
// GLOW day key of a timestamp
export const dayKeyOf = (ms, tz) => calKey(ms - DAY_START_MIN * MIN, tz);
export function keyToUTC(key) { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); }
export const addDaysKey = (key, n) => { const t = keyToUTC(key) + n * DAY; const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const dowOf = key => new Date(keyToUTC(key)).getUTCDay(); // 0 = Sunday
export const diffDays = (a, b) => Math.round((keyToUTC(b) - keyToUTC(a)) / DAY);
// timestamp of a time on a GLOW day
export const atMs = (key, hm, tz) => keyToUTC(key) + dayMin(hm) * MIN - tz * MIN;
export const mondayKey = key => addDaysKey(key, -((dowOf(key) + 6) % 7));
export function isoWeek(key) {
  const t = new Date(keyToUTC(key)); const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const w = 1 + Math.round(((t - firstThu) / DAY - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${pad(w)}`;
}

/* ---------------- schedule blocks ---------------- */
export function blocksFor(state, key) {
  const sc = state.schedule || {};
  const dow = dowOf(key);
  const skips = new Set((sc.skips || []).filter(s => s.date === key).map(s => s.id));
  const tpl = (sc.template || []).filter(b => b.dow === dow && !skips.has(b.id)).map(b => ({ ...b, repeat: true }));
  const dated = (sc.dated || []).filter(b => b.date === key).map(b => ({ ...b, repeat: false }));
  return tpl.concat(dated).sort((a, b) => dayMin(a.start) - dayMin(b.start));
}
export const isFinalMode = (state, key) => {
  const s = state.settings || {};
  return !!(s.finalFrom && s.finalsDate && key >= s.finalFrom && key < s.finalsDate);
};

/* ---------------- medications ---------------- */
export function medsFor(state, key) {
  const dow = dowOf(key), out = [];
  for (const m of (state.meds && state.meds.list) || []) {
    if (m.paused) continue;
    if (Array.isArray(m.days) && m.days.length && !m.days.includes(dow)) continue;
    for (const t of m.times || []) out.push({ med: m, time: t, slot: `${m.id}@${t}` });
  }
  return out.sort((a, b) => dayMin(a.time) - dayMin(b.time));
}
export const medTaken = (state, key, slot) => !!(state.meds && state.meds.log && state.meds.log[key] && state.meds.log[key][slot]);

/* ---------------- care routines ---------------- */
// item.freq: {type:'daily'} | {type:'days', days:[0..6]} | {type:'every', n}
export function lastDone(state, id, beforeKey) {
  const log = (state.care && state.care.log) || {};
  let best = null;
  for (const k in log) if (log[k] && log[k][id] && (!beforeKey || k < beforeKey) && (!best || k > best)) best = k;
  return best;
}
export function careDue(state, item, key) {
  const f = item.freq || { type: 'daily' };
  if (f.type === 'days') return (f.days || []).includes(dowOf(key));
  if (f.type === 'every') {
    const last = lastDone(state, item.id, key);
    return !last || diffDays(last, key) >= (f.n || 2);
  }
  return true;
}
export const careDone = (state, key, id) => !!(state.care && state.care.log && state.care.log[key] && state.care.log[key][id]);
export function careFor(state, key, when) {
  const hard = isHard(state, key);
  return ((state.care && state.care.items) || []).filter(i => (!when || i.when === when) && (!hard || i.essential) && (careDue(state, i, key) || careDone(state, key, i.id)));
}
export const isHard = (state, key) => !!(state.mood && state.mood.hard && state.mood.hard[key]);

/* ---------------- notifications ---------------- */
// Every notification GLOW can send for one GLOW day, given the state *now*.
// Conditional ones (follow-ups, care, mood) check the state when they fire.
export function eventsForDay(state, key) {
  const tz = tzOf(state), s = state.settings || {}, ev = [];
  const hard = isHard(state, key);
  const push = (hm, title, body, tag, url, extra) => ev.push({ at: atMs(key, hm, tz), title, body, tag: tag || title, url: url || '/', ...extra });

  // medications, grouped by time, with two follow-ups if not ticked
  const byTime = {};
  for (const x of medsFor(state, key)) (byTime[x.time] = byTime[x.time] || []).push(x);
  for (const t in byTime) {
    const xs = byTime[t];
    const names = xs.map(x => x.med.name + (x.med.withMeal ? ' (yemekle)' : '')).join(', ');
    push(t, '💊 İlaç zamanı', names, `med-${key}-${t}`, '/#bugun');
    const open = xs.filter(x => !medTaken(state, key, x.slot));
    if (open.length) {
      const names2 = open.map(x => x.med.name).join(', ');
      push(minToHm(hmToMin(t) + 30), '💊 Hatırlatma', `${names2} için "aldım" işaretlemedin. Aldıysan bir dokunuşla işaretle.`, `med-${key}-${t}`, '/#bugun');
      push(minToHm(hmToMin(t) + 90), '💊 Son hatırlatma', `${names2} hâlâ bekliyor.`, `med-${key}-${t}`, '/#bugun');
    }
  }

  // schedule blocks
  if (!hard) for (const b of blocksFor(state, key)) {
    if (!b.notify) continue;
    const at = minToHm(hmToMin(b.start) - (b.lead || 0));
    push(at, b.title, `${b.start}–${b.end}${b.note ? ' · ' + b.note : ''}`, `blk-${key}-${b.id}`, '/#program');
  }

  // care routines (only if something is still open when it fires)
  for (const [when, hm, title] of [['sabah', s.careMorning || '09:15', '☀️ Sabah bakımı'], ['aksam', s.careNight || '23:45', '🌙 Gece bakımı']]) {
    const open = careFor(state, key, when).filter(i => !careDone(state, key, i.id));
    if (open.length) push(hm, title, open.slice(0, 5).map(i => i.text).join(' · '), `care-${key}-${when}`, '/#ben');
  }
  const showerish = careFor(state, key, 'gun').filter(i => !careDone(state, key, i.id));
  if (showerish.length) push(s.careDay || '18:30', '🫧 Kendine özen', showerish.slice(0, 4).map(i => i.text).join(' · ') + ' · Küçük bir adım da sayılır.', `care-${key}-gun`, '/#ben');

  // reminders: timed ones at their time, the rest in a morning digest
  const pend = ((state.reminders && state.reminders.items) || []).filter(r => !r.done);
  for (const r of pend) if (r.kind === 'date' && r.date === key && r.time) push(r.time, '🔔 Hatırlatma', r.text, `rem-${r.id}`, '/#bugun');
  const digest = pend.filter(r => r.kind !== 'date' || (r.date <= key && !(r.date === key && r.time)));
  if (digest.length) push(s.digestTime || '10:00', `🔔 Bekleyen ${digest.length} hatırlatma`, digest.slice(0, 4).map(r => r.text).join(' · '), `digest-${key}`, '/#bugun');

  // school: quizzes, homework, exams
  for (const it of (state.school && state.school.items) || []) {
    if (it.done || !it.date) continue;
    const course = ((state.school.courses || []).find(c => c.id === it.courseId) || {}).name || '';
    const label = `${course ? course + ' · ' : ''}${it.title || ({ quiz: 'Quiz', odev: 'Ödev', sinav: 'Sınav' })[it.type] || ''}`;
    const d = diffDays(key, it.date);
    if (d === 3) push('20:00', '📚 3 gün kaldı', label, `sch-${it.id}-3`, '/#alanlar/okul');
    if (d === 1) push('20:00', '📚 Yarın', label + (it.time ? ' · ' + it.time : ''), `sch-${it.id}-1`, '/#alanlar/okul');
    if (d === 0) push('08:45', '📚 Bugün', label + (it.time ? ' · ' + it.time : ''), `sch-${it.id}-0`, '/#alanlar/okul');
  }

  // doctor appointments
  for (const a of (state.doctor && state.doctor.appts) || []) {
    if (!a.date) continue;
    const d = diffDays(key, a.date);
    if (d === 1) push('20:00', '🩺 Yarın randevun var', `${a.time || ''} ${a.place || ''}`.trim() + ' · Soracaklarına bir göz at.', `doc-${a.id}-1`, '/#ben/doktor');
    if (d === 0 && a.time) push(minToHm(hmToMin(a.time) - 120), '🩺 Randevu 2 saat sonra', `${a.time} ${a.place || ''}`.trim(), `doc-${a.id}-0`, '/#ben/doktor');
  }

  // mood check-in, water, weekly review
  if (!(state.mood && state.mood.log && state.mood.log[key])) push(s.moodTime || '22:00', 'Bugün nasılsın?', '10 saniyelik ruh hali kaydı. Sadece bir dokunuş.', `mood-${key}`, '/#ben');
  if (s.waterReminders) {
    const w = (state.food && state.food.water && state.food.water[key]) || 0, goal = (s.targets && s.targets.water) || 8;
    [['12:00', 0.3], ['15:30', 0.55], ['18:30', 0.8]].forEach(([hm, f], i) => { if (w < Math.ceil(goal * f)) push(hm, '💧 Su', `${w}/${goal} bardak. Bir bardak su iç.`, `water-${key}-${i}`, '/#beden'); });
  }
  if (dowOf(key) === 0 && !(state.review && state.review.weeks && state.review.weeks[isoWeek(key)] && state.review.weeks[isoWeek(key)].done)) {
    push(s.reviewTime || '21:00', '🗓️ Haftalık değerlendirme', '5 dakika: haftan nasıl geçti, gelecek haftanın 3 önceliği ne?', `rev-${key}`, '/#alanlar/degerlendirme');
  }
  return ev;
}

// Notifications whose time falls in [from, to). The worker calls this once a minute.
export function dueBetween(state, from, to) {
  const tz = tzOf(state);
  const k0 = addDaysKey(dayKeyOf(from, tz), -1), k1 = addDaysKey(dayKeyOf(to, tz), 1);
  const out = [];
  for (let k = k0; k <= k1; k = addDaysKey(k, 1)) for (const e of eventsForDay(state, k)) if (e.at >= from && e.at < to) out.push(e);
  return out;
}
