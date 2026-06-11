import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/api.js'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await login(form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ email: data.email, name: data.name }))
      toast.success(`Welcome back, ${data.name}!`)
      nav('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🎤</div>
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-subtitle">Continue to Interview AI</p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="auth-field">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer">No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  )
}
