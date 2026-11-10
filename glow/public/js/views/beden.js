import { S, save, today } from '../store.js';
import { addDaysKey, mondayKey, dowOf, diffDays } from '../schedule.js';
import { A, F, esc, uid, I, ic, check, ring, bar, empty, head, seg, fmtShort, fmtLong, DOW, WEEK_ORDER, DOW_LONG, openSheet, sheetHead, closeSheet, renderSheet, sheetOpen, toast, val, num, r1, del, barChart, lineChart, lastNDays, nowHm } from '../ui.js';
import { foodDay, workoutDaysInWeek, weeklyAvgWeights, lastWeight, suggestedTargets, avg, age } from '../calc.js';

let sub = 'beslenme';
export const setBedenSub = s => { if (['beslenme', 'spor', 'olcu', 'plan'].includes(s)) sub = s; };
const MEALS = [['kahvalti', 'Kahvaltı'], ['ogle', 'Öğle'], ['aksam', 'Akşam'], ['ara', 'Ara öğün']];

export function bedenView() {
  return `<div><p class="eyebrow">Yağ kaybı · kası koru</p><h1>Beden</h1></div>
  ${seg([['beslenme', 'Beslenme'], ['plan', 'Yemek planı'], ['spor', 'Spor'], ['olcu', 'Ölçüler']], sub, 'bSub')}
  ${({ beslenme: nutrition, plan: mealPlan, spor: sport, olcu: measures })[sub]()}`;
}
A.bSub = s => { sub = s; history.replaceState(null, '', '#beden/' + s); };

