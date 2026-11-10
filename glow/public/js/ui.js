// Shared UI helpers: escaping, icons, dates, charts, sheets, toasts, action registry.
import { keyToUTC, dowOf, addDaysKey } from './schedule.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
export const $ = s => document.querySelector(s);
export const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
export const num = id => { const v = parseFloat(String(val(id)).replace(',', '.')); return Number.isFinite(v) ? v : null; };
export const r1 = n => Math.round(n * 10) / 10;

/* actions: data-a="name" data-id data-k on clickable elements; data-form="name" on forms */
export const A = {}, F = {};

/* dates */
export const DOW = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
export const DOW_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const dt = key => new Date(keyToUTC(key));
export const fmtDay = key => dt(key).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
export const fmtShort = key => dt(key).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtLong = key => dt(key).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
export const dayName = key => DOW_LONG[dowOf(key)];
export const lastNDays = (key, n) => Array.from({ length: n }, (_, i) => addDaysKey(key, i - n + 1));
export const minsLabel = m => m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ' ' + (m % 60) + ' dk' : ''}` : `${m} dk`;
export const nowHm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/* icons (stroke icons, 24px grid) */
const sv = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
export const I = {
  today: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>'),
  plan: sv('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6"/>'),
  body: sv('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  me: sv('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  grid: sv('<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
  ok: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  edit: sv('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  back: sv('<path d="M15 5l-7 7 7 7"/>'),
  chev: sv('<path d="M9 5l7 7-7 7"/>'),
  pin: sv('<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/>'),
  pill: sv('<rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9.5 8.5l5 7"/>'),
  moon: sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"/>'),
  drop: sv('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>',
  book: sv('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  globe: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z"/>'),
  coin: sv('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.7.9-2.7 2.1 0 2.9 5.6 1.5 5.6 4.3 0 1.2-1.2 2.1-2.8 2.1-1.2 0-2.3-.6-2.8-1.6M12 6.5v1.3M12 16.3v1.2"/>'),
  note: sv('<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>'),
  target: sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  gift: sv('<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8s-1.5-4.5-4-4.5S5.5 7 12 8zM12 8s1.5-4.5 4-4.5S18.5 7 12 8z"/>'),
  review: sv('<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>'),
  doctor: sv('<path d="M8 3v5a4 4 0 0 0 8 0V3M12 12v3a4 4 0 0 0 8 0v-1"/><circle cx="20" cy="12" r="2"/>'),
  timer: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>'),
  copy: sv('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  lock: sv('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  bell: sv('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  link: sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  cart: sv('<path d="M3 4h2.5l2.2 11h10.6L20.5 7.5H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>'),
  chef: sv('<path d="M7 14.5V20h10v-5.5M7 14.5A4 4 0 0 1 6.5 7a5 5 0 0 1 11 0 4 4 0 0 1-.5 7.5zM7 17h10"/>'),
  scale: sv('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.5 3"/>')
};
export const ic = (name, cls = '') => `<span class="ic ${cls}">${I[name] || ''}</span>`;

/* small components */
export const check = (on, action, id, k, label, sq) => `<button class="check ${sq ? 'sq' : ''} ${on ? 'on' : ''}" data-a="${action}" data-id="${esc(id)}" ${k != null ? `data-k="${esc(k)}"` : ''} aria-pressed="${on ? 'true' : 'false'}" aria-label="${esc(label || '')}">${I.ok}</button>`;
export const bar = (pct, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
export const ring = (pct, size = 76, stroke = 7, label = '') => {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><defs><linearGradient id="glowg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--glow-a)"/><stop offset="1" stop-color="var(--glow-b)"/></linearGradient></defs><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p / 100)}"/></svg><span class="lbl tnum">${label}</span></div>`;
};
export const empty = text => `<div class="empty">${esc(text)}</div>`;
export const head = (title, right = '') => `<div class="sec-h"><h2>${title}</h2>${right}</div>`;
export const seg = (items, cur, action) => `<div class="seg" role="tablist">${items.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${action}" data-id="${k}" role="tab" aria-selected="${cur === k}">${l}</button>`).join('')}</div>`;
export const del = (action, id, k, label = 'Sil') => {
  const armed = confirmKey === action + ':' + id + ':' + (k || '');
  return `<button class="btn danger" data-a="${armed ? action : 'arm'}" data-id="${esc(id)}" ${k != null ? `data-k="${esc(k)}"` : ''} data-act="${action}">${armed ? 'Eminim, sil' : label}</button>`;
};
export let confirmKey = null;
A.arm = (id, k, el) => { confirmKey = el.dataset.act + ':' + id + ':' + (k || ''); rerender(); };
export const disarm = () => { confirmKey = null; };

/* charts (SVG, drawn to scale) */
export function barChart(values, { labels = [], max = null, target = null, h = 120, unit = '', highlightLast = true, fmt = v => v } = {}) {
  const W = 320, H = h, L = 30, B = 18, T = 18, n = values.length || 1;
  const mx = Math.max(max ?? 0, target ?? 0, ...values, 1);
  const bw = (W - L - 2) / n;
  const y = v => H - B - (H - B - T) * (v / mx);
  let out = '';
  [0, mx / 2, mx].forEach(g => { out += `<line class="grid" x1="${L}" x2="${W}" y1="${y(g)}" y2="${y(g)}"/><text x="${L - 5}" y="${y(g) + 3}" text-anchor="end">${fmt(Math.round(g * 10) / 10)}</text>`; });
  values.forEach((v, i) => {
    const x = L + i * bw + bw * 0.18, w = bw * 0.64, top = y(v);
    out += `<rect class="${highlightLast && i === n - 1 ? 'b hi' : 'b'}" x="${x}" y="${top}" width="${w}" height="${Math.max(0, H - B - top)}" rx="3"><title>${esc(labels[i] || '')}: ${v}${unit}</title></rect>`;
    if (labels[i] && (n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1)) out += `<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${esc(labels[i])}</text>`;
  });
  if (target != null) out += `<line class="tg" x1="${L}" x2="${W}" y1="${y(target)}" y2="${y(target)}"/><text class="tgl" x="${W}" y="${y(target) - 4}" text-anchor="end">hedef ${fmt(target)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}
