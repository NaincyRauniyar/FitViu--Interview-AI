import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSessions } from '../services/api.js'
import Dashboard from '../components/Dashboard.jsx'

export default function DashboardPage() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    getSessions()
      .then(({ data }) => { setSessions(data); setLoading(false) })
      .catch(() => { localStorage.clear(); nav('/login') })
  }, [])

  return (
    <div className="dash-page">
      <nav className="navbar">
        <span className="navbar-brand">🎤 Interview AI</span>
        <div className="navbar-links">
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{user.name}</span>
          <Link to="/" className="navbar-link">New interview</Link>
          <button onClick={() => { localStorage.clear(); nav('/login') }}
            className="btn btn-outline btn-sm">Sign out</button>
        </div>
      </nav>

      <div className="dash-inner">
        <div className="dash-header">
          <h1 className="dash-title">Dashboard</h1>
        </div>

        {loading ? (
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎤</div>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:20 }}>
              No interviews yet. Complete your first one to see analytics here.
            </p>
            <Link to="/" className="btn btn-primary">Start your first interview →</Link>
          </div>
        ) : (
          <Dashboard sessions={sessions} />
        )}
      </div>
    </div>
  )
}