/* ---------------- nutrition ---------------- */
function macroTile(label, v, t, unit) {
  const p = t ? v / t * 100 : 0;
  return `<div class="macro">${ring(p, 64, 6, Math.round(v))}<span class="small"><b>${label}</b></span><span class="small muted tnum">${t ? `/ ${t}${unit}` : ''}</span></div>`;
}
function nutrition() {
  const k = today(), d = foodDay(k), t = S.settings.targets, water = S.food.water[k] || 0;
  const left = t.kcal - Math.round(d.kcal);
  const days = lastNDays(k, 7);
  const kc = days.map(x => Math.round(foodDay(x).kcal)), pr = days.map(x => Math.round(foodDay(x).p));
  const cr = S.food.cravings.filter(c => c.date >= addDaysKey(k, -13));
  const reasons = {}; cr.forEach(c => { reasons[c.kind] = (reasons[c.kind] || 0) + 1; });
  return `
  <div class="card stack-s">
    <div class="sec-h"><h3>Bugün</h3><span class="small ${left < 0 ? 'neg' : 'muted'} tnum">${left >= 0 ? `${left} kcal kaldı` : `${-left} kcal fazla`}</span></div>
    <div class="macros">${macroTile('Kalori', d.kcal, t.kcal, '')}${macroTile('Protein', d.p, t.p, ' g')}${macroTile('Karb.', d.c, t.c, ' g')}${macroTile('Yağ', d.f, t.f, ' g')}</div>
  </div>
  <div class="card water"><div class="grow stack-xs"><div class="sec-h"><h3>Su</h3><span class="small muted tnum">${water}/${t.water} bardak</span></div>
    <div class="glasses">${Array.from({ length: Math.max(t.water, water) }, (_, i) => `<i class="${i < water ? 'on' : ''}"></i>`).join('')}</div></div>
    <button class="iconbtn sm" data-a="water" data-id="-1" aria-label="Bir bardak çıkar">−</button><button class="iconbtn sm acc" data-a="water" data-id="1" aria-label="Bir bardak ekle">${I.plus}</button></div>

  ${MEALS.map(([m, l]) => { const items = d.items.filter(i => i.meal === m); const kcal = items.reduce((a, i) => a + i.kcal, 0);
    return `<section class="stack-s">${head(l, `<span class="meta tnum">${Math.round(kcal)} kcal</span>`)}
    <div class="list">${items.map(i => `<div class="row"><div class="grow"><div class="t">${esc(i.name)}${i.qty && i.qty !== 1 ? ` <span class="muted">× ${i.qty}</span>` : ''}</div><div class="small muted tnum">${Math.round(i.kcal)} kcal · P ${r1(i.p)} · K ${r1(i.c)} · Y ${r1(i.f)}</div></div><button class="iconbtn" data-a="foodDel" data-id="${i.id}" aria-label="Sil">${I.trash}</button></div>`).join('')}
      <button class="row addrow" data-a="foodAdd" data-id="${m}">${ic('plus', 'xs')} Ekle</button></div></section>`; }).join('')}

  <section class="stack-s">
    ${head('Yeme isteği geldi', `<button class="btn sm" data-a="craving">Kaydet</button>`)}
    <p class="small muted">Canın bir şey yemek istediğinde önce buraya dokun. Nedenini fark etmek, isteği yönetmenin ilk adımı.</p>
    ${cr.length ? `<div class="card stack-xs"><span class="small muted">Son 14 gün: ${cr.length} kez</span>${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => `<div class="drow"><span class="dl">${esc(CRAVE[r] || r)}</span><span class="dbar"><i style="width:${n / cr.length * 100}%"></i></span><span class="dv tnum">${n}</span></div>`).join('')}</div>` : ''}
  </section>

  <section class="stack-s">${head('Son 7 gün')}
    <div class="card stack-s"><span class="small muted">Kalori</span>${barChart(kc, { labels: days.map(x => DOW[dowOf(x)]), target: t.kcal })}
    <span class="small muted">Protein (g)</span>${barChart(pr, { labels: days.map(x => DOW[dowOf(x)]), target: t.p })}</div>
  </section>
  <p class="small muted">Değerler yaklaşık. Hedeflerini Alanlar → Ayarlar'dan değiştirebilirsin.</p>`;
}
const CRAVE = { ac: 'Gerçekten açım', sikildim: 'Sıkıldım', stres: 'Stresliyim / kaygılıyım', uzgun: 'Üzgünüm', yorgun: 'Yorgunum / uykusuzum', aliskanlik: 'Alışkanlık (saat geldi, ekran başı…)' };
const CRAVE_TIP = {
  ac: 'Gerçek açlık normal. Proteinli bir şey seç: yoğurt, yumurta, ton balığı, lor. Öğün saatin yakınsa öğünü öne al.',
  sikildim: '10 dakika başka bir şey dene: kısa yürüyüş, duş, bir şarkı, birine mesaj. İstek hâlâ varsa küçük bir porsiyon ye.',
  stres: 'Önce 4 saniye nefes al, 6 saniye ver; 5 kez. Bir bardak su ya da bitki çayı iç. İstersen yaşadığını Notlar\'a yaz.',
  uzgun: 'Üzgün olmak yemekle geçmiyor ama sen bunu hak etmiyorsun. Biriyle konuş, sıcak bir duş, sevdiğin bir dizi. Kendine nazik ol.',
  yorgun: 'Yorgunken tatlı isteği artar. Su iç, mümkünse 20 dk uzan. Bugün erken yatmayı dene.',
  aliskanlik: 'Ortamı değiştir: mutfaktan çık, ekranı kapat, dişlerini fırçala. Alışkanlık 10 dakikada geçer.'
};
let crKind = null;
function cravingSheet() {
  return `${sheetHead('Yeme isteği', nowHm())}
  <div class="field"><span class="lbl">Şu an ne hissediyorsun?</span><div class="radios">${Object.entries(CRAVE).map(([k, l]) => `<button type="button" class="radio ${crKind === k ? 'on' : ''}" data-a="crKind" data-id="${k}"><span class="rd"></span><span class="d">${l}</span></button>`).join('')}</div></div>
  ${crKind ? `<div class="banner soft"><p>${esc(CRAVE_TIP[crKind])}</p></div>
  <div class="inline"><button class="btn ghost grow" data-a="crSave" data-id="0">Yemedim, geçti</button><button class="btn grow" data-a="crSave" data-id="1">Yedim, sorun değil</button></div>` : ''}`;
}
A.craving = () => { crKind = null; openSheet(cravingSheet); };
A.crKind = k => { crKind = k; renderSheet(); };
A.crSave = ate => { S.food.cravings.push({ date: today(), at: nowHm(), kind: crKind, ate: ate === '1' }); S.food.cravings = S.food.cravings.slice(-300); save('food'); closeSheet(); toast(ate === '1' ? 'Kaydettim. Suçluluk yok, sadece fark ediyoruz.' : 'Harika, kaydettim.'); };

