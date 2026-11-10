// Numbers GLOW shows: totals, streaks, adherence, weekly figures.
import { S, today } from './store.js';
import { addDaysKey, mondayKey, medsFor, medTaken, careFor, careDone, diffDays, hmToMin, dowOf } from './schedule.js';

export const foodDay = key => {
  const items = (S.food.log[key] || []);
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const i of items) { t.kcal += +i.kcal || 0; t.p += +i.p || 0; t.c += +i.c || 0; t.f += +i.f || 0; }
  return { items, ...t };
};

// workouts
export const sessionsOn = key => S.workout.sessions.filter(s => s.date === key);
export const walksOn = key => (S.workout.walks || []).filter(w => w.date === key);
export function workoutDaysInWeek(mon) {
  const days = new Set(S.workout.sessions.filter(s => s.date >= mon && s.date <= addDaysKey(mon, 6)).map(s => s.date));
  return days.size;
}
export function weeksMeetingTarget() { // consecutive full weeks (ending last week, plus this week if already met)
  const target = S.settings.workoutTarget || 4;
  let mon = mondayKey(today()), n = 0;
  if (workoutDaysInWeek(mon) >= target) n++;
  for (let i = 0; i < 52; i++) { mon = addDaysKey(mon, -7); if (workoutDaysInWeek(mon) >= target) n++; else break; }
  return n;
}

// meds
export function medDay(key) {
  const slots = medsFor(S, key);
  const taken = slots.filter(s => medTaken(S, key, s.slot)).length;
  return { total: slots.length, taken, pct: slots.length ? taken / slots.length : 1 };
}
export function medStreak() { // consecutive days with every dose ticked (today counts once complete)
  let k = today(), n = 0;
  if (medDay(k).pct < 1) k = addDaysKey(k, -1);
  for (let i = 0; i < 400; i++, k = addDaysKey(k, -1)) {
    if (k < (S.settings.createdAt || '2000-01-01')) break;
    if (medDay(k).total && medDay(k).pct >= 1) n++; else break;
  }
  return n;
}
export function medAdherence(days = 30) {
  let tot = 0, tk = 0; const start = S.settings.createdAt || '2000-01-01';
  for (let i = 0; i < days; i++) { const k = addDaysKey(today(), -i); if (k < start) break; if (i === 0) continue; const d = medDay(k); tot += d.total; tk += d.taken; }
  return tot ? Math.round(tk / tot * 100) : null;
}

// care
export function careDay(key) {
  const items = careFor(S, key);
  const done = items.filter(i => careDone(S, key, i.id)).length;
  return { total: items.length, done, pct: items.length ? done / items.length : 0 };
}

// english: a day counts when at least one task or card review happened
export const englishDone = key => !!(S.english.log[key] && Object.keys(S.english.log[key]).length);
export function englishStreak() {
  let k = today(), n = 0;
  if (!englishDone(k)) k = addDaysKey(k, -1);
  for (let i = 0; i < 400 && englishDone(k); i++, k = addDaysKey(k, -1)) n++;
  return n;
}

// school
export function studyMinutes(courseId, from, to) {
  return S.school.sessions.filter(s => (!courseId || s.courseId === courseId) && s.date >= from && s.date <= to).reduce((a, s) => a + (+s.min || 0), 0);
}

// sleep
export function sleepHours(key) {
  const l = S.sleep.log[key]; if (!l || !l.bed || !l.wake) return null;
  let b = hmToMin(l.bed), w = hmToMin(l.wake);
  if (b > 12 * 60) b -= 1440; // went to bed before midnight
  return Math.round((w - b) / 6) / 10;
}

