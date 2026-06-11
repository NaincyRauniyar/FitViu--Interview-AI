import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { parseResume, startInterview } from '../services/api.js'
import toast from 'react-hot-toast'

export default function Home() {
  const [file,    setFile]    = useState(null)
  const [parsed,  setParsed]  = useState(null)
  const [step,    setStep]    = useState('upload')  // upload | preview
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)
  const nav = useNavigate()

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleParse = async () => {
    if (!file) return
    setLoading(true)
    try {
      const { data } = await parseResume(file)
      setParsed(data); setStep('preview')
      toast.success('Resume parsed successfully!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to parse. Make sure it is a text-based PDF.')
    } finally { setLoading(false) }
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const { data } = await startInterview({
        resumeText: parsed.raw_text,
        structured: parsed.structured,
      })
      sessionStorage.setItem('questions', JSON.stringify(data.questions))
      sessionStorage.setItem('role', parsed.structured?.role || 'Software Engineer')
      toast.success('Interview starting!')
      nav(`/interview/${data.session_id}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to start. Check AI service is running.')
    } finally { setLoading(false) }
  }

  const s = parsed?.structured

  return (
    <div className="home-page">
      <nav className="navbar">
        <span className="navbar-brand">🎤 Interview AI</span>
        <div className="navbar-links">
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Hi, {user.name || 'there'}</span>
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          <button onClick={() => { localStorage.clear(); nav('/login') }}
            className="btn btn-outline btn-sm">Sign out</button>
        </div>
      </nav>

      <div className="home-inner">
        <h1 style={{ fontSize:26, fontWeight:700, marginBottom:8 }}>Start an interview</h1>
        <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:28 }}>
          Upload your resume and AI will generate personalised interview questions.
        </p>

        {step === 'upload' && (
          <div>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              <div className="upload-icon">📄</div>
              <div className="upload-title">
                {file ? `✓ ${file.name}` : 'Click to upload your resume'}
              </div>
              <div className="upload-hint">PDF only · max 10 MB</div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }}
              onChange={(e) => setFile(e.target.files[0])} />
            <button className="btn btn-primary btn-full btn-lg"
              onClick={handleParse} disabled={!file || loading}>
              {loading ? 'Parsing resume...' : 'Parse Resume →'}
            </button>
          </div>
        )}

        {step === 'preview' && s && (
          <div>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:14 }}>
                Resume parsed — {s.name}
              </h3>
              {[
                ['Role',       s.role],
                ['Experience', `${s.experience_years ?? '?'} years`],
                ['Education',  s.education],
                ['Companies',  (s.companies || []).join(', ') || '—'],
                ['Skills',     (s.skills || []).slice(0, 8).join(', ')],
              ].map(([k, v]) => (
                <div className="parsed-row" key={k}>
                  <span className="parsed-key">{k}</span>
                  <span style={{ color:'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline" style={{ flex:1 }}
                onClick={() => { setStep('upload'); setFile(null); setParsed(null) }}>
                ← Different resume
              </button>
              <button className="btn btn-primary" style={{ flex:2 }}
                onClick={handleStart} disabled={loading}>
                {loading ? 'Generating questions...' : '🎤 Start Interview →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
