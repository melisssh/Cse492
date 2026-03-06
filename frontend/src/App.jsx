import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InterviewNew from './pages/InterviewNew'
import Profile from './pages/Profile'
import InterviewDetail from './pages/InterviewDetail'

function Nav() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('email')
    navigate('/login')
  }
  return (
    <nav style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Link to="/login">Login</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/interview/new">Yeni Mülakat</Link>
      <Link to="/profile">Profil</Link>
      {token && (
        <button type="button" onClick={logout} style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem' }}>
          Çıkış
        </button>
      )}
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/new" element={<InterviewNew />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/interview/:id" element={<InterviewDetail />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  )
}
