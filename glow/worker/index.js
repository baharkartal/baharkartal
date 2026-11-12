// GLOW server: serves the app, keeps Bahar's data in sync between devices,
// and sends notifications once a minute (cron).
import { dueBetween } from '../public/js/schedule.js';
import { sendPush, b64u } from './push.js';
import ASSETS from './assets.gen.js';

const bin = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
function serveAsset(url) {
  const a = ASSETS[url.pathname === '/' ? '/index.html' : url.pathname] || ASSETS['/index.html'];
  const cache = /\.(png)$/.test(url.pathname) ? 'public, max-age=86400' : 'no-cache';
  return new Response(a.b ? bin(a.d) : a.d, { headers: { 'content-type': a.t, 'cache-control': cache } });
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const enc = new TextEncoder();
const sha = async s => b64u(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const PBKDF2_ITER = 10000;

async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return { salt: btoa(String.fromCharCode(...salt)), hash: b64u(bits) };
}
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

async function getJSON(env, key, fallback) { const v = await env.GLOW.get(key, 'json'); return v == null ? fallback : v; }
const putJSON = (env, key, v) => env.GLOW.put(key, JSON.stringify(v));

async function newSession(env, label) {
  const token = b64u(crypto.getRandomValues(new Uint8Array(32)));
  const sessions = (await getJSON(env, 'sessions', [])).slice(-9);
  sessions.push({ h: await sha(token), label: String(label || '').slice(0, 60), created: Date.now() });
  await putJSON(env, 'sessions', sessions);
  return token;
}
async function authed(req, env) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return false;
  const h = await sha(m[1]);
  return (await getJSON(env, 'sessions', [])).some(s => s.h === h);
}
async function tooManyFails(env) { const f = await getJSON(env, 'fails', { n: 0, t: 0 }); return f.n >= 8 && Date.now() - f.t < 15 * 60000; }
async function noteFail(env) { const f = await getJSON(env, 'fails', { n: 0, t: 0 }); const fresh = Date.now() - f.t > 15 * 60000; await putJSON(env, 'fails', { n: fresh ? 1 : f.n + 1, t: Date.now() }); }

function vapidOf(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_JWK) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: env.VAPID_PRIVATE_JWK };
}

async function sendToAll(env, messages) {
  const vapid = vapidOf(env); if (!vapid || !messages.length) return { sent: 0 };
  const subs = await getJSON(env, 'subs', []);
  if (!subs.length) return { sent: 0, subs: 0 };
  const subject = (await env.GLOW.get('origin')) || 'mailto:glow@invalid.example';
  let sent = 0, changed = false; const errors = [];
  const keep = [];
  for (const s of subs) {
    let gone = false;
    for (const m of messages) {
      try {
        const r = await sendPush(s.sub, m, vapid, subject);
        if (r.ok) sent++; else errors.push(r.status);
        if (r.gone) { gone = true; break; }
      } catch (e) { errors.push(String(e && e.message || e)); }
    }
    if (gone) changed = true; else keep.push(s);
  }
  if (changed) await putJSON(env, 'subs', keep);
  return { sent, subs: keep.length, errors };
}

async function api(req, env, url) {
  const path = url.pathname.replace(/^\/api/, '');
  const body = req.method === 'POST' || req.method === 'PUT' ? await req.json().catch(() => ({})) : {};

  if (path === '/status') {
    const auth = await env.GLOW.get('auth');
    return json({ ready: !!auth, push: !!vapidOf(env), vapidKey: env.VAPID_PUBLIC_KEY || null });
  }
  if (path === '/setup' && req.method === 'POST') {
    if (await env.GLOW.get('auth')) return json({ error: 'Bu GLOW için şifre zaten belirlenmiş. Giriş yap.' }, 409);
    if (!body.password || String(body.password).length < 6) return json({ error: 'Şifre en az 6 karakter olmalı.' }, 400);
    await putJSON(env, 'auth', await hashPassword(String(body.password)));
    await env.GLOW.put('origin', url.origin);
    return json({ token: await newSession(env, body.device) });
  }
  if (path === '/login' && req.method === 'POST') {
    if (await tooManyFails(env)) return json({ error: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.' }, 429);
    const auth = await getJSON(env, 'auth', null);
    if (!auth) return json({ error: 'Önce şifre belirlemen gerekiyor.' }, 404);
    const h = await hashPassword(String(body.password || ''), auth.salt);
    if (!safeEq(h.hash, auth.hash)) { await noteFail(env); return json({ error: 'Şifre yanlış.' }, 401); }
    return json({ token: await newSession(env, body.device) });
  }

  if (!(await authed(req, env))) return json({ error: 'Oturum yok ya da süresi doldu. Tekrar giriş yap.' }, 401);

  if (path === '/state' && req.method === 'GET') {
    const st = await getJSON(env, 'state', { sections: {} });
    const since = Number(url.searchParams.get('since') || 0);
    const out = {}; for (const k in st.sections) if (st.sections[k].t > since) out[k] = st.sections[k];
    return json({ sections: out, now: Date.now() });
  }
  if (path === '/state' && req.method === 'PUT') {
    const st = await getJSON(env, 'state', { sections: {} });
    let changed = false;
    for (const [k, v] of Object.entries(body.sections || {})) {
      if (!/^[a-z]{2,20}$/.test(k) || !v || typeof v.t !== 'number') continue;
      const cur = st.sections[k];
      if (!cur || v.t > cur.t) { st.sections[k] = { d: v.d, t: v.t }; changed = true; }
    }
    if (changed) await putJSON(env, 'state', st);
    const since = Number(body.since || 0);
    const out = {}; for (const k in st.sections) if (st.sections[k].t > since) out[k] = st.sections[k];
    return json({ sections: out, now: Date.now() });
  }
  if (path === '/subscribe' && req.method === 'POST') {
    const sub = body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ error: 'Geçersiz abonelik.' }, 400);
    const subs = (await getJSON(env, 'subs', [])).filter(s => s.sub.endpoint !== sub.endpoint);
    subs.push({ sub, device: String(body.device || '').slice(0, 60), created: Date.now() });
    await putJSON(env, 'subs', subs.slice(-6));
    await env.GLOW.put('origin', url.origin);
    return json({ ok: true, devices: subs.length });
  }
  if (path === '/test-push' && req.method === 'POST') {
    const r = await sendToAll(env, [{ title: '✨ GLOW', body: 'Bildirimler çalışıyor. Seni unutmayacağım.', tag: 'test', url: '/#bugun' }]);
    return json(r);
  }
  if (path === '/sessions' && req.method === 'DELETE') { await putJSON(env, 'sessions', []); return json({ ok: true }); }
  return json({ error: 'Bulunamadı' }, 404);
}

async function cron(env, scheduledTime) {
  const st = await getJSON(env, 'state', null);
  if (!st || !st.sections) return;
  const state = {}; for (const k in st.sections) state[k] = st.sections[k].d;
  const from = Math.floor(scheduledTime / 60000) * 60000;
  const due = dueBetween(state, from, from + 60000);
  if (due.length) await sendToAll(env, due.map(e => ({ title: e.title, body: e.body, tag: e.tag, url: e.url })));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); } catch (e) { return json({ error: 'Sunucu hatası: ' + (e && e.message || e) }, 500); }
    }
    return serveAsset(url);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cron(env, event.scheduledTime)); }
};
