// Bahar's starting setup. Everything here is editable inside the app.
const id = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const ALL = [0, 1, 2, 3, 4, 5, 6];

export function defaultState(todayKey) {
  // weekly plan (dow: 0 Pazar … 6 Cumartesi). School is from her timetable; the rest is a suggestion.
  const b = (dow, start, end, title, cat, notify = true, note = '') => ({ id: id(), dow, start, end, title, cat, notify, lead: cat === 'okul' ? 0 : 0, note });
  const template = [
    // Pazartesi
    b(1, '10:00', '15:00', 'Okul', 'okul', false), b(1, '16:30', '17:30', 'Ders: Sinyaller ve Sistemler', 'ders'), b(1, '18:00', '19:00', 'Spor (ağırlık)', 'spor'),
    b(1, '19:15', '20:00', 'Akşam yemeği hazırla', 'yemek'), b(1, '21:00', '21:45', 'İngilizce', 'ingilizce'), b(1, '22:00', '22:30', 'Yarım saat ev toplama', 'ev'),
    // Salı (boş gün)
    b(2, '10:00', '11:30', 'Ders: Analog', 'ders'), b(2, '11:30', '12:00', 'Yarım saat ev toplama', 'ev'), b(2, '13:00', '14:00', 'Spor (ağırlık)', 'spor'),
    b(2, '14:30', '15:30', 'Gelir: CrowdGen', 'gelir'), b(2, '16:00', '17:00', 'Ders: Sayısal Sistemler', 'ders'), b(2, '17:30', '18:30', 'Yemek hazırlığı (2-3 günlük)', 'yemek'),
    b(2, '21:00', '21:45', 'İngilizce', 'ingilizce'),
    // Çarşamba
    b(3, '11:00', '18:00', 'Okul', 'okul', false), b(3, '19:00', '19:30', 'Yürüyüş (isteğe bağlı)', 'spor'), b(3, '21:00', '21:30', 'İngilizce (kısa)', 'ingilizce'),
    // Perşembe
    b(4, '10:00', '13:00', 'Okul', 'okul', false), b(4, '14:00', '15:00', 'Ders: Elektromanyetik', 'ders'), b(4, '15:30', '16:30', 'Spor (ağırlık)', 'spor'),
    b(4, '17:00', '18:00', 'Gelir: CrowdGen', 'gelir'), b(4, '21:00', '21:45', 'İngilizce', 'ingilizce'), b(4, '22:00', '22:30', 'Yarım saat ev toplama', 'ev'),
    // Cuma
    b(5, '10:00', '11:30', 'Ders: Sinyaller ve Sistemler', 'ders'), b(5, '14:00', '16:00', 'Okul', 'okul', false), b(5, '17:00', '18:00', 'Gelir: fikir denemesi', 'gelir'),
    b(5, '21:00', '21:45', 'İngilizce', 'ingilizce'),
    // Cumartesi
    b(6, '11:00', '12:00', 'Spor (ağırlık)', 'spor'), b(6, '12:30', '13:30', 'Gelir: fikir denemesi', 'gelir'), b(6, '14:00', '15:30', 'Ders: Analog', 'ders'),
    b(6, '17:00', '18:00', 'Haftalık market alışverişi', 'yemek'), b(6, '21:00', '21:30', 'İngilizce: haftalık tekrar', 'ingilizce'),
    // Pazar
    b(0, '11:00', '12:30', 'Yemek hazırlığı (meal prep)', 'yemek'), b(0, '13:00', '14:00', 'Büyük ev toparlama', 'ev'), b(0, '15:00', '16:00', 'Ders: haftalık tekrar', 'ders'),
    b(0, '18:00', '18:45', 'Yürüyüş', 'spor'), b(0, '21:00', '21:20', 'Haftalık değerlendirme', 'kisisel')
  ];

  const care = (area, when, text, freq, essential = false, product = '') => ({ id: id(), area, when, text, freq: freq || { type: 'daily' }, essential, product });
  const courses = [
    { id: 'c-sin', name: 'Sinyaller ve Sistemler', weeklyHours: 4, focus: true },
    { id: 'c-ana', name: 'Analog', weeklyHours: 4, focus: true },
    { id: 'c-say', name: 'Sayısal Sistemler', weeklyHours: 3, focus: true },
    { id: 'c-em', name: 'Elektromanyetik', weeklyHours: 2, focus: true }
  ];

  const food = (name, portion, kcal, p, c, f) => ({ id: id(), name, portion, kcal, p, c, f });
  const recipe = (name, servings, kcal, p, c, f, ingredients, steps) => ({ id: id(), name, servings, kcal, p, c, f, ingredients, steps });

  return {
    settings: {
      name: 'Bahar', tz: 180, birth: '2003-10-01', height: 158, sex: 'k',
      wake: '08:30', bed: '00:30',
      targets: { kcal: 1500, p: 115, c: 145, f: 50, water: 8 },
      workoutTarget: 4, goalWeight: null, monthlyLossGoal: 2,
      digestTime: '10:00', careMorning: '09:15', careDay: '18:30', careNight: '23:45', moodTime: '22:00', reviewTime: '21:00',
      waterReminders: true, finalsDate: '2027-01-04', finalFrom: '2026-12-21',
      pin: null, starter: true, createdAt: todayKey
    },
    schedule: { template, dated: [], skips: [] },
    meds: {
      list: [
        { id: 'm-wel', name: 'Wellbutrin', times: ['09:00'], days: null, withMeal: false, note: 'Sabah' },
        { id: 'm-eff', name: 'Effexor', times: ['20:00'], days: null, withMeal: false, note: '' },
        { id: 'm-zor', name: 'Zoretanin', times: ['20:00'], days: null, withMeal: false, note: '' },
        { id: 'm-mag', name: 'Magnezyum', times: ['00:00'], days: null, withMeal: false, note: 'Uyumadan 30 dk önce' },
        { id: 'm-dvit', name: 'D vitamini', times: ['13:30'], days: [2, 6], withMeal: true, note: 'Haftada 2 gün, yemekle' }
      ],
      log: {}
    },
    care: {
      items: [
        care('agiz', 'sabah', 'Dişlerini fırçala', null, true),
        care('yuz', 'sabah', 'Yüzünü yıka', null, true, ''),
        care('yuz', 'sabah', 'Nemlendirici', null, false, ''),
        care('yuz', 'sabah', 'Güneş kremi', null, false, ''),
        care('vucut', 'sabah', 'Deodorant ve temiz kıyafet', null, false),
        care('yuz', 'gun', 'Dudak nemlendirici (gün içinde)', null, false, ''),
        care('vucut', 'gun', 'Duş al (5 dakikalık duş da sayılır)', { type: 'every', n: 2 }, false),
        care('vucut', 'gun', 'Duştan sonra vücut losyonu', { type: 'every', n: 2 }, false, ''),
        care('sac', 'gun', 'Saç yıkama', { type: 'days', days: [1, 4] }, false, ''),
        care('sac', 'gun', 'Saç maskesi', { type: 'days', days: [0] }, false, ''),
        care('genel', 'gun', 'Tırnak bakımı', { type: 'days', days: [0] }, false),
        care('genel', 'gun', 'Çarşafları değiştir', { type: 'every', n: 10 }, false),
        care('yuz', 'aksam', 'Makyajını çıkar', null, true),
        care('yuz', 'aksam', 'Yüzünü yıka', null, true),
        care('yuz', 'aksam', 'Gece kremi / nemlendirici', null, false, ''),
        care('agiz', 'aksam', 'Dişlerini fırçala', null, true),
        care('genel', 'aksam', 'Yarının kıyafetini hazırla', null, false)
      ],
      log: {}
    },
    mood: { log: {}, hard: {} },
    sleep: { log: {} },
    body: { weights: [], waist: [], hip: [], photos: [] },
    food: {
      lib: [
        food('Yumurta', '1 adet', 72, 6.3, 0.4, 4.8), food('Yumurta beyazı', '1 adet', 17, 3.6, 0.2, 0),
        food('Tavuk göğsü (pişmiş)', '100 g', 165, 31, 0, 3.6), food('Hindi füme', '50 g', 55, 9, 1, 1.5),
        food('Ton balığı (suyu süzülmüş)', '1 kutu (~120 g)', 130, 29, 0, 1), food('Somon', '100 g', 208, 20, 0, 13),
        food('Kıyma (az yağlı, pişmiş)', '100 g', 215, 26, 0, 12),
        food('Yoğurt (tam yağlı)', '200 g', 122, 7, 9, 6.5), food('Süzme yoğurt / Greek', '150 g', 145, 15, 6, 7),
        food('Lor peyniri', '100 g', 90, 12, 3, 3), food('Beyaz peynir', '30 g', 80, 5, 0.5, 6.5), food('Kefir', '250 ml', 140, 8, 11, 7),
        food('Süt (yarım yağlı)', '200 ml', 92, 6.5, 9.5, 3.2), food('Whey protein', '1 ölçek (30 g)', 120, 24, 3, 1.5),
        food('Yulaf', '40 g', 150, 5.3, 25, 2.8), food('Tam buğday ekmeği', '1 dilim (30 g)', 75, 3.5, 13, 1),
        food('Bulgur pilavı', '1 kase (150 g)', 170, 5, 33, 2.5), food('Pirinç pilavı', '1 kase (150 g)', 200, 4, 42, 3),
        food('Makarna (pişmiş)', '150 g', 235, 8.5, 46, 1.4), food('Patates (haşlanmış)', '150 g', 130, 3, 30, 0.2),
        food('Kuru fasulye / nohut (pişmiş)', '1 kase (180 g)', 230, 13, 35, 4), food('Mercimek çorbası', '1 kase', 150, 8, 22, 3.5),
        food('Muz', '1 orta', 105, 1.3, 27, 0.4), food('Elma', '1 orta', 95, 0.5, 25, 0.3), food('Çilek', '150 g', 48, 1, 11, 0.5),
        food('Avokado', 'yarım', 120, 1.5, 6, 11), food('Zeytinyağı', '1 yemek kaşığı', 120, 0, 0, 13.5),
        food('Ceviz', '15 g (3-4 adet)', 98, 2.3, 2, 9.8), food('Badem', '15 g', 87, 3.2, 3.2, 7.5), food('Fıstık ezmesi', '1 yemek kaşığı', 95, 4, 3, 8),
        food('Zeytin', '5 adet', 35, 0.2, 1, 3.5), food('Salata (yağsız)', '1 kase', 30, 1.5, 5, 0.3), food('Sebze yemeği (zeytinyağlı)', '1 porsiyon', 150, 3, 14, 9),
        food('Bitter çikolata (%70)', '2 kare (20 g)', 120, 1.6, 9, 8.5), food('Latte', 'orta boy', 190, 10, 16, 9)
      ],
      log: {}, water: {}, cravings: [],
      recipes: [
        recipe('Yulaflı protein kase', 1, 390, 32, 45, 9, [{ n: 'Yulaf', q: '40 g' }, { n: 'Süzme yoğurt', q: '150 g' }, { n: 'Muz', q: 'yarım' }, { n: 'Tarçın', q: '' }, { n: 'Ceviz', q: '2 adet' }], 'Yulafı yoğurtla karıştır, üstüne muz, tarçın ve ceviz. Akşamdan buzdolabına koyarsan sabah hazır.'),
        recipe('Sebzeli omlet', 1, 330, 25, 8, 22, [{ n: 'Yumurta', q: '3 adet' }, { n: 'Ispanak / biber / domates', q: '1 avuç' }, { n: 'Beyaz peynir', q: '20 g' }], 'Sebzeleri az yağda 3 dk sotele, çırpılmış yumurtayı ekle, üstüne peynir. 5 dakikalık iş.'),
        recipe('Fırında tavuk + bulgur + salata', 3, 480, 42, 45, 13, [{ n: 'Tavuk göğsü', q: '450 g' }, { n: 'Bulgur', q: '1 su bardağı' }, { n: 'Yoğurt', q: '3 yemek kaşığı (marine)' }, { n: 'Pul biber, kekik, sarımsak', q: '' }, { n: 'Salata malzemesi', q: '' }], 'Tavuğu yoğurt ve baharatla marine et, 200 °C fırında 25 dk. Bulguru pişir. 3 kaba böl: 3 öğün hazır.'),
        recipe('Ton balıklı nohut salatası', 2, 380, 33, 30, 12, [{ n: 'Ton balığı', q: '1 kutu' }, { n: 'Haşlanmış nohut', q: '1 su bardağı' }, { n: 'Domates, salatalık, maydanoz', q: '' }, { n: 'Limon, zeytinyağı', q: '1 tatlı kaşığı yağ' }], 'Hepsini karıştır. Pişirme yok, 2 günlük hazırlanabilir.'),
        recipe('Kıymalı mercimek + yoğurt', 4, 420, 32, 40, 13, [{ n: 'Kırmızı/yeşil mercimek', q: '1,5 su bardağı' }, { n: 'Az yağlı kıyma', q: '300 g' }, { n: 'Soğan, salça', q: '' }, { n: 'Yoğurt (servis)', q: '' }], 'Kıyma ve soğanı kavur, salça ve mercimeği ekle, su ile 25 dk pişir. Yoğurtla servis et. 4 porsiyon.'),
        recipe('Lorlu tost', 1, 300, 24, 28, 9, [{ n: 'Tam buğday ekmeği', q: '2 dilim' }, { n: 'Lor peyniri', q: '80 g' }, { n: 'Domates, maydanoz', q: '' }], 'Lorı maydanozla karıştır, ekmeğe sür, tost makinesinde 4 dk.')
      ],
      plan: {}, shop: []
    },
    workout: {
      templates: [{ id: id(), name: 'Antrenman A', exercises: [] }, { id: id(), name: 'Antrenman B', exercises: [] }],
      sessions: [], walks: []
    },
    school: { courses, sessions: [], items: [] },
    english: { course: { name: 'Udemy kursu', url: '', total: 0, done: 0 }, log: {}, cards: [], startWeek: '2026-11-09' },
    income: {
      work: [], currency: 'USD',
      ideas: [
        { id: id(), title: 'CrowdGen işi', status: 'deniyorum', notes: 'Başvuru ve ilk görevler. Çalıştığım saatleri ve kazancı "Çalışma kaydı"na yaz.', links: [], tasks: [{ id: id(), text: 'Hesabı ve profili tamamla', done: false }, { id: id(), text: 'İlk görevi bitir', done: false }], created: Date.now() },
        { id: id(), title: 'Etsy: dijital ürün', status: 'fikir', notes: 'Örnekler: öğrenci ders planlayıcısı (PDF), Notion şablonları, haftalık yemek planı şablonu, Canva sosyal medya şablonları.', links: [], tasks: [{ id: id(), text: 'Etsy\'de en çok satan 10 dijital ürüne bak', done: false }, { id: id(), text: 'Bir ürün fikri seç ve ilk taslağı yap', done: false }], created: Date.now() },
        { id: id(), title: 'YouTube: yapay zekâ videoları', status: 'fikir', notes: 'Kanal konusu? (ör. yapay zekâ araçları anlatımı, sessiz "faceless" videolar). Önce 5 örnek kanal incele.', links: [], tasks: [{ id: id(), text: '5 örnek kanal bul ve not al', done: false }], created: Date.now() },
        { id: id(), title: 'Teknik metin yazarlığı (freelance)', status: 'fikir', notes: 'Profilime en uygun alan: yapay zekâ ve ses teknolojisi ürünleri için B2B metinler, landing page, case study.', links: [], tasks: [{ id: id(), text: '2 örnek metin yaz (portföy)', done: false }], created: Date.now() }
      ],
      inbox: []
    },
    notes: { items: [] },
    reminders: { items: [] },
    goals: {
      items: [
        { id: id(), title: 'Finallere kadar düzenli quiz hazırlığı', area: 'okul', why: 'Final haftasında panik yaşamamak için.', deadline: '2027-01-04', milestones: [{ id: id(), text: 'Bütün quiz tarihlerini Okul bölümüne ekle', done: false }, { id: id(), text: 'Her odak dersine haftalık saat hedefini tuttur (2 hafta)', done: false }] },
        { id: id(), title: 'A2 İngilizceyi sağlamlaştırmak', area: 'ingilizce', why: 'B1 ve sonrasına sağlam temelle geçmek.', deadline: '2027-01-03', milestones: [{ id: id(), text: 'Udemy kursunu seç ve ekle', done: false }, { id: id(), text: '100 kelime kartı', done: false }, { id: id(), text: '8 haftalık programı bitir', done: false }] },
        { id: id(), title: 'Yağ oranımı düşürmek', area: 'spor', why: 'Kendimi güçlü ve güzel hissetmek; kas kaybetmeden.', deadline: '', milestones: [{ id: id(), text: 'Başlangıç kilosu ve bel ölçüsünü kaydet', done: false }, { id: id(), text: '4 hafta üst üste haftada 4 antrenman', done: false }, { id: id(), text: 'Haftada en az 4 gün evde yemek', done: false }] },
        { id: id(), title: 'İnternetten ilk gelirim', area: 'gelir', why: 'Kendi param, kendi özgürlüğüm.', deadline: '', milestones: [{ id: id(), text: 'CrowdGen\'de ilk ödeme', done: false }, { id: id(), text: 'Bir fikri gerçekten denemeye başla', done: false }] }
      ],
      rewards: [
        { id: id(), text: 'Yeni spor taytı', type: 'spor', target: 4, claimed: false },
        { id: id(), text: 'Sevdiğim bir cilt bakım ürünü', type: 'ilac', target: 30, claimed: false },
        { id: id(), text: 'Kendime güzel bir kahve ve kitap', type: 'ingilizce', target: 21, claimed: false }
      ]
    },
    review: { weeks: {} },
    doctor: {
      appts: [],
      questions: [
        { id: id(), text: 'Sürekli yeme isteği yaşıyorum; ilaçlarımla ilgisi olabilir mi?', done: false },
        { id: id(), text: 'Duş almak ve kendime bakmak çok zor geliyor; bunu nasıl kolaylaştırabilirim?', done: false }
      ],
      notes: []
    }
  };
}
export const SECTIONS = ['settings', 'schedule', 'meds', 'care', 'mood', 'sleep', 'body', 'food', 'workout', 'school', 'english', 'income', 'notes', 'reminders', 'goals', 'review', 'doctor'];
