# GLOW

Bahar'ın kişisel yaşam uygulaması. Telefonda (iPhone, ana ekrana eklenmiş web uygulaması) ve bilgisayarda çalışır, iki cihaz arasında eşitlenir ve bildirim gönderir.

**Bölümler**
- **Bugün:** "Şimdi" kartı, unutma şeridi, haftanın öncelikleri, ilaçlar, hatırlatmalar, bakım, su/kalori/spor, günün planı, ruh hali, hızlı not, zor gün modu
- **Program:** haftalık çizelge, ders programı (kapalı "Okul" blokları), boşlukları doldurma, blok başına bildirim, final modu
- **Beden:** kalori ve makrolar, yiyecek listesi, yeme isteği kaydı, haftalık yemek planı, alışveriş listesi, tarifler, antrenman şablonları ve kaydı, haftalık spor grafiği, yürüyüş, kilo ve bel ölçüsü
- **Ben:** ilaçlar (takip + tekrar hatırlatma), yüz/saç/vücut/diş bakım rutinleri, ruh hali, uyku, doktor randevuları ve soruları
- **Alanlar:** okul (quiz/ödev, çalışma zamanlayıcısı), İngilizce (8 haftalık A2 programı, kelime kartları), Gelir Lab (CrowdGen, fikirler, bakılacaklar), notlar, hedefler ve ödüller, haftalık değerlendirme, ayarlar

## Nasıl çalışır

- `public/` uygulamanın kendisi (HTML/CSS/JS, derleme yok).
- `worker/` Cloudflare Worker: uygulamayı sunar, verileri saklar (KV), her dakika bildirim zamanı gelenleri gönderir (Web Push).
- `public/js/schedule.js` hem uygulama hem sunucu tarafından kullanılan bildirim mantığı.
- Veriler GLOW şifresiyle korunur. Şifre sunucuda yalnızca özet (hash) olarak durur.

## Kurulum (bir kez)

1. Ücretsiz bir Cloudflare hesabı aç: https://dash.cloudflare.com/sign-up
2. Bir API anahtarı oluştur: *My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"* şablonu.
3. Yayınla:
   ```
   npm install
   CLOUDFLARE_API_TOKEN=... npm run deploy:first
   ```
   Komut veri deposunu ve bildirim anahtarlarını oluşturur, uygulamayı `https://glow.<hesap-adın>.workers.dev` adresine yükler.
4. iPhone'da bu adresi **Safari**'de aç → **Paylaş** → **Ana Ekrana Ekle**. Ana ekrandaki GLOW'dan aç.
5. **Alanlar → Ayarlar**: "İlk kez: şifre belirle", sonra "Bildirimleri aç".
6. Bilgisayarda aynı adresi aç, aynı şifreyle **Giriş yap**.

## Geliştirme

```
npm install
npm run dev     # http://localhost:8787 (VAPID anahtarları .dev.vars içinde)
npm test        # bildirim şifreleme ve zamanlama testleri
```
