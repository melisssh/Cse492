import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

export default function InterviewNew() {
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState('')
  const [language, setLanguage] = useState('tr')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetch(`${API}/categories`)
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => setError('Kategoriler alınamadı'))
  }, [token, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, domain, language }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Mülakat oluşturulamadı')
        return
      }
      navigate(`/interview/${data.id}`)
    } catch (err) {
      setError('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Yeni mülakat</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Başlık
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Backend mülakatı"
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <label>
          Kategori (domain)
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="">Seçin</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} – {c.description}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dil
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </label>
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
          {loading ? 'Oluşturuluyor...' : 'Mülakatı başlat'}
        </button>
      </form>
    </div>
  )
}
