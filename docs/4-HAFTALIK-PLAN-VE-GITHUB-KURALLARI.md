# CSE492 – 4 Haftalık Prototip Planı ve GitHub Çalışma Kuralları

Bu doküman **Selin** ve **Melis** için ortak referanstır. İkiniz de kendi Cursor/IDE’nize bu planı kopyalayıp kullanabilirsiniz. 1 ay sonunda hocaya gösterilecek **çalışan prototip** hedeflenmektedir.

---

## 1. İş bölümü özeti

| Kişi | Sorumluluk alanı | Ana dosya/klasörler |
|------|-------------------|----------------------|
| **Selin** | Auth, JWT, Interview/Question API’leri, React arayüzü, Profil, AI Chat endpoint | `backend/app/main.py` (auth, interviews, categories, questions, profile, chat), `frontend/` |
| **Melis** | Video upload, STT, kural tabanlı analiz, Feedback üretimi | `backend/app/analysis/`, `main.py` içinde `/video` ve `/analyze` endpoint’leri |

**Ortak (birlikte karar verin):** `backend/app/models.py` (yeni tablo/alan eklerken), mimari kararlar, demo senaryosu.

---

## 2. GitHub’da nasıl çalışacağız?

### 2.1 Branch stratejisi

- **`main`** → Her zaman çalışan, demo’ya hazır versiyon. Sadece birbirinizin onayladığı PR’lar merge edilir.
- **Selin** kendi branch’inde çalışır: örn. `feature/selin-auth-and-interview`
- **Melis** kendi branch’inde çalışir: örn. `feature/melis-analysis-engine`

Aynı anda ikiniz de `main`’e doğrudan push **yapmayın**. Önce kendi branch’inize push, sonra **Pull Request (PR)** açın; diğeri incelesin (veya hızlı ilerliyorsanız kısa notla merge edin).

### 2.2 Günlük / haftalık ritüel

1. **İşe başlamadan önce:**  
   `git checkout main`  
   `git pull origin main`  
   Sonra kendi branch’inize geçin:  
   `git checkout feature/selin-auth-and-interview` (veya Melis için kendi branch adı)  
   Gerekirse main’i kendi branch’inize alın:  
   `git merge main`

2. **Çalışırken:**  
   Küçük, anlamlı commit’ler atın:  
   `git add ...`  
   `git commit -m "JWT login token döndürüyor"`  
   `git push origin feature/selin-auth-and-interview`

3. **Bir özellik bitince:**  
   GitHub’da **Pull Request** açın:  
   - “Merge `feature/selin-auth-and-interview` into `main`”  
   - Açıklamada ne yaptığınızı kısaca yazın.  
   Diğeri PR’ı açar, kodu gözden geçirir (mümkünse), **Merge** eder.  
   Merge sonrası ikiniz de:  
   `git checkout main`  
   `git pull origin main`  
   yapın; böylece güncel `main` ile devam edersiniz.

### 2.3 Çakışmayı azaltmak için

- **Selin** mümkün olduğunca `main.py` içinde **üst kısımlara** (auth, interviews, categories, questions, profile, chat) dokunur.
- **Melis** `main.py`’e sadece **yeni endpoint blokları** ekler: `/interviews/{id}/video`, `/interviews/{id}/analyze`. Mümkünse bu endpoint’leri dosyanın **sonuna** ekleyin; böylece aynı satırlara aynı anda yazma ihtimali azalır.
- **models.py** değişecekse (ör. Profile tablosu, yeni alanlar) önce **konuşun**. Bir kişi değişikliği yapsın, PR açsın; diğeri ondan sonra kendi işine devam etsin.

### 2.4 Çakışma çıkarsa (merge conflict)

- GitHub’da PR açtığınızda “Merge conflict” uyarısı çıkabilir.  
- Conflict’i çözmek için:  
  - `git checkout main`  
  - `git pull origin main`  
  - `git checkout feature/sizin-branch`  
  - `git merge main`  
  - Aynı dosyada conflict olan satırlar `<<<<<<<`, `=======`, `>>>>>>>` ile işaretlenir. Bu blokları elle düzenleyip hangi kodu tutacağınıza karar verin.  
  - `git add ...` → `git commit -m "Conflict çözüldü"` → `git push`  
  - Sonra PR’ı tekrar deneyin.

---

## 3. 4 haftalık detaylı görevler

### Hafta 1

#### Selin – Hafta 1

- **JWT ve auth**
  - Login endpoint’i giriş başarılı olduğunda JWT token üretsin (`access_token`, `token_type`, `user_id`, `email`).
  - `get_current_user` dependency’si: `Authorization: Bearer <token>` header’ından token alıp kullanıcıyı döndürsün; geçersiz token’da 401 dönsün.
  - `GET /interviews`, `POST /interviews`, `GET /interviews/{id}` bu token’ı kullansın (artık `user_id` query parametresi yok).
