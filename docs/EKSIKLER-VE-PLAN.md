## Eksikler ve Plan (Selin tarafı)

Bu dosya, **senin sorumlu olduğun kısımlar** için eksikleri ve planı özetliyor. Melis’in video/STT/analiz tarafı burada yok.

---

## Ay sonu için özet (güncel)

**Veritabanı:** Şimdilik local MySQL (veya SQLite) kullanılıyor. Ortak DB (AWS/Aiven vb.) istenirse sonra sadece `DATABASE_URL` değiştirilecek; kod aynı kalacak.

### Tamamlananlar
- Giriş, kayıt, profil, dashboard
- Mülakat oluşturma, detay, “Mülakata başla” modalı
- Mülakat ekranı (InterviewRun): kamera/mikrofon, sorular, 2 dk timer, video kayıt + upload
- Mülakat silme: `DELETE /interviews/{id}` + Dashboard’da “Sil” butonu
- Şifre değiştirme: backend + Profil sayfasında form
- Şifre unuttum / reset: backend (token + endpoint’ler) + ForgotPassword + ResetPassword sayfaları
- Admin: `is_admin`, sadece admin’e “Admin” menüsü, Admin soru listesi + ekleme + düzenleme
- CORS, `VITE_API_URL` (lokal/production), MySQL uyumluluğu (String length, pymysql, cryptography)

### Ay sonu için kalan / öncelikli

| Öncelik | Ne | Not |
|--------|----|-----|
| **1** | **Şifre unuttum mail’i** | SMTP (Gmail/App Password) ile mail gerçekten gidiyor mu test et; gitmiyorsa debug. |
| **2** | **Email doğrulama** | Kayıt sonrası doğrulama linki + `email_verified` (kod varsa tamamla/test et). |
| **3** | **Admin panel geliştirme** | Soru silme (DELETE), kategori/dile göre filtreleme; düzenleme UX (inline/edit modal). |
| **4** | **Production hazırlık** | `SECRET_KEY` (ve diğer gizliler) `.env`’den okunsun; canlı frontend URL’i CORS’a eklensin. |
| **5** | **AI / sonuç ekranı (Melis ile)** | InterviewResult: feedback + transcript gösterimi, chat’te typing indicator / ilk mesaj vb. |
| **6** | **Küçük UX** | Mülakat ekranında süre 0’a inince kırmızı uyarı; MediaRecorder yoksa net mesaj; boş liste mesajları. |
| **7** | **README** | Backend/frontend çalıştırma komutları + env örneği (local MySQL/SQLite). |
| **8** | **Deploy (isteğe göre)** | Frontend: Vercel/Netlify. Backend: Render/Railway. Ortak DB sonraya bırakıldı. |

---

## 1. Eksikler (öncelik sırasına yakın)

### 1.1. Backend
- **Soru yönetimi endpoint kontrolleri**
  - `/questions` için şu anda GET/POST/PUT var, admin kontrolü yok.
  - İleride: sadece admin soru ekleyip güncellesin (opsiyonel).
- **Mülakat silme**
  - Eksik: `DELETE /interviews/{id}` endpoint’i yok.
  - Dashboard’dan “Sil” butonu için bu lazım.
- **Güvenlik / production hazırlığı**
  - `SECRET_KEY` şu an kodun içinde.
  - Production’da `.env`’den okunmalı.
  - CORS: canlı frontend adresine izin verecek ayar eklenecek.
- **Şifre işlemleri**
  - Şifre değiştirme (giriş yapmışken) → `POST/PUT /change-password` benzeri endpoint.
  - Şifre unuttum → reset token tablosu + “mail ile şifre sıfırlama” endpoint’leri.
  - Email doğrulama → kayıt sonrası doğrulama token’ı + doğrulama endpoint’i.

### 1.2. Frontend
- **Soru yönetimi arayüzü (admin)**
  - Önerilen route: `/admin/sorular`.
  - Özellikler:
    - Soru listesi (GET /questions).
    - Yeni soru ekleme (POST /questions).
    - Var olanı düzenleme (PUT /questions/{id}).
- **Mülakat silme**
  - Dashboard kartlarında “Sil” butonu.
  - Tıklayınca backend `DELETE /interviews/{id}` çağrılacak, sonra liste yenilenecek.
- **Şifre değiştirme ekranı**
  - Profil sayfasında “Şifre değiştir” kısmı (eski şifre + yeni şifre + tekrar).
- **Şifre unuttum akışı (UI)**
  - Login sayfasında “Şifremi unuttum”.
  - Email girilen ekran + “mail gönderildi” mesajı.
  - Maildeki linki açınca “yeni şifre belirle” ekranı.
  - Bu ekranlar backend’deki reset token endpoint’leri ile konuşacak.

---

## 2. Admin işlemleri

