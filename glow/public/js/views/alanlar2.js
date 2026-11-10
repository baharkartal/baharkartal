import { S, save, today, sync, token, setup, login, logout, syncNow, serverStatus, enablePush, pushEnabled, pushSupported, isStandalone, testPush, replaceAll } from '../store.js';
import { addDaysKey, mondayKey, isoWeek, diffDays } from '../schedule.js';
import { A, F, esc, uid, I, ic, check, empty, head, seg, bar, fmtShort, fmtDay, fmtLong, openSheet, sheetHead, closeSheet, renderSheet, toast, val, num, del, copyText, minsLabel } from '../ui.js';
import { weekSummary, rewardProgress, suggestedTargets } from '../calc.js';
import { SECTIONS } from '../defaults.js';

/* ---------------- notes ---------------- */
let nSeg = 'unutma';
const LISTS = [['unutma', 'Unutma'], ['not', 'Notlar'], ['yap', 'Yapılacak'], ['al', 'Alınacak']];
export function notesView() {
  const items = S.notes.items.filter(n => n.list === nSeg);
  const ph = { unutma: 'Unutmaman gereken bir şey…', not: 'Aklına gelen…', yap: 'Yapılacak bir iş…', al: 'Almak istediğin bir şey…' }[nSeg];
  let body;
  if (nSeg === 'not') {
    body = items.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.created - a.created).map(n => `<div class="card notec"><div class="grow"><div class="t pre">${esc(n.text)}</div><div class="small muted">${esc(new Date(n.created).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div></div>
      <button class="iconbtn ${n.pinned ? 'pinned' : ''}" data-a="nPin" data-id="${n.id}" aria-label="Sabitle">${I.pin}</button><button class="iconbtn" data-a="nDel" data-id="${n.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || `<div class="card">${empty('Henüz not yok.')}</div>`;
  } else {
    const open = items.filter(n => !n.done), done = items.filter(n => n.done);
    body = `<div class="list">${open.map(nRow).join('') || empty(nSeg === 'unutma' ? 'Buraya eklediklerin Bugün sayfasının en üstünde durur. Bitince kaldırırsın.' : 'Liste boş.')}</div>
      ${done.length ? `<div class="sec-h"><span class="small muted">Tamamlananlar (${done.length})</span><button class="linkbtn" data-a="nClear">Temizle</button></div><div class="list">${done.slice(-20).map(nRow).join('')}</div>` : ''}`;
  }
  return `${seg(LISTS.map(([k, l]) => [k, `${l} <span class="muted tnum">${S.notes.items.filter(n => n.list === k && !n.done).length}</span>`]), nSeg, 'nSeg')}
  <form class="inline" data-form="noteAdd">${nSeg === 'not' ? `<textarea class="inp" id="nText" rows="2" placeholder="${ph}"></textarea>` : `<input class="inp" id="nText" placeholder="${ph}" autocomplete="off">`}<button class="btn" type="submit">Ekle</button></form>
  <div class="stack-s">${body}</div>`;
}
const nRow = n => `<div class="row ${n.done ? 'done' : ''}">${check(n.done, 'nToggle', n.id, null, n.text, true)}<span class="grow t">${esc(n.text)}</span><button class="iconbtn" data-a="nDel" data-id="${n.id}" aria-label="Sil">${I.trash}</button></div>`;
A.nSeg = s => { nSeg = s; };
A.nPin = id => { const n = S.notes.items.find(x => x.id === id); n.pinned = !n.pinned; save('notes'); };
A.nDel = id => { const i = S.notes.items.findIndex(x => x.id === id); const [n] = S.notes.items.splice(i, 1); save('notes'); toast('Silindi', () => { S.notes.items.splice(i, 0, n); save('notes'); }); };
A.nClear = () => { const before = S.notes.items.slice(); S.notes.items = S.notes.items.filter(n => !(n.list === nSeg && n.done)); save('notes'); toast('Temizlendi', () => { S.notes.items = before; save('notes'); }); };
F.noteAdd = () => { const v = val('nText').trim(); if (!v) return; S.notes.items.push({ id: uid(), list: nSeg, text: v, created: Date.now(), done: false, pinned: false }); save('notes'); document.getElementById('nText').value = ''; };

/* ---------------- goals & rewards ---------------- */
const GAREAS = { okul: 'Okul', ingilizce: 'İngilizce', spor: 'Spor & beslenme', gelir: 'Gelir', kisisel: 'Kişisel', bakim: 'Kendine özen' };
const RTYPES = { spor: 'Üst üste haftalık spor hedefi (hafta)', ilac: 'Üst üste tüm ilaçlar (gün)', ingilizce: 'Üst üste İngilizce (gün)', manual: 'Kendim sayarım' };
export function goalsView() {
  const k = today();
  return `
  <section class="stack-s">${head('Hedeflerim', `<button class="btn sm" data-a="goalEdit" data-id="">+ Hedef</button>`)}
    ${S.goals.items.map(g => { const n = g.milestones.length, d = g.milestones.filter(m => m.done).length; const dl = g.deadline ? diffDays(k, g.deadline) : null; const next = g.milestones.find(m => !m.done);
      return `<button class="gcard" data-a="goalView" data-id="${g.id}"><span class="small muted">${esc(GAREAS[g.area] || '')}</span><span class="gt">${esc(g.title)}</span>${bar(n ? d / n * 100 : 0)}
        <span class="gm"><span class="tnum">${d}/${n} adım</span>${dl != null ? `<span class="chip ${dl < 0 ? 'danger' : dl < 14 ? 'warn' : ''}">${dl < 0 ? `${-dl} gün geçti` : `${dl} gün kaldı`}</span>` : ''}</span>
        ${next ? `<span class="small"><span class="muted">Sıradaki: </span>${esc(next.text)}</span>` : ''}</button>`; }).join('') || `<div class="card">${empty('Henüz hedef yok.')}</div>`}
  </section>
  <section class="stack-s">${head('Ödüllerim', `<button class="btn sm" data-a="rewardEdit" data-id="">+ Ödül</button>`)}
    <p class="small muted">Kendine söz ver: bunu başarınca bunu hak ediyorsun. İlerleme kendiliğinden hesaplanır.</p>
    <div class="list">${S.goals.rewards.map(r => { const p = rewardProgress(r), ok = p.cur >= r.target;
      return `<div class="row ${r.claimed ? 'done' : ''}">${ic('gift')}<button class="grow pickt" data-a="rewardEdit" data-id="${r.id}"><span class="t">${esc(r.text)}</span><span class="small muted tnum">${Math.min(p.cur, r.target)}/${r.target} · ${esc(p.unit)}</span>${bar(p.cur / r.target * 100)}</button>
        ${r.claimed ? '<span class="chip acc">Alındı</span>' : ok ? `<button class="btn sm" data-a="rewardClaim" data-id="${r.id}">Ödülümü aldım</button>` : r.type === 'manual' ? `<button class="iconbtn sm acc" data-a="rewardInc" data-id="${r.id}" aria-label="Bir adım ekle">${I.plus}</button>` : ''}</div>`; }).join('') || empty('Henüz ödül yok.')}</div>
  </section>`;
}
let goalId = null, goalEditing = false, gArea = 'kisisel';
function goalSheet() {
  const g = S.goals.items.find(x => x.id === goalId);
  if (g && !goalEditing) {
    const n = g.milestones.length, d = g.milestones.filter(m => m.done).length;
    return `${sheetHead(esc(g.title), esc(GAREAS[g.area] || '') + (g.deadline ? ' · ' + esc(fmtDay(g.deadline)) : ''))}
    ${g.why ? `<div class="card"><span class="lbl">Neden istiyorum?</span><p>${esc(g.why)}</p></div>` : ''}
    ${bar(n ? d / n * 100 : 0)}
    <div class="list">${g.milestones.map(m => `<div class="row ${m.done ? 'done' : ''}">${check(m.done, 'msToggle', m.id, null, m.text, true)}<span class="grow t">${esc(m.text)}</span><button class="iconbtn" data-a="msDel" data-id="${m.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Henüz adım yok.')}</div>
    <form class="inline" data-form="msAdd"><input class="inp" id="msText" placeholder="Yeni adım" autocomplete="off"><button class="btn" type="submit">Ekle</button></form>
    <div class="inline"><button class="btn ghost grow" data-a="goalEdit" data-id="${g.id}">Düzenle</button>${del('goalDel', g.id)}</div>`;
  }
  const x = g || { title: '', why: '', deadline: '' };
  return `${sheetHead(g ? 'Hedefi düzenle' : 'Yeni hedef')}<form data-form="goalSave" class="stack">
    <div class="field"><label for="gTitle">Hedef</label><input class="inp" id="gTitle" required value="${esc(x.title)}"></div>
    <div class="field"><span class="lbl">Alan</span><div class="chips wrap">${Object.entries(GAREAS).map(([a, l]) => `<button type="button" class="fchip ${gArea === a ? 'on' : ''}" data-a="gArea" data-id="${a}">${l}</button>`).join('')}</div></div>
    <div class="field"><label for="gWhy">Neden istiyorsun?</label><textarea class="inp" id="gWhy" rows="2" placeholder="Zorlandığında bunu okuyacaksın.">${esc(x.why)}</textarea></div>
    <div class="field"><label for="gDl">Son tarih (isteğe bağlı)</label><input class="inp" id="gDl" type="date" value="${esc(x.deadline || '')}"></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
const goal = () => S.goals.items.find(x => x.id === goalId);
A.goalView = id => { goalId = id; goalEditing = false; openSheet(goalSheet); };
A.goalEdit = id => { goalId = id || null; goalEditing = true; gArea = goal() ? goal().area : 'kisisel'; if (document.getElementById('sheetBody')) renderSheet(); else openSheet(goalSheet); };
A.gArea = a => { gArea = a; renderSheet(); };
F.goalSave = () => { const data = { title: val('gTitle').trim(), area: gArea, why: val('gWhy').trim(), deadline: val('gDl') }; if (!data.title) return; const g = goal(); if (g) Object.assign(g, data); else { goalId = uid(); S.goals.items.push({ id: goalId, milestones: [], ...data }); } goalEditing = false; save('goals'); renderSheet(); };
A.goalDel = id => { S.goals.items = S.goals.items.filter(x => x.id !== id); save('goals'); closeSheet(); };
A.msToggle = id => { const m = goal().milestones.find(x => x.id === id); m.done = !m.done; save('goals'); renderSheet(); if (m.done) toast('Bir adım daha!'); };
A.msDel = id => { goal().milestones = goal().milestones.filter(x => x.id !== id); save('goals'); renderSheet(); };
F.msAdd = () => { const v = val('msText').trim(); if (!v) return; goal().milestones.push({ id: uid(), text: v, done: false }); save('goals'); document.getElementById('msText').dataset.fresh = '1'; renderSheet(); };

let rewId = null, rType = 'spor';
function rewardSheet() {
  const r = S.goals.rewards.find(x => x.id === rewId) || { text: '', target: 4 };
  return `${sheetHead(rewId ? 'Ödülü düzenle' : 'Yeni ödül')}<form data-form="rewardSave" class="stack">
    <div class="field"><label for="rwText">Ödül</label><input class="inp" id="rwText" required value="${esc(r.text)}" placeholder="ör. Yeni spor tayt"></div>
    <div class="field"><span class="lbl">Ne zaman hak ediyorum?</span><div class="radios">${Object.entries(RTYPES).map(([t, l]) => `<button type="button" class="radio ${rType === t ? 'on' : ''}" data-a="rType" data-id="${t}"><span class="rd"></span><span class="d">${l}</span></button>`).join('')}</div></div>
    ${rType === 'manual' ? `<div class="field"><label for="rwUnit">Neyi sayıyorsun?</label><input class="inp" id="rwUnit" value="${esc(r.unit || '')}" placeholder="ör. evde yemek yaptığım gün"></div>` : ''}
    <div class="field"><label for="rwTarget">Hedef sayı</label><input class="inp" id="rwTarget" type="number" min="1" value="${r.target}"></div>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${rewId ? del('rewardDel', rewId) : ''}`;
}
A.rewardEdit = id => { rewId = id || null; const r = S.goals.rewards.find(x => x.id === rewId); rType = r ? r.type : 'spor'; openSheet(rewardSheet); };
A.rType = t => { rType = t; renderSheet(); };
F.rewardSave = () => { const data = { text: val('rwText').trim(), type: rType, target: Math.max(1, num('rwTarget') || 1) }; if (rType === 'manual') data.unit = val('rwUnit').trim(); if (!data.text) return; const r = S.goals.rewards.find(x => x.id === rewId); if (r) Object.assign(r, data); else S.goals.rewards.push({ id: uid(), claimed: false, cur: 0, ...data }); save('goals'); closeSheet(); };
A.rewardDel = id => { S.goals.rewards = S.goals.rewards.filter(x => x.id !== id); save('goals'); closeSheet(); };
A.rewardInc = id => { const r = S.goals.rewards.find(x => x.id === id); r.cur = (r.cur || 0) + 1; save('goals'); };
A.rewardClaim = id => { const r = S.goals.rewards.find(x => x.id === id); r.claimed = true; save('goals'); toast('Hak ettin. Tadını çıkar! ✨'); };

/* ---------------- weekly review ---------------- */
let revOff = 0;
export function reviewView() {
  const mon = addDaysKey(mondayKey(today()), revOff * 7), wk = isoWeek(mon);
  const s = weekSummary(mon), r = S.review.weeks[wk] || {};
  const pr = r.nextPrios || ['', '', ''];
  const line = (l, v) => `<div class="kv"><span class="muted">${l}</span><b class="tnum">${v}</b></div>`;
  const past = Object.keys(S.review.weeks).filter(w => S.review.weeks[w].done && w !== wk).sort().reverse().slice(0, 6);
  return `
  <div class="sec-h"><button class="iconbtn" data-a="revNav" data-id="-1" aria-label="Önceki hafta">${I.back}</button><b>${esc(fmtShort(mon))} – ${esc(fmtShort(addDaysKey(mon, 6)))}</b><button class="iconbtn" data-a="revNav" data-id="1" ${revOff >= 0 ? 'disabled' : ''} aria-label="Sonraki hafta">${I.chev}</button></div>
  <div class="card stack-xs"><span class="lbl">Haftanın özeti</span>
    ${line('Spor', `${s.workouts}/${s.workoutTarget} gün${s.walkMin ? ` · ${s.walkMin} dk yürüyüş` : ''}`)}
    ${line('İlaç düzeni', s.medPct == null ? '–' : '%' + s.medPct)}
    ${line('Ortalama ruh hali', s.mood == null ? '–' : s.mood + ' / 5')}
    ${line('Ortalama uyku', s.sleep == null ? '–' : s.sleep + ' saat')}
    ${line('Kalori / protein (ort.)', s.kcal == null ? '–' : `${s.kcal} kcal · ${s.protein} g (${s.foodDays} gün kayıt)`)}
    ${line('Kilo (haftalık ort.)', s.weight == null ? '–' : `${s.weight} kg${s.weightPrev != null ? ` (${s.weight - s.weightPrev > 0 ? '+' : ''}${Math.round((s.weight - s.weightPrev) * 10) / 10})` : ''}`)}
    ${line('İngilizce', `${s.english}/${s.days} gün`)}
    ${line('Bakım rutinleri', s.care == null ? '–' : '%' + Math.round(s.care))}
    ${s.study.map(c => line(c.name, `${minsLabel(c.min)}${c.target ? ' / ' + minsLabel(c.target) : ''}`)).join('')}
    ${line('Yeme isteği kaydı', s.cravings)}${s.hard ? line('Zor gün', s.hard) : ''}
  </div>
  <form data-form="reviewSave" class="stack">
    <div class="field"><label for="rvGood">Bu hafta ne iyi gitti?</label><textarea class="inp" id="rvGood" rows="2">${esc(r.good || '')}</textarea></div>
    <div class="field"><label for="rvHard">Ne zorladı?</label><textarea class="inp" id="rvHard" rows="2">${esc(r.hard || '')}</textarea></div>
    <div class="field"><label for="rvLearn">Kendime bir not</label><textarea class="inp" id="rvLearn" rows="2" placeholder="ör. Akşam spor yerine öğlen daha iyi oluyor.">${esc(r.learn || '')}</textarea></div>
    <div class="field"><span class="lbl">Gelecek haftanın 3 önceliği (Bugün sayfasında görünür)</span>${[0, 1, 2].map(i => `<input class="inp" id="rvP${i}" value="${esc(pr[i] || '')}" placeholder="${i + 1}.">`).join('')}</div>
    <button class="btn block" type="submit">Kaydet</button>
  </form>
  <div class="card stack-xs"><h3>${ic('copy', 'xs')} Claude'a gönder</h3><p class="small muted">Haftanın özetini kopyalar. Claude sohbetine yapıştır; birlikte yorumlayıp programını düzenleriz.</p><button class="btn ghost" data-a="copyWeek">Özeti kopyala</button></div>
  ${past.length ? `<section class="stack-s">${head('Önceki değerlendirmeler')}<div class="list">${past.map(w => `<div class="row"><div class="grow"><div class="small muted">${esc(w)}</div><div class="t">${esc(S.review.weeks[w].good || '')}</div></div></div>`).join('')}</div></section>` : ''}`;
}
A.revNav = d => { revOff = Math.min(0, revOff + Number(d)); };
F.reviewSave = () => {
  const mon = addDaysKey(mondayKey(today()), revOff * 7), wk = isoWeek(mon);
  const s = weekSummary(mon);
  S.review.weeks[wk] = { done: true, good: val('rvGood').trim(), hard: val('rvHard').trim(), learn: val('rvLearn').trim(), nextPrios: [0, 1, 2].map(i => val('rvP' + i).trim()), stats: s, saved: Date.now() };
  // priorities apply to the following week too
  const nextWk = isoWeek(addDaysKey(mon, 7));
  S.review.weeks[nextWk] = { ...(S.review.weeks[nextWk] || {}), nextPrios: S.review.weeks[wk].nextPrios };
  save('review'); toast('Kaydedildi. Harika bir alışkanlık!');
};
A.copyWeek = async () => {
  const mon = addDaysKey(mondayKey(today()), revOff * 7), s = weekSummary(mon), r = S.review.weeks[isoWeek(mon)] || {};
  const t = `GLOW haftalık özetim (${fmtShort(mon)} – ${fmtShort(addDaysKey(mon, 6))})
- Spor: ${s.workouts}/${s.workoutTarget} gün${s.walkMin ? `, ${s.walkMin} dk yürüyüş` : ''}
- İlaç düzeni: ${s.medPct ?? '-'}%
- Ruh hali ort.: ${s.mood ?? '-'}/5, uyku ort.: ${s.sleep ?? '-'} saat${s.hard ? `, zor gün: ${s.hard}` : ''}
- Beslenme ort.: ${s.kcal ?? '-'} kcal, ${s.protein ?? '-'} g protein (hedef ${s.targets.kcal} kcal, ${s.targets.p} g), ${s.foodDays} gün kayıt, yeme isteği: ${s.cravings}
- Kilo ort.: ${s.weight ?? '-'} kg${s.weightPrev != null && s.weight != null ? ` (önceki hafta ${s.weightPrev})` : ''}
- İngilizce: ${s.english}/${s.days} gün
- Bakım rutinleri: ${s.care == null ? '-' : Math.round(s.care) + '%'}
- Ders: ${s.study.map(c => `${c.name} ${minsLabel(c.min)}${c.target ? '/' + minsLabel(c.target) : ''}`).join(', ')}
İyi giden: ${r.good || '-'}
Zorlayan: ${r.hard || '-'}
Not: ${r.learn || '-'}
Gelecek hafta öncelikleri: ${(r.nextPrios || []).filter(Boolean).join('; ') || '-'}

Bu haftama bakıp bana yorum yapar ve gelecek hafta için programımı düzenlememe yardım eder misin?`;
  toast(await copyText(t) ? 'Kopyalandı. Claude sohbetine yapıştırabilirsin.' : 'Kopyalanamadı.');
};

/* ---------------- settings ---------------- */
export function settingsView() {
  const s = S.settings, t = s.targets, st = suggestedTargets();
  const loggedIn = !!token();
  return `
  <section class="stack-s">${head('Eşitleme ve bildirimler')}
    <div class="card stack-s">
      ${loggedIn ? `<p class="small">${sync.status === 'ok' ? `Bağlı. Son eşitleme ${new Date(sync.last).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}.` : esc(sync.message || 'Bağlanıyor…')}</p>
        <div class="inline"><button class="btn ghost grow" data-a="syncNow">Şimdi eşitle</button><button class="btn ghost grow" data-a="logout">Bu cihazdan çık</button></div>`
      : `<p class="small">Telefon ve bilgisayarının aynı verileri görmesi ve bildirim alabilmen için bir GLOW şifresi gerekiyor. İlk cihazda şifreni belirle, diğerinde aynı şifreyle giriş yap.</p>
        <form data-form="auth" class="stack-s"><input class="inp" id="pw" type="password" autocomplete="current-password" placeholder="GLOW şifren (en az 6 karakter)" minlength="6" required>
        <div class="inline"><button class="btn grow" type="submit" data-mode="setup">İlk kez: şifre belirle</button><button class="btn ghost grow" type="submit" data-mode="login">Giriş yap</button></div></form>
        ${sync.message ? `<p class="small neg">${esc(sync.message)}</p>` : ''}`}
      <hr>
      ${pushEnabled() ? `<p class="small">${ic('bell', 'xs')} Bildirimler bu cihazda açık.</p><button class="btn ghost" data-a="testPush">Deneme bildirimi gönder</button>`
      : !isStandalone() && /iPhone|iPad/.test(navigator.userAgent) ? `<div class="stack-xs"><p class="small"><b>iPhone'da bildirim için:</b></p><ol class="small plain-ol"><li>Bu sayfayı <b>Safari</b>'de aç.</li><li>Alttaki <b>Paylaş</b> düğmesine dokun.</li><li><b>Ana Ekrana Ekle</b>'yi seç.</li><li>Ana ekrandaki GLOW simgesinden aç ve buraya geri gel.</li></ol></div>`
      : `<button class="btn" data-a="enablePush" ${loggedIn ? '' : 'disabled'}>${ic('bell', 'xs')} Bildirimleri aç</button>${!loggedIn ? '<p class="small muted">Önce şifreni belirle ya da giriş yap.</p>' : ''}${!pushSupported() ? '<p class="small muted">Bu tarayıcı bildirimleri desteklemiyor.</p>' : ''}`}
    </div>
  </section>

  <form data-form="settingsSave" class="stack">
    ${head('Profil ve uyku')}
    <div class="card stack-s">
      <div class="inline"><div class="field grow"><label for="sName">Adın</label><input class="inp" id="sName" value="${esc(s.name)}"></div><div class="field grow"><label for="sHeight">Boy (cm)</label><input class="inp" id="sHeight" type="number" value="${s.height}"></div></div>
      <div class="inline"><div class="field grow"><label for="sWake">Kalkış</label><input class="inp" id="sWake" type="time" value="${s.wake}"></div><div class="field grow"><label for="sBed">Yatış</label><input class="inp" id="sBed" type="time" value="${s.bed}"></div></div>
    </div>
    ${head('Beslenme ve spor hedefleri')}
    <div class="card stack-s">
      <div class="grid4"><div class="field"><label for="tK">kcal</label><input class="inp" id="tK" type="number" value="${t.kcal}"></div><div class="field"><label for="tP">Protein</label><input class="inp" id="tP" type="number" value="${t.p}"></div><div class="field"><label for="tC">Karb.</label><input class="inp" id="tC" type="number" value="${t.c}"></div><div class="field"><label for="tF">Yağ</label><input class="inp" id="tF" type="number" value="${t.f}"></div></div>
      <p class="small muted">Önerilen: ${st.kcal} kcal · P ${st.p} · K ${st.c} · Y ${st.f}</p>
      <div class="inline"><div class="field grow"><label for="tW">Su (bardak)</label><input class="inp" id="tW" type="number" value="${t.water}"></div><div class="field grow"><label for="sWo">Spor (gün/hafta)</label><input class="inp" id="sWo" type="number" min="1" max="7" value="${s.workoutTarget}"></div><div class="field grow"><label for="sGoalW">Hedef kilo</label><input class="inp" id="sGoalW" type="number" step="0.1" value="${s.goalWeight ?? ''}"></div></div>
    </div>
    ${head('Bildirim saatleri')}
    <div class="card stack-s">
      <div class="inline"><div class="field grow"><label for="sDig">Hatırlatma özeti</label><input class="inp" id="sDig" type="time" value="${s.digestTime}"></div><div class="field grow"><label for="sMood">Ruh hali</label><input class="inp" id="sMood" type="time" value="${s.moodTime}"></div></div>
      <div class="inline"><div class="field grow"><label for="sCm">Sabah bakımı</label><input class="inp" id="sCm" type="time" value="${s.careMorning}"></div><div class="field grow"><label for="sCd">Gün içi bakım</label><input class="inp" id="sCd" type="time" value="${s.careDay}"></div><div class="field grow"><label for="sCn">Gece bakımı</label><input class="inp" id="sCn" type="time" value="${s.careNight}"></div></div>
      <label class="toggle"><input type="checkbox" id="sWater" ${s.waterReminders ? 'checked' : ''}><span>Su hatırlatmaları (12:00, 15:30, 18:30; hedefin gerisindeysen)</span></label>
      <p class="small muted">İlaç saatlerini Ben → İlaç'tan, program bildirimlerini her bloğun içinden ayarlarsın.</p>
    </div>
    ${head('Dönem')}
    <div class="card stack-s"><div class="inline"><div class="field grow"><label for="sFin">Finallerin başlangıcı</label><input class="inp" id="sFin" type="date" value="${s.finalsDate}"></div><div class="field grow"><label for="sFinFrom">Final modu başlasın</label><input class="inp" id="sFinFrom" type="date" value="${s.finalFrom}"></div></div></div>
    <button class="btn block" type="submit">Ayarları kaydet</button>
  </form>

  <section class="stack-s">${head('Uygulama kilidi')}
    <div class="card stack-s"><p class="small muted">İlaç ve ruh hali bilgilerin var. Telefonunu biri eline aldığında görmesin diye 4 haneli şifre koyabilirsin. Uygulama açılışta ve 5 dakika arka planda kaldıktan sonra kilitlenir.</p>
      ${s.pin ? `<button class="btn ghost" data-a="pinOff">Kilidi kaldır</button>` : `<form class="inline" data-form="pinSet"><input class="inp" id="pinNew" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="4 haneli şifre" autocomplete="new-password"><button class="btn" type="submit">Kilidi aç</button></form>`}
    </div></section>

  <section class="stack-s">${head('Yedek')}
    <div class="card stack-s"><p class="small muted">Bütün verilerini tek bir dosya olarak indir. Ayda bir indirmen yeterli.</p>
      <div class="inline"><button class="btn ghost grow" data-a="backup">Yedeği indir</button><label class="btn ghost grow filebtn">Yedekten yükle<input type="file" id="restoreFile" accept="application/json,.json" data-change="restore"></label></div></div></section>
  <p class="small muted center">GLOW · senin için yapıldı ✨</p>`;
}
F.auth = async (form, submitter) => {
  const pw = val('pw'); if (pw.length < 6) { toast('Şifre en az 6 karakter olmalı.'); return; }
  const mode = submitter && submitter.dataset.mode || 'login';
  try { if (mode === 'setup') await setup(pw); else await login(pw); toast(mode === 'setup' ? 'Şifren belirlendi. Şimdi bildirimleri açabilirsin.' : 'Giriş yapıldı, verilerin geldi.'); }
  catch (e) { toast(e.message || 'Olmadı, tekrar dener misin?'); }
};
A.syncNow = () => syncNow(true);
A.logout = () => { logout(); toast('Bu cihazdan çıkış yapıldı. Verilerin cihazda duruyor.'); };
A.enablePush = async () => { try { await enablePush(); toast('Bildirimler açıldı. Bir deneme bildirimi gönderiyorum.'); await testPush(); } catch (e) { toast(e.message); } };
A.testPush = async () => { try { const r = await testPush(); toast(r.sent ? 'Gönderildi. Birkaç saniye içinde gelmeli.' : 'Gönderilemedi. Bildirimleri kapatıp yeniden açmayı dene.'); } catch (e) { toast(e.message); } };
F.settingsSave = () => {
  const s = S.settings;
  Object.assign(s, { name: val('sName').trim() || 'Bahar', height: num('sHeight') || s.height, wake: val('sWake') || s.wake, bed: val('sBed') || s.bed, workoutTarget: Math.max(1, Math.min(7, num('sWo') || 4)), goalWeight: num('sGoalW'),
    digestTime: val('sDig') || s.digestTime, moodTime: val('sMood') || s.moodTime, careMorning: val('sCm') || s.careMorning, careDay: val('sCd') || s.careDay, careNight: val('sCn') || s.careNight,
    waterReminders: document.getElementById('sWater').checked, finalsDate: val('sFin') || s.finalsDate, finalFrom: val('sFinFrom') || s.finalFrom });
  Object.assign(s.targets, { kcal: num('tK') || s.targets.kcal, p: num('tP') || s.targets.p, c: num('tC') || s.targets.c, f: num('tF') || s.targets.f, water: num('tW') || s.targets.water });
  save('settings'); toast('Ayarlar kaydedildi');
};
export const hashPin = async pin => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('glow:' + pin)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); };
F.pinSet = async () => { const p = val('pinNew'); if (!/^\d{4}$/.test(p)) { toast('4 rakam gir.'); return; } S.settings.pin = await hashPin(p); save('settings'); try { sessionStorage.setItem('glow.unlocked', '1'); } catch (e) { } toast('Kilit açıldı. Şifreni unutma!'); };
A.pinOff = () => { S.settings.pin = null; save('settings'); toast('Kilit kaldırıldı'); };
A.backup = () => {
  const o = {}; for (const k of SECTIONS) o[k] = S[k];
  const blob = new Blob([JSON.stringify({ app: 'glow', v: 1, at: new Date().toISOString(), data: o }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `glow-yedek-${today()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
A.restore = async (_, __, el) => {
  const f = el.files && el.files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (j.app !== 'glow' || !j.data) throw new Error(); replaceAll(j.data); toast('Yedek yüklendi'); }
  catch (e) { toast('Bu dosya bir GLOW yedeği değil.'); }
  el.value = '';
};