// body
export function weeklyAvgWeights(weeks = 12) {
  const out = []; let mon = mondayKey(today());
  for (let i = weeks - 1; i >= 0; i--) {
    const m = addDaysKey(mon, -7 * i), e = addDaysKey(m, 6);
    const ws = S.body.weights.filter(w => w.date >= m && w.date <= e);
    if (ws.length) out.push({ mon: m, v: Math.round(ws.reduce((a, w) => a + w.kg, 0) / ws.length * 10) / 10 });
  }
  return out;
}
export const lastWeight = () => S.body.weights.length ? S.body.weights[S.body.weights.length - 1] : null;
export function age() { const b = S.settings.birth; if (!b) return 23; const [y, m, d] = b.split('-').map(Number); const t = today().split('-').map(Number); return t[0] - y - ((t[1] < m || (t[1] === m && t[2] < d)) ? 1 : 0); }
// Mifflin-St Jeor, light-moderate activity with 4 home strength sessions
export function suggestedTargets() {
  const w = lastWeight() ? lastWeight().kg : 65, h = S.settings.height || 158, a = age();
  const bmr = 10 * w + 6.25 * h - 5 * a - 161;
  const tdee = Math.round(bmr * 1.45);
  const kcal = Math.round((tdee - 450) / 10) * 10;
  const p = Math.round(w * 1.75 / 5) * 5, f = Math.round(w * 0.75 / 5) * 5;
  const c = Math.max(80, Math.round((kcal - p * 4 - f * 9) / 4 / 5) * 5);
  return { bmr: Math.round(bmr), tdee, kcal, p, c, f };
}

// mood
export const moodOn = key => S.mood.log[key] ? S.mood.log[key].m : null;
export const avg = xs => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : null;

// rewards
export function rewardProgress(r) {
  if (r.type === 'spor') return { cur: weeksMeetingTarget(), unit: 'hafta üst üste hedef' };
  if (r.type === 'ilac') return { cur: medStreak(), unit: 'gün üst üste tüm ilaçlar' };
  if (r.type === 'ingilizce') return { cur: englishStreak(), unit: 'gün üst üste İngilizce' };
  return { cur: r.cur || 0, unit: r.unit || 'adım' };
}

export function weekSummary(mon) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(mon, i)).filter(k => k <= today());
  const t = S.settings.targets;
  const foodDays = days.map(foodDay).filter(d => d.items.length);
  const moods = days.map(moodOn).filter(m => m != null);
  const sleeps = days.map(sleepHours).filter(h => h != null);
  let medT = 0, medK = 0; days.forEach(k => { const d = medDay(k); medT += d.total; medK += d.taken; });
  const ws = S.body.weights.filter(w => w.date >= mon && w.date <= addDaysKey(mon, 6));
  const prev = S.body.weights.filter(w => w.date >= addDaysKey(mon, -7) && w.date < mon);
  const wAvg = ws.length ? avg(ws.map(w => w.kg)) : null, pAvg = prev.length ? avg(prev.map(w => w.kg)) : null;
  return {
    days: days.length,
    workouts: workoutDaysInWeek(mon), workoutTarget: S.settings.workoutTarget,
    walkMin: S.workout.walks.filter(w => w.date >= mon && w.date <= addDaysKey(mon, 6)).reduce((a, w) => a + (+w.minutes || 0), 0),
    medPct: medT ? Math.round(medK / medT * 100) : null,
    mood: avg(moods), sleep: avg(sleeps),
    kcal: foodDays.length ? Math.round(foodDays.reduce((a, d) => a + d.kcal, 0) / foodDays.length) : null,
    protein: foodDays.length ? Math.round(foodDays.reduce((a, d) => a + d.p, 0) / foodDays.length) : null,
    foodDays: foodDays.length, targets: t,
    study: S.school.courses.map(c => ({ name: c.name, min: studyMinutes(c.id, mon, addDaysKey(mon, 6)), target: (c.weeklyHours || 0) * 60 })),
    english: days.filter(englishDone).length,
    care: avg(days.map(k => careDay(k).pct * 100)),
    weight: wAvg, weightPrev: pAvg,
    cravings: S.food.cravings.filter(c => c.date >= mon && c.date <= addDaysKey(mon, 6)).length,
    hard: days.filter(k => S.mood.hard[k]).length
  };
}
export const minsTxt = m => m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ' ' + (m % 60) + ' dk' : ''}` : `${m} dk`;
export const daysUntil = key => diffDays(today(), key);
export { dowOf };