- Admin işlemleri için önerilen alan: **`/admin`** veya **`/admin/sorular`**.
- Sadece admin kullanıcılar görmeli:
  - Backend’de `User` modeline `is_admin` alanı eklemek veya admin id listesi tutmak mümkün.
  - Frontend’de JWT’deki bilgiye göre “Admin” menüsünü göstermek/gizlemek.
- İlk hedef:
  - **Soru yönetimi** (listele, ekle, düzenle).
  - İleride istenirse: kategori ekleme, kullanıcı/mülakat listesi.

---

## 3. Projenin internet sitesi olması (yayına alma)

Amaç: İnsanlar **tek bir link** ile siteye girsin (örn. `https://mulakat-sim.vercel.app`).

### 3.1. Frontend (React/Vite)
- Vercel veya Netlify’da host edilecek.
- Repo bağlanacak, `frontend` klasörü seçilecek.
- Build komutu: `npm run build`.
- Yayınlanan adres: `https://proje-adi.vercel.app` → **kullanıcının gireceği link**.

### 3.2. Backend (FastAPI)
- Render, Railway veya Fly.io gibi bir servise deploy edilecek.
- Komut: `uvicorn app.main:app` (veya uygun start komutu).
- Yayınlanan adres: `https://cse492-api.onrender.com` gibi bir API URL’si.

### 3.3. Frontend–backend bağlantısı
- Frontend’de production için env değişkeni:
  - `VITE_API_URL = https://cse492-api.onrender.com`
- Kodda:
  - `const API = import.meta.env.VITE_API_URL || '/api'`
  - Böylece lokal geliştirirken `/api`, canlıda gerçek URL kullanılır.

### 3.4. CORS ve gizli bilgiler
- Backend:
  - CORS ile `https://proje-adi.vercel.app` origin’ine izin verilecek.
  - `SECRET_KEY`, `OPENAI_API_KEY` vb. `.env` içinden okunacak.
- Canlıda:
  - Bu env değişkenleri hosting panelinde tanımlanacak.

---

## 4. Şifre ve email özellikleri (özet)

### 4.1. Şifre değiştirme (giriş yapmışken)
- Kullanıcı login olmuşken profil ekranından şifresini değiştirebilmeli.
- Backend:
  - Endpoint: `POST /change-password` (mevcut şifre + yeni şifre).
  - Mevcut şifre doğru mu kontrol edilir, sonra yeni şifre hash’lenir ve kaydedilir.
- Frontend:
  - Profil sayfasında küçük bir form.

### 4.2. Şifre unuttum (mail ile)
- Kullanıcı login değil; “Şifremi unuttum”a basıyor.
- Akış:
  1. Email girer.
  2. Backend o email için **reset token** üretir ve mail gönderir.
  3. Kullanıcı maile gelen linke tıklar (`/reset?token=...`).
  4. Yeni şifre belirler, backend token’ı doğrular ve şifreyi günceller.
- Gerekli:
  - Reset token saklamak (tablo veya benzeri).
  - Email gönderecek bir servis (SMTP, SendGrid, Resend, vb.).

### 4.3. Email doğrulama
- Kayıt sonrası:
  - Backend doğrulama token’ı üretir, linkli email gönderir.
  - Kullanıcı tıklarsa `email_verified = true` yapılır.
- Login olurken veya hassas işlemlerde “email doğrulandı mı?” kontrolü yapılabilir.

---

## 5. 1 aylık süre için hatırlatmalar (Selin)

Bu başlıklar, son 1 ayda akılda tutulması faydalı şeyler:

- **Öncelik belirle**  
  - “Demo için kesin gerekenler” ve “olursa iyi olur” listesi ayır.
  - Örn: giriş–kayıt–profil–mülakat–sonuç–chat + birkaç eksik = minimum.

- **Melis ile entegrasyon noktası**  
  - Transcript ve feedback senin backend’e nasıl gelecek (direkt DB mi, API mi)?
  - Mülakat bittikten sonra seni `Transcript` ve `Feedback` tablolarına kim/nerede yazacak, netleştir.

- **Test akışı**  
  - En azından manuel: “Kayıt → Profil → Yeni mülakat → Sonuç → Chat” zincirini birkaç kez dene.
  - Farklı tarayıcıda ve temiz token ile denemek iyi olur.

- **README ve çalıştırma notları**  
  - Backend/Frontend’i nasıl ayağa kaldıracağını (komutlar + env örneği) kısaca yaz.

- **Canlı deneme zamanı**  
  - İlk defa deploy için 1–2 gün ayır; env/CORS/DB gibi şeyler ilk denemede genelde sürpriz yapıyor.

---

Bu dosyayı haftalık görüşmelerde güncelleyebilirsin:  
Yeni eksik veya öncelik çıktıkça ilgili başlığa madde eklemek yeterli.

