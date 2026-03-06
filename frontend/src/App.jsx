import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InterviewNew from './pages/InterviewNew'
import Profile from './pages/Profile'
import InterviewDetail from './pages/InterviewDetail'

function Nav() {
  return (
    <nav style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem' }}>
      <Link to="/login">Login</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/interview/new">Yeni Mülakat</Link>
      <Link to="/profile">Profil</Link>
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
