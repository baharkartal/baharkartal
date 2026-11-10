// State, saving on this device, and sync with the GLOW server.
import { defaultState, SECTIONS } from './defaults.js';
import { dayKeyOf, tzOf } from './schedule.js';

const LS_STATE = 'glow.state.v1', LS_TOKEN = 'glow.token', LS_SINCE = 'glow.since';
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};

export const S = {};          // section -> data
const T = {};                 // section -> last change time
const pending = new Set();    // sections changed since last sync
let listeners = [];
export const sync = { status: 'local', message: '', last: 0, server: null };

export const today = () => dayKeyOf(Date.now(), tzOf(S));
export const onChange = fn => listeners.push(fn);
const emit = () => listeners.forEach(fn => fn());

export function load() {
  const base = defaultState(dayKeyOf(Date.now(), 180));
  let saved = null; try { saved = JSON.parse(ls.get(LS_STATE) || 'null'); } catch (e) { saved = null; }
  for (const k of SECTIONS) {
    if (saved && saved[k]) { S[k] = saved[k].d; T[k] = saved[k].t; }
    else { S[k] = base[k]; T[k] = 0; }
  }
  // fill fields added in later versions
  S.settings = { ...base.settings, ...S.settings, targets: { ...base.settings.targets, ...(S.settings.targets || {}) } };
  if (!saved) SECTIONS.forEach(k => pending.add(k));
  sync.status = token() ? 'idle' : 'local';
}
function persist() {
  const o = {}; for (const k of SECTIONS) o[k] = { d: S[k], t: T[k] };
  ls.set(LS_STATE, JSON.stringify(o));
}
let syncTimer = null;
// call after changing S[section]
export function save(...sections) {
  const now = Date.now();
  for (const k of sections) { T[k] = Math.max(now, (T[k] || 0) + 1); pending.add(k); }
  persist(); emit();
  clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 1500);
}
export function replaceAll(obj) {
  const now = Date.now();
  for (const k of SECTIONS) if (obj[k] !== undefined) { S[k] = obj[k]; T[k] = now; pending.add(k); }
  persist(); emit(); syncNow();
}

/* ---------- server ---------- */
export const token = () => ls.get(LS_TOKEN);
async function call(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  const t = token(); if (t) headers.authorization = 'Bearer ' + t;
  const res = await fetch('/api' + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || ('Hata ' + res.status)); e.status = res.status; throw e; }
  return data;
}
export async function serverStatus() {
  try { sync.server = await call('/status'); } catch (e) { sync.server = null; }
  return sync.server;
}
const deviceName = () => /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : /Windows/.test(navigator.userAgent) ? 'Windows' : 'Cihaz';
export async function setup(password) {
  const r = await call('/setup', { method: 'POST', body: { password, device: deviceName() } });
  ls.set(LS_TOKEN, r.token); ls.set(LS_SINCE, '0');
  // first device: everything here becomes the starting copy on the server
  const now = Date.now(); for (const k of SECTIONS) { T[k] = Math.max(T[k] || 0, now); pending.add(k); }
  persist(); await syncNow(true);
}
export async function login(password) {
  const r = await call('/login', { method: 'POST', body: { password, device: deviceName() } });
  ls.set(LS_TOKEN, r.token); ls.set(LS_SINCE, '0');
  // a new device: take what the server has instead of pushing the starter plan over it
  pending.clear();
  for (const k of SECTIONS) T[k] = 0;
  await syncNow(true);
}
export function logout() { ls.del(LS_TOKEN); sync.status = 'local'; emit(); }

let syncing = false;
export async function syncNow(full) {
  if (!token() || syncing) return;
  if (!navigator.onLine) { sync.status = 'offline'; emit(); return; }
  syncing = true; sync.status = 'syncing';
  try {
    const sections = {}; for (const k of pending) sections[k] = { d: S[k], t: T[k] };
    const sent = new Set(pending);
    const since = full ? 0 : Number(ls.get(LS_SINCE) || 0);
    const r = await call('/state', { method: 'PUT', body: { sections, since } });
    sent.forEach(k => { if (T[k] <= (sections[k] ? sections[k].t : 0)) pending.delete(k); });
    let changed = false;
    for (const [k, v] of Object.entries(r.sections || {})) {
      if (SECTIONS.includes(k) && v.t > (T[k] || 0) && !pending.has(k)) { S[k] = v.d; T[k] = v.t; changed = true; }
    }
    ls.set(LS_SINCE, String((r.now || Date.now()) - 120000));
    sync.status = 'ok'; sync.last = Date.now(); sync.message = '';
    if (changed) { S.settings = { ...defaultState(today()).settings, ...S.settings }; persist(); }
  } catch (e) {
    if (e.status === 401) { ls.del(LS_TOKEN); sync.status = 'local'; sync.message = 'Oturum kapandı. Ayarlar → Eşitleme bölümünden tekrar giriş yap.'; }
    else { sync.status = 'error'; sync.message = 'Eşitlenemedi; değişiklikler bu cihazda duruyor, bağlantı gelince gönderilecek.'; }
  } finally { syncing = false; emit(); }
}

/* ---------- notifications ---------- */
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const keyBytes = b64 => { b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); };
export async function enablePush() {
  if (!pushSupported()) throw new Error(isStandalone() ? 'Bu cihaz bildirimleri desteklemiyor.' : 'Bildirimler için GLOW\'u önce ana ekrana eklemelisin (iPhone\'da Safari → Paylaş → Ana Ekrana Ekle).');
  if (!token()) throw new Error('Önce Eşitleme bölümünden şifreni belirle ya da giriş yap.');
  const st = sync.server || await serverStatus();
  if (!st || !st.vapidKey) throw new Error('Sunucuda bildirim anahtarı ayarlı değil.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Bildirim izni verilmedi. iPhone Ayarlar → Bildirimler → GLOW bölümünden açabilirsin.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(st.vapidKey) });
  await call('/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), device: deviceName() } });
  ls.set('glow.push', '1');
  return true;
}
export const pushEnabled = () => ls.get('glow.push') === '1' && 'Notification' in window && Notification.permission === 'granted';
export const testPush = () => call('/test-push', { method: 'POST', body: {} });

// sync when the app comes back to the screen, and every 60 s while open
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
window.addEventListener('online', () => syncNow());
setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
