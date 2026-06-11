import { useState } from 'react'
import {
  LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import axios from 'axios'

const scoreColor = (v) => v >= 7 ? '#10b981' : v >= 5 ? '#f59e0b' : '#ef4444'
const grade = (v) =>
  v >= 9 ? 'A+' : v >= 8 ? 'A' : v >= 7 ? 'B+' : v >= 6 ? 'B' :
  v >= 5 ? 'C+' : v >= 4 ? 'C' : 'D'

export default function Dashboard({ sessions }) {
  const [report,   setReport]  = useState(null)
  const [repLoading, setRL]    = useState(false)
  const [expanded, setExp]     = useState(null)

  const trend = [...sessions].reverse().map((s, i) => ({
    name:          `#${i + 1}`,
    overall:       +(s.averageScore       || 0).toFixed(1),
    technical:     +(s.technicalScore     || 0).toFixed(1),
    communication: +(s.communicationScore || 0).toFixed(1),
  }))

  const latest    = sessions[0]
  const radarData = [
    { skill: 'Technical',     score: +(latest?.technicalScore     || 0).toFixed(1) },
    { skill: 'Communication', score: +(latest?.communicationScore || 0).toFixed(1) },
    { skill: 'Overall',       score: +(latest?.averageScore       || 0).toFixed(1) },
  ]

  const best = sessions.length
    ? Math.max(...sessions.map((s) => s.averageScore || 0)).toFixed(1) : '—'
  const avg = sessions.length
    ? (sessions.reduce((a, s) => a + (s.averageScore || 0), 0) / sessions.length).toFixed(1) : '—'

  const fetchReport = async () => {
    if (!latest) { alert('Complete an interview first.'); return }
    setRL(true)
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_AI_URL || 'http://localhost:8000'}/api/answers/report`,
        { qa_pairs: (latest.answers || []).map((a) => ({
          question: a.question, answer: a.answer,
          score: a.overallScore, feedback: a.feedback,
        })) }
      )
      setReport(data)
    } catch (e) { alert('Report failed: ' + (e.message || 'Unknown error')) }
    finally { setRL(false) }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'inherit' }}>

      {/* Summary cards */}
      <div className="stats-grid">
        {[
          ['Interviews', sessions.length, '🎤'],
          ['Best score', best + '/10', '⭐'],
          ['Avg score',  avg  + '/10', '📊'],
          ['Latest grade', latest ? grade(latest.averageScore || 0) : '—', '🏅'],
        ].map(([label, val, icon]) => (
          <div key={label} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-val">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Score trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" style={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} style={{ fontSize: 11 }} />
              <Tooltip />
              <Legend style={{ fontSize: 12 }} />
              <Line dataKey="overall"       stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} name="Overall" />
              <Line dataKey="technical"     stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Technical" />
              <Line dataKey="communication" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Comm." />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Latest session radar</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="skill" style={{ fontSize: 11 }} />
              <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.28} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Coaching Report */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="chart-title" style={{ marginBottom: 0 }}>AI coaching report</div>
          <button onClick={fetchReport} disabled={repLoading || !sessions.length}
            className="btn btn-primary btn-sm">
            {repLoading ? 'Generating...' : 'Generate →'}
          </button>
        </div>
        {report && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:40, fontWeight:800, color:'var(--primary)' }}>{report.overall_grade}</div>
                <div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>Readiness</div>
                  <div style={{ fontSize:22, fontWeight:700, color: scoreColor((report.readiness_score||0)/10) }}>
                    {report.readiness_score}%
                  </div>
                </div>
              </div>
              <p style={{ fontSize:13, color:'#374151', lineHeight:1.65 }}>{report.summary}</p>
            </div>
            <div>
              {[
                ['✅ Strengths',    'var(--success)', report.strengths],
                ['📈 Improve',      'var(--danger)',  report.improvements],
                ['📚 Study topics', 'var(--primary)', report.recommended_topics],
              ].map(([title, color, items]) => (
                <div key={title} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:12, fontWeight:500, color, marginBottom:3 }}>{title}</div>
                  {(items || []).map((s) => (
                    <div key={s} style={{ fontSize:12, color:'#374151', marginBottom:2 }}>• {s}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session table */}
      <div className="chart-card">
        <div className="chart-title">Session history</div>
        <table className="sessions-table">
          <thead>
            <tr>
              {['#','Date','Status','Overall','Technical','Grade'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.id} onClick={() => setExp(expanded === s.id ? null : s.id)}>
                <td style={{ fontWeight:500 }}>{sessions.length - i}</td>
                <td style={{ color:'var(--text-muted)' }}>
                  {new Date(s.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td>
                  <span className={`badge ${s.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}`}>
                    {s.status}
                  </span>
                </td>
                <td style={{ color: scoreColor(s.averageScore || 0), fontWeight:600 }}>
                  {(s.averageScore || 0).toFixed(1)}/10
                </td>
                <td style={{ color: scoreColor(s.technicalScore || 0) }}>
                  {(s.technicalScore || 0).toFixed(1)}/10
                </td>
                <td style={{ fontSize:20, fontWeight:800, color: scoreColor(s.averageScore || 0) }}>
                  {grade(s.averageScore || 0)}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={6} style={{ color:'var(--text-muted)', textAlign:'center', padding:20 }}>
                No sessions yet
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
