import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Giriş başarısız')
        return
      }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_id', String(data.user_id))
      localStorage.setItem('email', data.email)
      navigate('/dashboard')
    } catch (err) {
      setError('Bağlantı hatası. Backend çalışıyor mu?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Giriş</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        Hesabın yoksa önce <strong>POST /create-user</strong> ile Swagger’dan kayıt ol.
      </p>
    </div>
  )
}
