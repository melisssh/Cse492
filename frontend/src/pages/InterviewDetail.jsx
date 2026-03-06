import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = '/api'

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
  if (loading) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>
  if (error || !interview) return <div style={{ padding: '2rem', color: 'red' }}>{error || 'Bulunamadı'}</div>

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>{interview.title}</h1>
      <p style={{ color: '#666' }}>{interview.domain} · {interview.language} · {interview.status}</p>

      <h2>Sorular</h2>
      {interview.questions?.length ? (
        <ol>
          {interview.questions.map((q, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>{q.text}</li>
          ))}
        </ol>
      ) : (
        <p style={{ color: '#666' }}>Bu mülakat için henüz soru atanmamış veya kategoride o dilde soru yok.</p>
      )}

      {interview.transcript && (
        <>
          <h2>Transcript</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{interview.transcript}</p>
        </>
      )}
      {interview.feedback && (
        <>
          <h2>Geri bildirim</h2>
          <p>{interview.feedback.summary}</p>
          {interview.feedback.strengths && <p><strong>Güçlü yönler:</strong> {interview.feedback.strengths}</p>}
          {interview.feedback.improvements && <p><strong>Gelişim:</strong> {interview.feedback.improvements}</p>}
        </>
      )}
      {!interview.transcript && !interview.feedback && (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>Video yüklenip analiz edildikten sonra transcript ve geri bildirim burada görünecek.</p>
      )}
    </div>
  )
}