export function lineChart(points, { h = 130, target = null, unit = '', yPad = 1, dots = true } = {}) {
  // points: [{x: label, v: number}]
  if (points.length < 2) return '';
  const W = 320, H = h, L = 34, R = 10, T = 18, B = 18;
  const vals = points.map(p => p.v).concat(target != null ? [target] : []);
  const mn = Math.floor(Math.min(...vals) - yPad), mx = Math.ceil(Math.max(...vals) + yPad);
  const X = i => L + i * (W - L - R) / (points.length - 1), Y = v => T + (mx - v) / ((mx - mn) || 1) * (H - T - B);
  const pts = points.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  let out = `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(mx)}" y2="${Y(mx)}"/><line class="grid" x1="${L}" x2="${W - R}" y1="${Y(mn)}" y2="${Y(mn)}"/>
    <text x="${L - 5}" y="${Y(mx) + 3}" text-anchor="end">${mx}</text><text x="${L - 5}" y="${Y(mn) + 3}" text-anchor="end">${mn}</text>
    <polygon class="ar" points="${L},${H - B} ${pts} ${X(points.length - 1)},${H - B}"/>`;
  if (target != null) out += `<line class="tg" x1="${L}" x2="${W - R}" y1="${Y(target)}" y2="${Y(target)}"/><text class="tgl" x="${W - R}" y="${Y(target) - 4}" text-anchor="end">hedef ${target}${unit}</text>`;
  out += `<polyline class="ln" points="${pts}"/>`;
  if (dots) points.forEach((p, i) => { out += `<circle class="${i === points.length - 1 ? 'pt hi' : 'pt'}" cx="${X(i)}" cy="${Y(p.v)}" r="${i === points.length - 1 ? 4.5 : 2.5}"><title>${esc(p.x)}: ${p.v}${unit}</title></circle>`; });
  out += `<text x="${L}" y="${H - 3}">${esc(points[0].x)}</text><text x="${W - R}" y="${H - 3}" text-anchor="end">${esc(points[points.length - 1].x)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}
// row of day cells (heat strip) — cells: [{label, level 0..1, title}]
export const strip = cells => `<div class="strip">${cells.map(c => `<span class="cell" style="--l:${c.level}" title="${esc(c.title || '')}"><i></i><b>${esc(c.label)}</b></span>`).join('')}</div>`;

/* sheets & toasts */
let sheetFn = null;
let rerenderHook = () => { };
export const setRerender = fn => { rerenderHook = fn; };
export const rerender = () => rerenderHook();
export function openSheet(fn) {
  sheetFn = fn; confirmKey = null;
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="scrim" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="in"><div class="grab"></div><div id="sheetBody" class="stack">${fn()}</div></div></div>`;
  requestAnimationFrame(() => { root.querySelector('.scrim').classList.add('show'); root.querySelector('.sheet').classList.add('show'); });
}
export function renderSheet() {
  if (!sheetFn) return;
  const body = $('#sheetBody'); if (!body) return;
  const vals = {}; body.querySelectorAll('input,textarea,select').forEach(el => { if (el.id && el.type !== 'checkbox' && !el.dataset.fresh) vals[el.id] = el.value; });
  const act = document.activeElement && document.activeElement.id;
  const html = sheetFn(); if (html === null) return closeSheet();
  body.innerHTML = html;
  for (const [id, v] of Object.entries(vals)) { const el = document.getElementById(id); if (el && body.contains(el)) el.value = v; }
  if (act) { const el = document.getElementById(act); if (el && body.contains(el)) el.focus({ preventScroll: true }); }
}
export function closeSheet() {
  sheetFn = null; confirmKey = null;
  const root = $('#sheetRoot'), s = root.querySelector('.sheet'), sc = root.querySelector('.scrim');
  if (s) { s.classList.remove('show'); sc.classList.remove('show'); setTimeout(() => { if (!sheetFn) root.innerHTML = ''; }, 260); }
}
export const sheetOpen = () => !!sheetFn;
A.closeSheet = () => closeSheet();
export const sheetHead = (title, eyebrow = '') => `<div class="sheet-h"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2>${title}</h2></div><button class="iconbtn" data-a="closeSheet" aria-label="Kapat">${I.x}</button></div>`;

let toastT;
export function toast(msg, undo) {
  const r = $('#toastRoot');
  r.innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${undo ? '<button id="undoBtn">Geri al</button>' : ''}</div>`;
  if (undo) $('#undoBtn').onclick = () => { undo(); r.innerHTML = ''; };
  clearTimeout(toastT); toastT = setTimeout(() => { r.innerHTML = ''; }, 4200);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove(); return ok;
  }
}

export const CATS = {
  okul: { n: 'Okul' }, ders: { n: 'Ders çalışma' }, spor: { n: 'Spor' }, yemek: { n: 'Yemek' }, ingilizce: { n: 'İngilizce' },
  gelir: { n: 'Gelir' }, ev: { n: 'Ev' }, bakim: { n: 'Bakım' }, kisisel: { n: 'Kişisel' }
};
export const catDot = c => `<span class="dot" style="background:var(--c-${CATS[c] ? c : 'kisisel'})"></span>`;
