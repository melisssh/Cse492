# Analysis Modülü – Teknik Taslak (Melis)

Bu doküman, video mülakat analiz pipeline'ının ilk prototip taslağını
özetler. Amaç, 4 hafta sonunda uçtan uca çalışan (dummy STT + basit
kural tabanlı skorlar) bir akış elde etmektir.

---

## 1. Genel Akış

1. Kullanıcı bir mülakat oluşturur (`Interview` kaydı).
2. (İleride) Kullanıcı video kaydını yükler:
   - Endpoint: `POST /interviews/{id}/video`
   - FastAPI `UploadFile` ile dosya alınır.
   - Dosya `uploads/interviews/{id}/` klasörüne kaydedilir.
3. Kullanıcı analiz tetikler:
   - Endpoint: `POST /interviews/{id}/analyze`
   - Adımlar:
     1. Video'dan ses çıkarma (ffmpeg veya benzeri)
     2. STT servisi ile transcript üretme
     3. Transcript'i `Transcript` tablosuna yazma
     4. Transcript'ten metrik ve skor üretme
     5. `Feedback` tablosuna özet ve önerileri kaydetme
4. Frontend tarafında `GET /interviews/{id}` çağrısı ile
   `transcript` ve `feedback` alanları ekranda gösterilir.

---

## 2. STT (Speech-to-Text) Planı

### 2.1. Kısa vadeli çözüm (prototip)

- Modül: `backend/app/analysis/stt.py`
- Fonksiyon: `get_transcript(interview_id: int) -> (text, duration_seconds)`
- Şu an için:
  - Dummy, sabit bir Türkçe metin döndürür.
  - Süre bilgisi opsiyonel (`None`).
- Amaç:
  - Backend akışını ve veritabanı yazma işlemlerini test etmek.
  - Frontend'de transcript'in doğru göründüğünü doğrulamak.

### 2.2. Orta vadede hedeflenen entegrasyon

- **STT seçeneği:** OpenAI Whisper API veya lokal Whisper modeli.
- **Adımlar:**
  1. Video dosya yolunu `Interview` veya ayrı bir tablo üzerinden bul.
  2. ffmpeg ile video'dan ses dosyası çıkar:
     - Örn. `ffmpeg -i input.mp4 -ac 1 -ar 16000 output.wav`
  3. Ses dosyasını STT servisine gönder.
  4. Dönen metni ve süre bilgisini `Transcript` tablosuna yaz.
- Tasarım kararı:
  - STT ile ilgili tüm dış bağımlılıklar `stt.py` içinde tutulacak.
  - Gerçek STT'ye geçmek için sadece bu modülü güncellemek yeterli olacak.

---

## 3. Video Özellik Çıkarımı (MediaPipe vb.)

- Modül: `backend/app/analysis/video_features.py`
- Fonksiyon: `extract_features(video_path: str) -> Dict[str, float]`
- İlk hedefler:
  - Yüz görünürlük oranı
  - Göz teması/sabitlik (frame'ler arası kafa hareketi)
  - Basit jest/pozisyon metrikleri (örneğin çok hızlı hareket vs. stabil duruş)
- Kısa vadede:
  - Fonksiyon boş sözlük döndürüyor (dummy).
  - Pipeline tasarımı yapıldıktan sonra MediaPipe entegrasyonuna başlanacak.

---

## 4. Kural Tabanlı Skorlama ve Feedback

- Modül: `backend/app/analysis/scoring.py`
- Fonksiyon: `score_transcript(transcript: str, duration_seconds: int | None)`

### 4.1. Hesaplanan metrikler (şimdilik)

- `total_words`: Toplam kelime sayısı
- `filler_count`: Filler kelime sayısı
- `filler_ratio`: Filler / toplam kelime oranı
- `duration_seconds`: (varsa) konuşma süresi

### 4.2. Skorlar (0–100)

- `length`:
  - 80–200 kelime arası ≈ 100 puan
  - Çok kısa cevaplarda düşük, çok uzun cevaplarda orta seviye puan.
- `filler_usage`:
  - Filler oranı %0 → 100
  - %40 ve üzeri → 0
- `overall`:
  - Uzunluk ve filler skorlarının ortalaması.

### 4.3. Metinsel feedback

- `summary`: Genel durum özeti (“Güçlü ve akıcı cevap”, “Geliştirmeye açık” vb.)
- `strengths`: Güçlü yönler (yeterli uzunluk, düşük filler oranı gibi)
- `improvements`: Gelişim önerileri (cevabı detaylandır, filler kelimeleri azalt vb.)

Bu alanlar `Feedback` tablosuna şu şekilde yazılır:

- `scores_json`: `{"length": ..., "filler_usage": ..., "overall": ...}`
- `summary`: kısa paragraf
- `strengths`: 1–2 cümle
- `improvements`: 1–3 cümle

---

## 5. Endpoint Davranışı

### 5.1. `POST /interviews/{id}/video`

- Auth: `get_current_user` ile kullanıcı doğrulaması.
- Kısa vadede:
  - Dosya alınıyor ama diske kaydedilmiyor.
  - Yanıt: `{"status": "video upload - TODO", "filename": "<dosya-adı>"}`.
- Uzun vadede:
  - Dosya `uploads/interviews/{id}/` altına kaydedilecek.
  - Dosya yolu veritabanında saklanacak (ör. `Interview.video_path`).

### 5.2. `POST /interviews/{id}/analyze`

- Adımlar:
  1. İlgili `Interview` kaydının var ve kullanıcıya ait olduğunu doğrula.
  2. `stt.get_transcript(id)` ile transcript ve süreyi al.
  3. `Transcript` tablosunda insert/update yap.
  4. `scoring.score_transcript(...)` çağırarak skor ve feedback üret.
  5. `Feedback` tablosunda insert/update yap.
  6. Özet olarak transcript, skorlar ve metinsel feedback'i JSON olarak döndür.

- Sonuç:
  - `GET /interviews/{id}` çağrısında:
    - `transcript` alanı dolu,
    - `feedback` altında `scores_json`, `summary`, `strengths`, `improvements`
      verileri dönüyor olacak.

---

Bu taslak, Melis için Hafta 1–3 görevlerine temel oluşturmaktadır. Hafta
4'te gerçek video upload ve STT entegrasyonu eklendiğinde, mevcut
fonksiyon imzaları korunarak içerik zenginleştirilecektir.

