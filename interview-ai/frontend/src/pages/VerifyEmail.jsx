import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus]   = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setMessage('No token found in link.'); return }
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    axios.get(`${base}/api/auth/verify?token=${token}`)
      .then(() => { setStatus('success'); setMessage('Email verified! You can now sign in.') })
      .catch((e) => { setStatus('error'); setMessage(e.response?.data?.message || 'Verification failed or link expired.') })
  }, [])

  const icon  = { verifying:'⏳', success:'✅', error:'❌' }[status]
  const color = { verifying:'var(--text-muted)', success:'var(--success)', error:'var(--danger)' }[status]

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
        <h2 className="auth-title">Email verification</h2>
        <p style={{ fontSize:13, color, marginTop:8, lineHeight:1.7, marginBottom:20 }}>{message || 'Verifying your link...'}</p>
        {status === 'success' && (
          <Link to="/login" className="btn btn-primary btn-full" style={{ display:'flex' }}>
            Sign in →
          </Link>
        )}
      </div>
    </div>
  )
}