- **Soru havuzu API’leri**
  - `GET /questions`: query parametreleri `category_id`, `language`, `is_active` (opsiyonel). Dönen liste bu filtreye göre filtrelenmiş olsun.
  - `POST /questions`: body’de `text`, `category_id`, `language`, `difficulty` (opsiyonel), `is_active` (varsayılan 1). Yeni soru eklesin.
  - `PUT /questions/{id}`: aynı alanlarla mevcut soruyu güncellesin.
- **Frontend iskeleti**
  - Proje kökünde `frontend/` klasörü oluştur; React (Create React App veya Vite) veya Next.js ile proje kur.
  - Şu route’ların iskelet sayfalarını aç (içerik şimdilik “Bu sayfa X” yazısı olabilir): `/login`, `/dashboard`, `/interview/new`, `/profile`, `/interview/:id`.

#### Melis – Hafta 1

- **Analysis modülü**
  - `backend/app/analysis/` klasörünü oluştur.
  - İçinde: `__init__.py`, `stt.py`, `video_features.py`, `scoring.py`.
  - Her birinde en az bir fonksiyon taslağı olsun (örn. `def transcribe(audio_path): return ""`).
- **Endpoint iskeletleri**
  - `main.py`’in **sonuna** (diğer endpoint’lere dokunmadan) ekle:
    - `POST /interviews/{interview_id}/video`: şimdilik body’de veya form’da dosya almayı deneyebilirsin; işlem yapmadan `{"status": "video upload - TODO"}` dönsün.
    - `POST /interviews/{interview_id}/analyze`: şimdilik `{"status": "analyze - TODO"}` dönsün. İleride burada `stt` ve `scoring` modüllerini çağıracaksın.
- **Teknik plan (kısa doküman)**
  - `docs/analysis-plan.md` (veya benzeri) oluştur: Hangi STT (Whisper API / lokal)? Video’dan hangi özellikler çıkarılacak (MediaPipe ile ne)? Hangi metriklerden skor üretilecek? 1–2 sayfa taslak.

---

### Hafta 2

#### Selin – Hafta 2

- **Mülakat oluşturma akışı**
  - `POST /interviews` içinde: istekte gelen `domain` (kategori) ve `language`’a göre `Question` tablosundan uygun soruları seç (örn. 5–8 adet). Her biri için `InterviewQuestion` kaydı oluştur (`interview_id`, `question_id`, `order`).
  - `GET /interviews/{id}` zaten `InterviewQuestion` + `Question` ile soruları döndürüyor; bunun doğru çalıştığını test et.
- **React – Login ve Dashboard**
  - Login sayfası: form (email, şifre) → `POST /login` → gelen `access_token`’ı sakla (localStorage veya state). Sonra dashboard’a yönlendir.
  - Dashboard sayfası: `GET /interviews` çağrısını `Authorization: Bearer <token>` ile yap; gelen listeyi kart/liste olarak göster. “Yeni mülakat” butonu `/interview/new`’e gitsin.
- **React – Yeni mülakat formu**
  - `GET /categories` ile dropdown’u doldur. Kullanıcı başlık, domain (kategori), dil seçsin. “Mülakatı başlat” → `POST /interviews` → dönen `id` ile `/interview/:id` sayfasına yönlendir.

#### Melis – Hafta 2

- **STT pipeline (dummy)**
  - `analysis/stt.py` içinde bir fonksiyon: örn. `def get_transcript(interview_id)` veya `def transcribe_from_audio_path(path)`. Şimdilik sabit bir metin (dummy transcript) döndürsün.
  - `POST /interviews/{id}/analyze` içinde bu fonksiyonu çağır; dönen metni `Transcript` tablosuna yaz (`interview_id`, `text`, `duration_seconds` opsiyonel). Gerekirse `Transcript` modeli zaten var; sadece `main.py`’de bu endpoint’i bağla.
  - Sonuç: `GET /interviews/{id}` çağrıldığında `transcript` alanı dolu gelsin (dummy bile olsa).

---

### Hafta 3

#### Selin – Hafta 3

- **Profil**
  - `Profile` modeli: `user_id` (FK User), `full_name`, `department`, `experience_level`, `target_position` (ve istersen `cv_path`). `models.py`’e ekle; migration veya `create_all` ile tabloyu oluştur.
  - `GET /profile`: token’daki kullanıcının profil bilgisi (yoksa boş obje).
  - `PUT /profile`: body’de gelen alanları güncelle.
  - React’te `/profile` sayfası: form (ad, bölüm, deneyim seviyesi, hedef pozisyon) + “Kaydet” → `PUT /profile`.