/* add food */
let fMeal = 'kahvalti', fQuery = '', fPick = null, fQty = 1, fNew = false;
function foodSheet() {
  if (fNew) return `${sheetHead('Yeni yiyecek', 'Değerleri paketten ya da internetten bakabilirsin')}
    <form data-form="foodNew" class="stack">
      <div class="field"><label for="nfName">Ad</label><input class="inp" id="nfName" required placeholder="ör. Ev yapımı mercimek köftesi"></div>
      <div class="field"><label for="nfPortion">Porsiyon</label><input class="inp" id="nfPortion" placeholder="ör. 4 adet / 100 g"></div>
      <div class="grid4"><div class="field"><label for="nfK">kcal</label><input class="inp" id="nfK" type="number" inputmode="decimal" required></div><div class="field"><label for="nfP">Protein</label><input class="inp" id="nfP" type="number" step="0.1" inputmode="decimal"></div><div class="field"><label for="nfC">Karb.</label><input class="inp" id="nfC" type="number" step="0.1" inputmode="decimal"></div><div class="field"><label for="nfF">Yağ</label><input class="inp" id="nfF" type="number" step="0.1" inputmode="decimal"></div></div>
      <button class="btn block" type="submit">Kaydet ve ${MEALS.find(m => m[0] === fMeal)[1].toLowerCase()} öğününe ekle</button>
      <button type="button" class="btn ghost block" data-a="fNew" data-id="0">Listeye dön</button>
    </form>`;
  const q = fQuery.toLocaleLowerCase('tr');
  const recent = []; const seen = new Set();
  for (const k of lastNDays(today(), 10).reverse()) for (const i of (S.food.log[k] || [])) if (i.foodId && !seen.has(i.foodId)) { seen.add(i.foodId); recent.push(i.foodId); }
  let lib = S.food.lib.filter(f => !q || f.name.toLocaleLowerCase('tr').includes(q));
  if (!q) lib = recent.map(id => S.food.lib.find(f => f.id === id)).filter(Boolean).concat(lib.filter(f => !seen.has(f.id)));
  const recipes = S.food.recipes.filter(r => !q || r.name.toLocaleLowerCase('tr').includes(q));
  const pick = fPick && (S.food.lib.find(f => f.id === fPick) || S.food.recipes.find(r => r.id === fPick));
  return `${sheetHead('Yiyecek ekle', MEALS.find(m => m[0] === fMeal)[1])}
  <div class="seg">${MEALS.map(([m, l]) => `<button class="${fMeal === m ? 'on' : ''}" data-a="fMeal" data-id="${m}">${l}</button>`).join('')}</div>
  ${pick ? `<div class="card stack-s"><div class="sec-h"><h3>${esc(pick.name)}</h3><button class="linkbtn" data-a="fPick" data-id="">Değiştir</button></div>
      <span class="small muted">${esc(pick.portion || '1 porsiyon')} · ${Math.round(pick.kcal)} kcal · P ${pick.p} · K ${pick.c} · Y ${pick.f}</span>
      <div class="field"><span class="lbl">Miktar</span><div class="seg">${[0.5, 1, 1.5, 2, 3].map(x => `<button class="${fQty === x ? 'on' : ''}" data-a="fQty" data-id="${x}">${x === 0.5 ? '½' : x === 1.5 ? '1½' : x}</button>`).join('')}</div></div>
      <button class="btn block" data-a="foodPut">Ekle · ${Math.round(pick.kcal * fQty)} kcal, ${r1(pick.p * fQty)} g protein</button></div>`
    : `<input class="inp" id="fq" placeholder="Ara: yumurta, tavuk, yoğurt…" value="${esc(fQuery)}" autocomplete="off" data-input="fq">
  <div class="list scroll">${recipes.map(r => `<button class="row pick" data-a="fPick" data-id="${r.id}">${ic('chef', 'xs')}<span class="grow"><span class="t">${esc(r.name)}</span><span class="small muted"> · tarif, 1 porsiyon</span></span><span class="small muted tnum">${r.kcal} kcal</span></button>`).join('')}
    ${lib.map(f => `<button class="row pick" data-a="fPick" data-id="${f.id}"><span class="grow"><span class="t">${esc(f.name)}</span><span class="small muted"> · ${esc(f.portion)}</span></span><span class="small muted tnum">${Math.round(f.kcal)} kcal · P ${f.p}</span></button>`).join('') || empty('Bulunamadı.')}</div>
  <button class="btn ghost block" data-a="fNew" data-id="1">+ Listede yok, yeni yiyecek ekle</button>`}`;
}
A.foodAdd = m => { fMeal = m || 'kahvalti'; fQuery = ''; fPick = null; fQty = 1; fNew = false; openSheet(foodSheet); };
A.fMeal = m => { fMeal = m; renderSheet(); };
A.fPick = id => { fPick = id || null; fQty = 1; renderSheet(); };
A.fQty = q => { fQty = Number(q); renderSheet(); };
A.fNew = v => { fNew = v === '1'; renderSheet(); };
A.fq = v => { fQuery = v; renderSheet(); };
A.foodPut = () => {
  const f = S.food.lib.find(x => x.id === fPick) || S.food.recipes.find(x => x.id === fPick); if (!f) return;
  const k = today(); const l = S.food.log[k] = S.food.log[k] || [];
  l.push({ id: uid(), foodId: f.id, name: f.name, qty: fQty, meal: fMeal, kcal: f.kcal * fQty, p: f.p * fQty, c: f.c * fQty, f: f.f * fQty });
  pruneFood(); save('food'); fPick = null; fQuery = ''; toast(`${f.name} eklendi`); renderSheet();
};
F.foodNew = () => {
  const f = { id: uid(), name: val('nfName').trim(), portion: val('nfPortion').trim() || '1 porsiyon', kcal: num('nfK') || 0, p: num('nfP') || 0, c: num('nfC') || 0, f: num('nfF') || 0 };
  if (!f.name) return;
  S.food.lib.push(f); fPick = f.id; fNew = false; fQty = 1; A.foodPut();
};
A.foodDel = id => { const k = today(); S.food.log[k] = (S.food.log[k] || []).filter(i => i.id !== id); save('food'); };
function pruneFood() { const cut = addDaysKey(today(), -400); for (const k in S.food.log) if (k < cut) delete S.food.log[k]; for (const k in S.food.water) if (k < cut) delete S.food.water[k]; }

