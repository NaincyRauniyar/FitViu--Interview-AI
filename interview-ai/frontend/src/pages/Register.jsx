import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../services/api.js'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await register(form)
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
        <h2 className="auth-title">Check your email</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:8, lineHeight:1.7 }}>
          We sent a verification link to <strong>{form.email}</strong>.
          Click it to activate your account, then sign in.
        </p>
        <Link to="/login" className="btn btn-primary btn-full btn-lg" style={{ marginTop:20, display:'flex' }}>
          Go to Sign in →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🎤</div>
        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Start practising interviews for free</p>
        <form onSubmit={submit}>
          {[['Full name','text','Your name',form.name,(v)=>setForm({...form,name:v})],
            ['Email','email','you@example.com',form.email,(v)=>setForm({...form,email:v})],
            ['Password','password','Min 8 characters',form.password,(v)=>setForm({...form,password:v})]
          ].map(([label,type,ph,val,onChange])=>(
            <div className="auth-field" key={label}>
              <label className="label">{label}</label>
              <input className="input" type={type} placeholder={ph}
                required minLength={type==='password'?8:undefined}
                value={val} onChange={(e)=>onChange(e.target.value)} />
            </div>
          ))}
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="auth-footer">Have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
