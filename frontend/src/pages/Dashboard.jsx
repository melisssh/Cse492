import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = '/api'

export default function Dashboard() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetch(`${API}/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          navigate('/login')
          return
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setInterviews(data)
      })
      .catch(() => setError('Liste alınamadı'))
      .finally(() => setLoading(false))
  }, [token, navigate])

  if (!token) return null

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Mülakatlarım</h1>
      <p style={{ marginBottom: '1rem' }}>
        <Link to="/interview/new" style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: 4 }}>
          + Yeni mülakat
        </Link>
      </p>
      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && interviews.length === 0 && (
        <p style={{ color: '#666' }}>Henüz mülakat yok. "Yeni mülakat" ile oluştur.</p>
      )}
      {!loading && interviews.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {interviews.map((i) => (
            <li key={i.id} style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '0.5rem', borderRadius: 4 }}>
              <Link to={`/interview/${i.id}`} style={{ fontWeight: 600, textDecoration: 'none', color: '#333' }}>
                {i.title}
              </Link>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                {i.domain} · {i.language} · {i.status}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
