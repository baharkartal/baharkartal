import { dueBetween, eventsForDay, atMs, dayKeyOf } from '../public/js/schedule.js';
import { defaultState } from '../public/js/defaults.js';
const st = defaultState('2026-11-10');
st.reminders.items.push({ id: 'r1', text: 'Bankaya uğra', kind: 'week', date: '2026-11-15', done: false });
const tz = 180;
// 20:00 Istanbul on Tue 10 Nov 2026 = 17:00 UTC
const t20 = Date.UTC(2026, 10, 10, 17, 0);
const due = dueBetween(st, t20, t20 + 60000);
const titles = due.map(e => e.title + ': ' + e.body);
console.log(titles);
if (!titles.some(t => t.includes('Effexor') && t.includes('Zoretanin'))) throw new Error('20:00 meds missing');
// magnesium at 00:00 Wed belongs to Tuesday's GLOW day
const t00 = Date.UTC(2026, 10, 10, 21, 0);
if (!dueBetween(st, t00, t00 + 60000).some(e => e.body.includes('Magnezyum'))) throw new Error('magnesium missing');
if (dayKeyOf(t00, tz) !== '2026-11-10') throw new Error('day key');
// follow-up 20:30 when not ticked, none when ticked
const t2030 = t20 + 30 * 60000;
if (!dueBetween(st, t2030, t2030 + 60000).some(e => e.title.includes('Hatırlatma'))) throw new Error('follow-up missing');
st.meds.log['2026-11-10'] = { 'm-eff@20:00': {}, 'm-zor@20:00': {} };
if (dueBetween(st, t2030, t2030 + 60000).some(e => e.title.includes('Hatırlatma'))) throw new Error('follow-up should stop');
// 10:00 digest includes week reminder; D vitamini on Tuesday 13:30
const t10 = Date.UTC(2026, 10, 10, 7, 0);
if (!dueBetween(st, t10, t10 + 60000).some(e => e.body.includes('Bankaya'))) throw new Error('digest missing');
const t1330 = Date.UTC(2026, 10, 10, 10, 30);
if (!dueBetween(st, t1330, t1330 + 60000).some(e => e.body.includes('D vitamini'))) throw new Error('vit D missing');
console.log('day events:', eventsForDay(st, '2026-11-10').length, '· schedule OK');
