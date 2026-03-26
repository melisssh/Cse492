import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || '/api'

export default function InterviewRun() {
  const { id } = useParams()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(-1) // -1: daha başlamadı
  const [finishing, setFinishing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speakQuestionText = useCallback(
    (text, lang) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text?.trim()) return
      stopSpeaking()
      const u = new SpeechSynthesisUtterance(text.trim())
      u.lang = lang === 'en' ? 'en-US' : 'tr-TR'
      u.rate = 0.92
      window.speechSynthesis.speak(u)
    },
    [stopSpeaking]
  )

  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    if (!id) return
    fetch(`${API}/interviews/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) navigate('/login')
        if (!res.ok) throw new Error('Mülakat alınamadı')
        return res.json()
      })
      .then(setInterview)
      .catch(() => setError('Mülakat bilgisi alınamadı'))
      .finally(() => setLoading(false))
  }, [id, token, navigate])

  useEffect(() => {
    // Sayfa kapanırken stream + seslendirme durdur
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // yoksay
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const currentQuestionText =
    interview?.questions?.[currentIndex]?.text ?? ''
  const interviewLang = interview?.language ?? 'tr'

  // Soru değişince (kayıt aktifken) otomatik sesli oku
  useEffect(() => {
    if (!recording || currentIndex < 0 || !currentQuestionText) return
    speakQuestionText(currentQuestionText, interviewLang)
    return () => stopSpeaking()
  }, [
    currentIndex,
    recording,
    currentQuestionText,
    interviewLang,
    speakQuestionText,
    stopSpeaking,
  ])

  async function handleStart() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Video kaydı başlat
      recordedChunksRef.current = []
      let recorder
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
        })
      } catch (recErr) {
        console.error('MediaRecorder başlatılamadı:', recErr)
        setError('Tarayıcın video kaydını desteklemiyor. Lütfen Chrome veya Edge ile dene.')
        return
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRemainingSeconds(120)
      setCurrentIndex(0) // izin + kayıt başladıktan SONRA ilk soru
    } catch (e) {
      setError('Kamera ve mikrofon izni verilmedi. Mülakat başlatılamadı.')
    }
  }

  async function stopAndUploadVideo() {
    const recorder = mediaRecorderRef.current
    setRecording(false)
    setRemainingSeconds(null)
    if (!recorder) return

    // Kayıt zaten durmuşsa sadece eldeki chunk'ları kullan
    if (recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        recorder.onstop = () => resolve()
        try {
          recorder.stop()
        } catch {
          resolve()
        }
      })
    }

    const chunks = recordedChunksRef.current || []
    if (!chunks.length) return

    const blob = new Blob(chunks, { type: 'video/webm' })
    const formData = new FormData()
    formData.append('file', blob, 'interview.webm')

    setUploading(true)
    try {
      await fetch(`${API}/interviews/${id}/video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
    } catch (e) {
      console.warn('Video upload başarısız:', e)
    } finally {
      setUploading(false)
    }
  }

  async function handleNext() {
    if (!interview?.questions) return
    const nextIndex = currentIndex + 1
    if (nextIndex < interview.questions.length) {
      setCurrentIndex(nextIndex)
      setRemainingSeconds(120)
    } else {
      // Mülakat bitti
      setFinishing(true)
      try {
        // Önce videoyu yüklemeye çalış
        await stopAndUploadVideo()

        await fetch(`${API}/interviews/${id}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'completed' }),
        })
      } catch {
        // hata olsa bile kullanıcıya çok yansıtma, loglamak yeter
      } finally {
        // Kamerayı kapat
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
        }
        setTimeout(() => {
          navigate(`/interview/${id}/sonuc`)
        }, 1500)
      }
    }
  }

  // Her soru için geri sayım (saniye)
  useEffect(() => {
    if (!recording || currentIndex < 0 || remainingSeconds == null) return
    if (remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev == null) return prev
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [recording, currentIndex, remainingSeconds])

  if (!token) return null
  if (loading) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>
  if (error || !interview) return <div style={{ padding: '2rem', color: 'red' }}>{error || 'Mülakat bulunamadı'}</div>

  const questions = interview.questions || []
  const total = questions.length
  const currentQuestion = currentIndex >= 0 && currentIndex < total ? questions[currentIndex] : null

  const minutes = remainingSeconds != null ? String(Math.floor(remainingSeconds / 60)).padStart(2, '0') : null
  const seconds = remainingSeconds != null ? String(remainingSeconds % 60).padStart(2, '0') : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/dashboard" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', textDecoration: 'none' }}>
          Mülakat Simülasyonu
        </Link>
        <span style={{ fontSize: '0.95rem', color: '#6b7280' }}>
          {interview.title}
        </span>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gap: '1.5rem', gridTemplateColumns: '3fr 2fr' }}>
        {/* Sol: büyük kamera alanı */}
        <section style={{ background: '#000', borderRadius: 12, overflow: 'hidden', minHeight: 320 }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            autoPlay
            muted
          />
        </section>

        {/* Sağ: AI avatar + sorular */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* AI avatar kutusu */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #e5e7eb' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#0f172a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              AI
            </div>
            <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
              Yapay zekâ mülakatçın seni dinliyor. Kameraya bakarak soruları yanıtla.
            </div>
          </div>

          {/* Soru ve kontroller */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Mülakat soruları
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              Mülakat, kamera ve mikrofon izinlerini verdikten sonra kayda alınır. Her soru için yaklaşık 2 dakika süren var.
            </p>

            {recording && (
              <p style={{ fontSize: '0.9rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                ● Kayıt alınıyor...
              </p>
            )}
            {uploading && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Video yükleniyor, lütfen sayfayı kapatma...
              </p>
            )}

            {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}

            {currentIndex === -1 && (
              <>
                <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
                  Başlamadan önce kamera ve mikrofon izni isteyeceğiz.
                </p>
                <button
                  type="button"
                  onClick={handleStart}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#111',
                    color: '#fff',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 500,
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Mülakata başla
                </button>
              </>
            )}

            {currentIndex >= 0 && currentQuestion && recording && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                    Soru {currentIndex + 1} / {total}
                  </p>
                  {remainingSeconds != null && (
                    <p style={{ fontSize: '0.9rem', color: '#111', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                      Kalan süre: {minutes}:{seconds}
                    </p>
                  )}
                </div>
                <div style={{ padding: '1rem', borderRadius: 8, background: '#f3f4f6', marginBottom: '0.75rem' }}>
                  {currentQuestion.text}
                </div>
                {typeof window !== 'undefined' && window.speechSynthesis && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => speakQuestionText(currentQuestion.text, interviewLang)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.85rem',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      Tekrar oku
                    </button>
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.85rem',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      Okumayı durdur
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={finishing}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#111',
                    color: '#fff',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 500,
                    fontSize: '1rem',
                    cursor: finishing ? 'not-allowed' : 'pointer',
                    opacity: finishing ? 0.7 : 1,
                  }}
                >
                  {currentIndex === total - 1 ? 'Mülakatı bitir' : 'Sonraki soru'}
                </button>
                {finishing && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#6b7280' }}>
                    Mülakat tamamlandı, sonuç sayfasına yönlendiriliyorsunuz…
                  </p>
                )}
              </>
            )}

            {currentIndex >= 0 && !currentQuestion && (
              <p>Mülakat soruları yüklenemedi.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