/* ---------------- meal plan, recipes, shopping ---------------- */
function mealPlan() {
  const mon = mondayKey(today());
  const plan = S.food.plan;
  const rname = v => { if (!v) return ''; const r = S.food.recipes.find(x => x.id === v); return r ? r.name : v; };
  const homeDays = WEEK_ORDER.filter(d => ['kahvalti', 'ogle', 'aksam'].some(m => plan[d] && plan[d][m])).length;
  return `
  <p class="small muted">Haftanı bir kez planla, alışveriş listesi kendiliğinden çıksın. Evde yemek = daha kolay protein ve daha az yeme isteği.</p>
  <div class="list">${WEEK_ORDER.map(d => `<button class="row pick" data-a="planDay" data-id="${d}">
      <span class="dayb ${d === dowOf(today()) ? 'on' : ''}">${DOW[d]}</span>
      <span class="grow small">${['kahvalti', 'ogle', 'aksam'].map(m => plan[d] && plan[d][m] ? `<span class="pl"><span class="muted">${MEALS.find(x => x[0] === m)[1]}:</span> ${esc(rname(plan[d][m]))}</span>` : '').join('') || '<span class="muted">Planlanmadı</span>'}</span>${I.chev}</button>`).join('')}</div>
  <p class="small muted">${homeDays}/7 gün planlandı · ${esc(fmtShort(mon))} haftası</p>
  <button class="btn block" data-a="makeShop">Plandan alışveriş listesi oluştur</button>

  <section class="stack-s">${head('Alışveriş listesi', S.food.shop.some(i => i.done) ? `<button class="linkbtn" data-a="shopClear">Alınanları temizle</button>` : '')}
    <div class="list">${S.food.shop.map(i => `<div class="row ${i.done ? 'done' : ''}">${check(i.done, 'shopToggle', i.id, null, i.text, true)}<span class="grow t">${esc(i.text)}</span><button class="iconbtn" data-a="shopDel" data-id="${i.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Liste boş.')}</div>
    <form class="inline" data-form="shopAdd"><input class="inp" id="shopText" placeholder="Listeye ekle" autocomplete="off"><button class="btn" type="submit">Ekle</button></form>
  </section>

  <section class="stack-s">${head('Tariflerim', `<button class="btn sm" data-a="recipeEdit" data-id="">+ Tarif</button>`)}
    <div class="list">${S.food.recipes.map(r => `<button class="row pick" data-a="recipeView" data-id="${r.id}">${ic('chef', 'xs')}<span class="grow"><span class="t">${esc(r.name)}</span><br><span class="small muted tnum">porsiyon: ${r.kcal} kcal · P ${r.p} g · ${r.servings} porsiyon çıkar</span></span>${I.chev}</button>`).join('')}</div>
  </section>`;
}
let planD = 1;
function planSheet() {
  const p = S.food.plan[planD] || {};
  return `${sheetHead(DOW_LONG[planD] + ' menüsü')}
  <form data-form="planSave" class="stack">${['kahvalti', 'ogle', 'aksam'].map(m => `<div class="field"><label for="pl_${m}">${MEALS.find(x => x[0] === m)[1]}</label>
    <select class="inp" id="pl_${m}"><option value="">—</option>${S.food.recipes.map(r => `<option value="${r.id}" ${p[m] === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}<option value="__free" ${p[m] && !S.food.recipes.some(r => r.id === p[m]) ? 'selected' : ''}>Başka bir şey (yaz)</option></select>
    <input class="inp" id="plf_${m}" placeholder="ör. Dışarıda: tavuk salata" value="${p[m] && !S.food.recipes.some(r => r.id === p[m]) ? esc(p[m]) : ''}"></div>`).join('')}
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.planDay = d => { planD = Number(d); openSheet(planSheet); };
F.planSave = () => {
  const o = {}; for (const m of ['kahvalti', 'ogle', 'aksam']) { const v = val('pl_' + m); o[m] = v === '__free' ? val('plf_' + m).trim() : (v || val('plf_' + m).trim()); }
  S.food.plan[planD] = o; save('food'); closeSheet();
};
A.makeShop = () => {
  const need = {};
  for (const d in S.food.plan) for (const m in S.food.plan[d]) { const r = S.food.recipes.find(x => x.id === S.food.plan[d][m]); if (r) for (const ing of r.ingredients) { need[ing.n] = need[ing.n] || []; if (ing.q) need[ing.n].push(ing.q); } }
  const have = new Set(S.food.shop.map(i => i.text.split(' (')[0].toLocaleLowerCase('tr')));
  let n = 0; for (const [name, qs] of Object.entries(need)) { if (have.has(name.toLocaleLowerCase('tr'))) continue; S.food.shop.push({ id: uid(), text: qs.length ? `${name} (${qs.join(' + ')})` : name, done: false }); n++; }
  save('food'); toast(n ? `${n} malzeme listeye eklendi` : 'Plandaki tariflerin malzemeleri zaten listede');
};
A.shopToggle = id => { const i = S.food.shop.find(x => x.id === id); i.done = !i.done; save('food'); };
A.shopDel = id => { S.food.shop = S.food.shop.filter(x => x.id !== id); save('food'); };
A.shopClear = () => { S.food.shop = S.food.shop.filter(x => !x.done); save('food'); };
F.shopAdd = () => { const v = val('shopText').trim(); if (!v) return; S.food.shop.push({ id: uid(), text: v, done: false }); save('food'); document.getElementById('shopText').value = ''; };

let recId = null, recEditing = false;
function recipeSheet() {
  const r = S.food.recipes.find(x => x.id === recId);
  if (!recEditing && r) return `${sheetHead(esc(r.name), `${r.servings} porsiyon · porsiyon başı ${r.kcal} kcal`)}
    <div class="grid4 small tnum"><span class="stat"><b>${r.kcal}</b>kcal</span><span class="stat"><b>${r.p}</b>protein</span><span class="stat"><b>${r.c}</b>karb.</span><span class="stat"><b>${r.f}</b>yağ</span></div>
    <div class="card"><span class="lbl">Malzemeler</span><ul class="plain">${r.ingredients.map(i => `<li>${esc(i.n)}${i.q ? ` <span class="muted">· ${esc(i.q)}</span>` : ''}</li>`).join('')}</ul></div>
    <div class="card"><span class="lbl">Yapılışı</span><p>${esc(r.steps)}</p></div>
    <div class="inline"><button class="btn ghost grow" data-a="recipeEdit" data-id="${r.id}">Düzenle</button>${del('recipeDel', r.id)}</div>`;
  const x = r || { name: '', servings: 1, kcal: '', p: '', c: '', f: '', ingredients: [], steps: '' };
  return `${sheetHead(r ? 'Tarifi düzenle' : 'Yeni tarif')}
  <form data-form="recipeSave" class="stack">
    <div class="field"><label for="rcName">Ad</label><input class="inp" id="rcName" required value="${esc(x.name)}"></div>
    <div class="field"><label for="rcServ">Kaç porsiyon çıkar?</label><input class="inp" id="rcServ" type="number" min="1" value="${x.servings}"></div>
    <span class="lbl">1 porsiyonun değerleri</span>
    <div class="grid4"><div class="field"><label for="rcK">kcal</label><input class="inp" id="rcK" type="number" value="${x.kcal}"></div><div class="field"><label for="rcP">Protein</label><input class="inp" id="rcP" type="number" value="${x.p}"></div><div class="field"><label for="rcC">Karb.</label><input class="inp" id="rcC" type="number" value="${x.c}"></div><div class="field"><label for="rcF">Yağ</label><input class="inp" id="rcF" type="number" value="${x.f}"></div></div>
    <div class="field"><label for="rcIng">Malzemeler (her satıra bir tane, miktarı virgülden sonra)</label><textarea class="inp" id="rcIng" placeholder="Tavuk göğsü, 450 g">${esc(x.ingredients.map(i => i.n + (i.q ? ', ' + i.q : '')).join('\n'))}</textarea></div>
    <div class="field"><label for="rcSteps">Yapılışı</label><textarea class="inp" id="rcSteps">${esc(x.steps)}</textarea></div>
    <button class="btn block" type="submit">Kaydet</button></form>`;
}
A.recipeView = id => { recId = id; recEditing = false; openSheet(recipeSheet); };
A.recipeEdit = id => { recId = id || null; recEditing = true; if (sheetOpen()) renderSheet(); else openSheet(recipeSheet); };
F.recipeSave = () => {
  const ing = val('rcIng').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(','); return i > 0 ? { n: l.slice(0, i).trim(), q: l.slice(i + 1).trim() } : { n: l, q: '' }; });
  const data = { name: val('rcName').trim(), servings: Math.max(1, num('rcServ') || 1), kcal: num('rcK') || 0, p: num('rcP') || 0, c: num('rcC') || 0, f: num('rcF') || 0, ingredients: ing, steps: val('rcSteps').trim() };
  if (!data.name) return;
  const r = S.food.recipes.find(x => x.id === recId);
  if (r) Object.assign(r, data); else { recId = uid(); S.food.recipes.push({ id: recId, ...data }); }
  save('food'); recEditing = false; renderSheet();
};
A.recipeDel = id => { S.food.recipes = S.food.recipes.filter(x => x.id !== id); save('food'); closeSheet(); };

/* ---------------- sport ---------------- */
function sport() {
  const k = today(), mon = mondayKey(k), target = S.settings.workoutTarget || 4;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysKey(mon, i));
  const doneDays = new Set(S.workout.sessions.filter(s => s.date >= mon).map(s => s.date));
  const weeks = Array.from({ length: 8 }, (_, i) => addDaysKey(mon, -7 * (7 - i)));
  const perWeek = weeks.map(workoutDaysInWeek);
  const walkWeek = (S.workout.walks || []).filter(w => w.date >= mon).reduce((a, w) => a + (+w.minutes || 0), 0);
  const exNames = [...new Set(S.workout.sessions.flatMap(s => s.ex.map(e => e.name)))];
  const exSel = progEx && exNames.includes(progEx) ? progEx : exNames[0];
  const pts = exSel ? S.workout.sessions.filter(s => s.ex.some(e => e.name === exSel)).slice(-12).map(s => { const e = s.ex.find(x => x.name === exSel); return { x: fmtShort(s.date), v: Math.max(0, ...e.sets.map(z => +z.kg || 0)) }; }) : [];
  return `
  <div class="card stack-s">
    <div class="sec-h"><h3>Bu hafta</h3><span class="tnum ${doneDays.size >= target ? 'pos' : 'muted'}">${doneDays.size}/${target} gün</span></div>
    <div class="weekdots">${weekDays.map(d => `<span class="wdot ${doneDays.has(d) ? 'on' : ''} ${d === k ? 'today' : ''}"><i></i><b>${DOW[dowOf(d)]}</b></span>`).join('')}</div>
    <button class="btn block" data-a="woStart">${ic('play', 'xs')} Antrenmanı başlat</button>
  </div>
  <section class="stack-s">${head('Son 8 hafta', `<span class="meta">hedef ${target} gün/hafta</span>`)}
    <div class="card">${barChart(perWeek, { labels: weeks.map(w => fmtShort(w).replace(' ', ' ')), target, max: 7, unit: ' gün' })}</div></section>

  <section class="stack-s">${head('Antrenman şablonlarım', `<button class="btn sm" data-a="tplEdit" data-id="">+ Şablon</button>`)}
    <div class="list">${S.workout.templates.map(t => `<button class="row pick" data-a="tplEdit" data-id="${t.id}"><span class="grow"><span class="t">${esc(t.name)}</span><br><span class="small muted">${t.exercises.length ? esc(t.exercises.map(e => e.name).join(', ')) : 'Henüz hareket yok. Dokun ve hareketlerini ekle.'}</span></span>${I.chev}</button>`).join('')}</div></section>

  ${pts.length >= 2 ? `<section class="stack-s">${head('Ağırlık gelişimi')}
    <div class="chips">${exNames.map(n => `<button class="fchip ${n === exSel ? 'on' : ''}" data-a="progEx" data-id="${esc(n)}">${esc(n)}</button>`).join('')}</div>
    <div class="card">${lineChart(pts, { unit: ' kg', yPad: 1 })}</div></section>` : ''}

  <section class="stack-s">${head('Yürüyüş', `<span class="meta tnum">bu hafta ${walkWeek} dk</span>`)}
    <form class="inline" data-form="walk"><input class="inp" id="wkMin" type="number" inputmode="numeric" placeholder="Dakika"><input class="inp" id="wkSteps" type="number" inputmode="numeric" placeholder="Adım (isteğe bağlı)"><button class="btn" type="submit">Ekle</button></form></section>

  <section class="stack-s">${head('Geçmiş')}
    <div class="list">${S.workout.sessions.slice(-8).reverse().map(s => `<div class="row"><div class="grow"><div class="t">${esc(s.name)}</div><div class="small muted">${esc(fmtShort(s.date))}${s.minutes ? ' · ' + s.minutes + ' dk' : ''} · ${s.ex.length} hareket</div></div><button class="iconbtn" data-a="woDel" data-id="${s.id}" aria-label="Sil">${I.trash}</button></div>`).join('') || empty('Henüz antrenman kaydı yok.')}</div></section>`;
}
let progEx = null;
A.progEx = n => { progEx = n; };
F.walk = () => { const m = num('wkMin'); if (!m) return; S.workout.walks.push({ date: today(), minutes: m, steps: num('wkSteps') || null }); save('workout'); toast('Yürüyüş kaydedildi'); };
A.woDel = id => { S.workout.sessions = S.workout.sessions.filter(s => s.id !== id); save('workout'); };

let tplId = null;
function tplSheet() {
  const t = S.workout.templates.find(x => x.id === tplId) || { name: '', exercises: [] };
  return `${sheetHead(tplId ? 'Şablonu düzenle' : 'Yeni şablon')}
  <form data-form="tplSave" class="stack">
    <div class="field"><label for="tpName">Ad</label><input class="inp" id="tpName" required value="${esc(t.name)}" placeholder="ör. Alt vücut"></div>
    <div class="field"><label for="tpEx">Hareketler: her satıra bir hareket. İstersen "isim, set x tekrar"</label><textarea class="inp" id="tpEx" style="min-height:180px" placeholder="Goblet squat, 3x12&#10;Romanian deadlift, 3x10&#10;Dambıl row, 3x12">${esc(t.exercises.map(e => e.name + (e.sets ? `, ${e.sets}x${e.reps}` : '')).join('\n'))}</textarea></div>
    <button class="btn block" type="submit">Kaydet</button></form>
  ${tplId ? del('tplDel', tplId) : ''}`;
}
A.tplEdit = id => { tplId = id || null; openSheet(tplSheet); };
F.tplSave = () => {
  const ex = val('tpEx').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.*?)(?:,\s*(\d+)\s*[xX×]\s*(\d+))?\s*$/); return { id: uid(), name: m[1].trim(), sets: m[2] ? +m[2] : 3, reps: m[3] ? +m[3] : 10 }; });
  const data = { name: val('tpName').trim(), exercises: ex }; if (!data.name) return;
  const t = S.workout.templates.find(x => x.id === tplId);
  if (t) Object.assign(t, data); else S.workout.templates.push({ id: uid(), ...data });
  save('workout'); closeSheet();
};
A.tplDel = id => { S.workout.templates = S.workout.templates.filter(x => x.id !== id); save('workout'); closeSheet(); };

let wo = null;
function woSheet() {
  if (!wo.tpl) return `${sheetHead('Hangi antrenman?')}
    <div class="list">${S.workout.templates.map(t => `<button class="row pick" data-a="woPick" data-id="${t.id}"><span class="grow t">${esc(t.name)}</span><span class="small muted">${t.exercises.length} hareket</span></button>`).join('')}
    <button class="row pick" data-a="woPick" data-id="__free"><span class="grow t">Serbest antrenman / başka spor</span></button></div>`;
  return `${sheetHead(esc(wo.name), 'Ağırlık ve tekrarları gir, son seferkiler yazılı')}
  <form data-form="woSave" class="stack">
    ${wo.ex.map((e, i) => `<div class="card stack-xs"><b>${esc(e.name)}</b>${e.sets.map((s, j) => `<div class="setrow"><span class="small muted">Set ${j + 1}</span><input class="inp" id="wr_${i}_${j}" type="number" inputmode="numeric" value="${s.reps}" aria-label="Tekrar"><span class="small muted">tekrar</span><input class="inp" id="wk_${i}_${j}" type="number" step="0.5" inputmode="decimal" value="${s.kg}" aria-label="Kilo"><span class="small muted">kg</span></div>`).join('')}</div>`).join('')}
    ${!wo.ex.length ? `<div class="field"><label for="woFree">Ne yaptın?</label><input class="inp" id="woFree" placeholder="ör. Pilates videosu" value="${esc(wo.name === 'Serbest antrenman' ? '' : wo.name)}"></div>` : ''}
    <div class="field"><label for="woMin">Süre (dakika)</label><input class="inp" id="woMin" type="number" inputmode="numeric" value="${Math.max(1, Math.round((Date.now() - wo.started) / 60000))}"></div>
    <button class="btn block" type="submit">Antrenmanı bitir</button></form>`;
}
A.woStart = () => { wo = { tpl: null, started: Date.now() }; openSheet(woSheet); };
A.woPick = id => {
  const t = S.workout.templates.find(x => x.id === id);
  if (!t) { wo = { tpl: '__free', name: 'Serbest antrenman', ex: [], started: wo.started }; renderSheet(); return; }
  const last = name => { for (let i = S.workout.sessions.length - 1; i >= 0; i--) { const e = S.workout.sessions[i].ex.find(x => x.name === name); if (e) return e.sets; } return null; };
  wo = { tpl: t.id, name: t.name, started: wo.started, ex: t.exercises.map(e => ({ name: e.name, sets: last(e.name) || Array.from({ length: e.sets || 3 }, () => ({ reps: e.reps || 10, kg: '' })) })) };
  renderSheet();
};
F.woSave = () => {
  const ex = wo.ex.map((e, i) => ({ name: e.name, sets: e.sets.map((_, j) => ({ reps: num(`wr_${i}_${j}`) || 0, kg: num(`wk_${i}_${j}`) || 0 })) }));
  const name = wo.ex.length ? wo.name : (val('woFree').trim() || 'Serbest antrenman');
  S.workout.sessions.push({ id: uid(), date: today(), templateId: wo.tpl, name, minutes: num('woMin') || null, ex });
  if (S.workout.sessions.length > 800) S.workout.sessions = S.workout.sessions.slice(-800);
  save('workout'); closeSheet();
  const n = workoutDaysInWeek(mondayKey(today())), t = S.settings.workoutTarget || 4;
  toast(n >= t ? `Bu haftanın hedefi tamam: ${n}/${t}. Gurur duy!` : `Harika! Bu hafta ${n}/${t}.`);
};

/* ---------------- measurements ---------------- */
function measures() {
  const wk = weeklyAvgWeights(12), lw = lastWeight(), goal = S.settings.goalWeight;
  let trend = '';
  if (wk.length >= 2) { const a = wk[Math.max(0, wk.length - 5)], b = wk[wk.length - 1]; const weeks = Math.max(1, diffDays(a.mon, b.mon) / 7); const perMonth = r1((b.v - a.v) / weeks * 4.3); trend = `Son ${Math.round(weeks)} haftada ayda ${perMonth > 0 ? '+' : ''}${perMonth} kg hızla gidiyorsun.`; }
  const waist = S.body.waist.slice(-12).map(x => ({ x: fmtShort(x.date), v: x.cm }));
  const st = suggestedTargets();
  return `
  <div class="card stack-s">
    <div class="sec-h"><h3>Kilo</h3><span class="tnum">${lw ? `${lw.kg} kg · ${esc(fmtShort(lw.date))}` : ''}</span></div>
    ${wk.length >= 2 ? lineChart(wk.map(w => ({ x: fmtShort(w.mon), v: w.v })), { target: goal, unit: ' kg' }) : `<p class="small muted">Haftada 2-3 kez, sabah tuvaletten sonra tartıl. Grafik haftalık ortalamayı gösterir; günlük oynamalar seni yanıltmasın.</p>`}
    ${trend ? `<p class="small">${trend} Hedefin ayda ${S.settings.monthlyLossGoal || 2} kg civarı.</p>` : ''}
    <form class="inline" data-form="weight"><input class="inp" id="kg" type="number" step="0.1" inputmode="decimal" placeholder="Bugünkü kilon (kg)"><button class="btn" type="submit">Kaydet</button></form>
  </div>
  <div class="card stack-s">
    <div class="sec-h"><h3>Bel ölçüsü</h3><span class="small muted">yağ kaybının en iyi ev göstergesi</span></div>
    ${waist.length >= 2 ? lineChart(waist, { unit: ' cm' }) : '<p class="small muted">Haftada bir, göbek deliği hizasından, nefes verdikten sonra ölç.</p>'}
    <form class="inline" data-form="waist"><input class="inp" id="waistCm" type="number" step="0.1" inputmode="decimal" placeholder="Bel (cm)"><input class="inp" id="hipCm" type="number" step="0.1" inputmode="decimal" placeholder="Kalça (cm)"><button class="btn" type="submit">Kaydet</button></form>
  </div>
  <div class="card stack-xs">
    <div class="sec-h"><h3>Aylık fotoğraf</h3>${check(S.body.photos.includes(today().slice(0, 7)), 'photoMonth', today().slice(0, 7), null, 'Bu ayın fotoğrafını çektim')}</div>
    <p class="small muted">Her ayın başında aynı ışıkta, aynı açıdan önden ve yandan bir fotoğraf çek ve telefonunda bir albümde tut. Kilo değişmese bile vücudundaki değişimi en iyi fotoğraflar gösterir.</p>
  </div>
  <div class="card stack-xs">
    <h3>Hedeflerin nasıl hesaplandı?</h3>
    <p class="small">Yaş ${age()}, boy ${S.settings.height} cm, ${lw ? lw.kg : 65} kg için: dinlenme harcaman ~${st.bmr} kcal, günlük toplam ~${st.tdee} kcal. Kas kaybetmeden yağ yakmak için günde ~450 kcal açık: <b>${st.kcal} kcal</b>, protein <b>${st.p} g</b> (kas için en önemli rakam), yağ ${st.f} g, karbonhidrat ${st.c} g.</p>
    <p class="small muted">Bu, ayda yaklaşık 2 kg'a denk gelir. Haftada 4 ağırlık antrenmanı + yüksek protein, verdiğin kilonun büyük kısmının yağdan gitmesini sağlar. İlaçların iştahını etkileyebilir; büyük bir değişiklik öncesi doktoruna danış.</p>
    <button class="btn ghost" data-a="applyTargets">Bu hedefleri uygula</button>
  </div>`;
}
F.weight = () => { const kg = num('kg'); if (!(kg > 25 && kg < 300)) { toast('Geçerli bir kilo gir.'); return; } const k = today(); S.body.weights = S.body.weights.filter(w => w.date !== k).concat({ date: k, kg: r1(kg) }).sort((a, b) => a.date.localeCompare(b.date)).slice(-500); save('body'); toast('Kaydedildi'); };
F.waist = () => { const w = num('waistCm'), h = num('hipCm'); const k = today(); if (w) S.body.waist = S.body.waist.filter(x => x.date !== k).concat({ date: k, cm: r1(w) }).sort((a, b) => a.date.localeCompare(b.date)); if (h) S.body.hip = S.body.hip.filter(x => x.date !== k).concat({ date: k, cm: r1(h) }).sort((a, b) => a.date.localeCompare(b.date)); if (w || h) { save('body'); toast('Kaydedildi'); } };
A.photoMonth = m => { S.body.photos = S.body.photos.includes(m) ? S.body.photos.filter(x => x !== m) : S.body.photos.concat(m); save('body'); };
A.applyTargets = () => { const st = suggestedTargets(); Object.assign(S.settings.targets, { kcal: st.kcal, p: st.p, c: st.c, f: st.f }); save('settings'); toast('Hedefler güncellendi'); };
