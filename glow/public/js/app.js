import { S, load, onChange, syncNow, serverStatus, token } from './store.js';
import { A, F, I, $, setRerender, renderSheet, sheetOpen, closeSheet, disarm, esc } from './ui.js';
import { todayView } from './views/today.js';
import { programView } from './views/program.js';
import { bedenView, setBedenSub } from './views/beden.js';
import { benView, setBenSub } from './views/ben.js';
import { alanlarView, tickTimer } from './views/alanlar.js';
import { hashPin } from './views/alanlar2.js';

const TABS = [['bugun', 'Bugün', 'today'], ['program', 'Program', 'plan'], ['beden', 'Beden', 'body'], ['ben', 'Ben', 'me'], ['alanlar', 'Alanlar', 'grid']];
let tab = 'bugun', sub = '';
function readHash() {
  const [t, s] = location.hash.replace(/^#/, '').split('/');
  tab = TABS.some(x => x[0] === t) ? t : 'bugun'; sub = s || '';
  if (tab === 'beden') setBedenSub(sub || 'beslenme');
  if (tab === 'ben') setBenSub(sub || 'ilac');
}

const typed = {}; // what the user typed in the page, kept across re-renders
let raf = 0;
export function render() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const app = $('#app');
    const act = document.activeElement, actId = act && app.contains(act) ? act.id : null;
    const sel = actId && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
    const view = { bugun: todayView, program: programView, beden: bedenView, ben: benView, alanlar: () => alanlarView(sub) }[tab];
    let html; try { html = view(); } catch (e) { console.error(e); html = `<div class="card"><p>Bu sayfa açılırken bir sorun çıktı: ${esc(e.message)}</p></div>`; }
    app.innerHTML = `<div class="view">${html}</div>`;
    for (const [id, v] of Object.entries(typed)) { const el = document.getElementById(id); if (el && app.contains(el)) el.value = v; else delete typed[id]; }
    if (actId) { const el = document.getElementById(actId); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
    $('#tabs').innerHTML = TABS.map(([k, l, ic]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#${k}" ${tab === k ? 'aria-current="page"' : ''}>${I[ic]}<span>${l}</span></a>`).join('');
    if (sheetOpen()) renderSheet();
  });
}
setRerender(render);

window.addEventListener('hashchange', () => { readHash(); Object.keys(typed).forEach(k => delete typed[k]); window.scrollTo(0, 0); render(); });

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault();
  if (el.dataset.a !== 'arm') disarm();
  try { await fn(el.dataset.id, el.dataset.k, el); } catch (err) { console.error(err); }
  render();
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  f.querySelectorAll('[id]').forEach(x => delete typed[x.id]);
  const fn = F[f.dataset.form];
  try { if (fn) await fn(f, e.submitter); } catch (err) { console.error(err); }
  render();
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.input && A[el.dataset.input]) { A[el.dataset.input](el.value); if (el.closest('#sheetRoot')) renderSheet(); else render(); return; }
  if (el.id && $('#app').contains(el)) typed[el.id] = el.value;
});
document.addEventListener('change', e => { const el = e.target; if (el.dataset.change && A[el.dataset.change]) { A[el.dataset.change](el.dataset.id, el.dataset.k, el); render(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen()) { closeSheet(); render(); }
  if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'TEXTAREA' && e.target.closest('form.inline')) { e.preventDefault(); e.target.closest('form').requestSubmit(); }
});

/* lock screen */
let pinBuf = '';
const unlocked = () => { try { return sessionStorage.getItem('glow.unlocked') === '1'; } catch (e) { return false; } };
function showLock() {
  if (!S.settings.pin || unlocked()) { $('#lock').hidden = true; return; }
  const l = $('#lock'); l.hidden = false; pinBuf = '';
  l.innerHTML = `<div class="lockin"><div class="logo">GLOW</div><p class="muted">Şifreni gir</p><div class="pins">${[0, 1, 2, 3].map(i => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join('')}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-pin="${k}">${k}</button>`).join('')}</div></div>`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-pin]'); if (!b) return;
  const k = b.dataset.pin;
  pinBuf = k === '⌫' ? pinBuf.slice(0, -1) : (pinBuf + k).slice(0, 4);
  document.querySelectorAll('.pins i').forEach((x, i) => x.classList.toggle('on', i < pinBuf.length));
  if (pinBuf.length === 4) {
    if (await hashPin(pinBuf) === S.settings.pin) { try { sessionStorage.setItem('glow.unlocked', '1'); } catch (er) { } $('#lock').hidden = true; }
    else { $('.pins').classList.add('shake'); setTimeout(() => { pinBuf = ''; showLock(); }, 450); }
  }
});
A.lockNow = () => { try { sessionStorage.removeItem('glow.unlocked'); } catch (e) { } showLock(); };
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else { if (hiddenAt && Date.now() - hiddenAt > 5 * 60000) { try { sessionStorage.removeItem('glow.unlocked'); } catch (e) { } showLock(); } render(); }
});

/* boot */
load();
readHash();
onChange(render);
render();
showLock();
$('#fab').innerHTML = I.plus;
setInterval(() => { if (tab === 'alanlar' && sub === 'okul') tickTimer(); }, 1000);
let lastMin = '';
setInterval(() => { const m = new Date().getMinutes(); if (m !== lastMin) { lastMin = m; if (tab === 'bugun' && !sheetOpen() && !document.activeElement.matches('input,textarea')) render(); } }, 15000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
serverStatus().then(() => { if (token()) syncNow(true); render(); });
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.url) { location.hash = (e.data.url.split('#')[1] || 'bugun'); } });
