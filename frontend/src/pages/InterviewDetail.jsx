import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || '/api'

export default function InterviewDetail() {
  const { id } = useParams()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
      .catch(() => setError('Yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id, token, navigate])

  if (!token) return null
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 1.5rem', padding: '2rem 1.75rem', borderRadius: 16, background: '#fff', textAlign: 'center', color: '#6b7280' }}>
        Yükleniyor...
      </div>
    </div>
  )
  if (error || !interview) return (
    <div style={{ minHeight: '100vh', background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 420, width: '100%', margin: '0 1.5rem', padding: '2rem 1.75rem', borderRadius: 16, background: '#fff', textAlign: 'center', color: '#dc2626' }}>
        {error || 'Bulunamadı'}
        <div style={{ marginTop: '1rem' }}>
          <Link to="/dashboard" style={{ fontSize: '0.9rem', color: '#111', textDecoration: 'underline' }}>
            Dashboard'a dön
          </Link>
        </div>
      </div>
    </div>
  )

  const hasResult = interview.transcript || (interview.feedback && (interview.feedback.summary || interview.feedback.strengths || interview.feedback.improvements))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'rgba(15,23,42,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          margin: '0 1.5rem',
          padding: '2.25rem 2rem',
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 24px 60px rgba(15,23,42,0.4)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '0.75rem' }}>
          MÜLAKAT HAZIR
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111', marginBottom: '0.25rem', lineHeight: 1.2 }}>
          {interview.title}
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          {interview.domain} · {interview.language}
        </p>

        <p style={{ fontSize: '0.95rem', color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Kamera ve mikrofon izni isteyeceğiz. Video kaydı alınırken sorular tek tek ekranda görünecek.
          Hazırsan mülakata başlayabilirsin.
        </p>

        <Link
          to={`/interview/${id}/run`}
          style={{
            display: 'inline-block',
            padding: '0.85rem 1.9rem',
            background: '#111',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 999,
            fontWeight: 500,
            fontSize: '1rem',
            minWidth: 190,
          }}
        >
          Mülakata başla
        </Link>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <Link to="/dashboard" style={{ color: '#6b7280', textDecoration: 'underline' }}>
            Daha sonra
          </Link>
          {hasResult && (
            <Link to={`/interview/${id}/sonuc`} style={{ color: '#111', textDecoration: 'underline' }}>
              Sonuçları gör
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