- **Sonuç sayfası UI**
  - `/interview/:id` sayfası: `GET /interviews/{id}` ile veriyi al. Transcript, feedback (skorlar, summary, strengths, improvements) alanlarını ekranda göster. Henüz feedback yoksa “Analiz bekleniyor” gibi mesaj gösterilebilir.

#### Melis – Hafta 3

- **Kural tabanlı skor ve feedback**
  - `analysis/scoring.py` içinde: transcript metnini alan bir fonksiyon; konuşma süresi (metin uzunluğu veya süre), filler kelime oranı (örn. “şey”, “yani”, “ıı”) gibi basit metrikler hesaplasın. Bu metriklerden 1–2 kategoride 0–100 arası puan üret.
  - Aynı modülde veya ayrı: `summary`, `strengths`, `improvements` için basit şablon metinler üret (örn. uzunluğa göre “Cevap yeterli uzunlukta” / “Daha detay verebilirsiniz”).
  - `POST /interviews/{id}/analyze` akışı: önce transcript (dummy veya STT), sonra bu skorlama fonksiyonunu çağır; sonucu `Feedback` tablosuna yaz (`interview_id`, `scores_json`, `summary`, `strengths`, `improvements`).
  - `GET /interviews/{id}` ile feedback’in dolu geldiğini test et.

---

### Hafta 4

#### Selin – Hafta 4

- **AI Chat**
  - `POST /interviews/{id}/chat`: body’de `message`. Bu mülakata ait `Transcript` ve `Feedback` bilgisini al; isteğe bağlı olarak LLM API’ye (OpenAI vb.) context ile birlikte gönder, dönen cevabı yanıt olarak döndür. (Zaman yoksa ilk aşamada sabit bir “Örnek gelişim önerisi” metni de dönebilir.)
  - React’te sonuç sayfasına basit bir chat bölümü: input + “Gönder” → `POST /interviews/{id}/chat` → cevabı ekranda göster.
- **UI cilalama**
  - Navigasyon (login’den dashboard’a, dashboard’dan profil / yeni mülakat / detay), loading göstergeleri, basit hata mesajları. Hocaya demo için ekranların tutarlı ve anlaşılır olması yeterli.

#### Melis – Hafta 4

- **Video upload**
  - `POST /interviews/{id}/video`: FastAPI `UploadFile` ile gelen dosyayı al; sunucuda belirli bir klasöre (örn. `uploads/interviews/{id}/`) kaydet. Dosya yolunu veritabanında saklamak için gerekirse `Interview` modeline `video_path` alanı eklenebilir (Selin ile koordineli).
- **STT entegrasyonu**
  - `analysis/stt.py`: Gerçek STT servisini (Whisper API veya seçtiğiniz başka bir servis) entegre etmeye başlayın. Video’dan ses çıkarma (ffmpeg vb.) + STT çağrısı + transcript’i DB’ye yazma. Zaman yetmezse en azından fonksiyon imzası ve çağrı yeri hazır olsun; dummy’den gerçek STT’ye geçiş tek noktadan yapılabilsin.

---

## 4. 1 ay sonunda demo hedefi

- Kullanıcı kayıt olup giriş yapabiliyor (JWT).
- Dashboard’da mülakat listesi görünüyor; “Yeni mülakat” ile kategori/dil seçip mülakat oluşturuluyor.
- Mülakat detayında sorular listeleniyor; “Mülakatı bitir” benzeri akışla sonuç sayfasına geçiliyor.
- Sonuç sayfasında transcript ve feedback (skorlar + kısa metin) görünüyor.
- Profil sayfasından ad, bölüm, deneyim vb. güncellenebiliyor.
- (İsteğe bağlı) Sonuç sayfasında chat ile “Nasıl gelişebilirim?” sorusuna kısa bir cevap alınabiliyor.

Video kaydı tam entegre olmasa bile “akış bu şekilde, video/STT burada devreye girecek” şekilde anlatılabilir.

---

## 5. Kısa notlar

- **models.py** değişikliği yapacak kişi (Profile, video_path vb.) önce diğerini bilgilendirsin; aynı anda aynı dosyada değişiklik yapmayın.
- **main.py**’de Selin üst/orta kısımlara, Melis yeni endpoint’leri mümkünse sona eklesin.
- Belirsiz bir nokta olursa bu dokümana bakın veya kısa mesajla koordinasyon yapın. İkiniz de bu planı Cursor’da referans olarak kullanabilirsiniz.
