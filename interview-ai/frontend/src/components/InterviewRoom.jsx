import { useState, useRef, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { useAntiCheat } from '../hooks/useAntiCheat.js'
import FaceDetector from './FaceDetector.jsx'
import { submitAnswer } from '../services/api.js'

export default function InterviewRoom({ questions: initQs, sessionId, role, onFinish }) {
  const [questions, setQuestions]   = useState(initQs)
  const [idx, setIdx]               = useState(0)
  const [recording, setRecording]   = useState(false)
  const [transcript, setTranscript] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [phase, setPhase]           = useState('question') // question|answering|evaluated
  const [timeLeft, setTimeLeft]     = useState(120)
  const [silenceSec, setSilenceSec] = useState(0)

  const webcamRef   = useRef(null)
  const recogRef    = useRef(null)
  const timerRef    = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const silenceRef  = useRef(null)
  const covered     = useRef([])

  const { violations, addViolation } = useAntiCheat()

  // ── TTS: speak question ────────────────────────────────────
  const speak = useCallback((text) => {
    if (!text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.88; u.pitch = 1
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => {
    if (questions[idx]) {
      setPhase('question')
      speak(questions[idx].question)
    }
    return () => window.speechSynthesis.cancel()
  }, [idx])

  // ── Countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'answering') { clearInterval(timerRef.current); return }
    setTimeLeft(120)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); handleStop(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, idx])

  // ── Start recording ────────────────────────────────────────
  const handleStart = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Please use Chrome or Edge for voice support.'); return }

    // Silence detection
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx    = new AudioContext()
      const node   = ctx.createAnalyser()
      ctx.createMediaStreamSource(stream).connect(node)
      node.fftSize = 512
      audioCtxRef.current = ctx
      analyserRef.current = { node, stream }
      let ms = 0
      silenceRef.current = setInterval(() => {
        const buf = new Uint8Array(node.frequencyBinCount)
        node.getByteFrequencyData(buf)
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length
        if (avg < 5) {
          ms += 500; setSilenceSec(Math.floor(ms / 1000))
          if (ms >= 15000) addViolation('15 s silence detected')
        } else { ms = 0; setSilenceSec(0) }
      }, 500)
    } catch { /* mic denied — keyboard fallback still works */ }

    const rec = new SR()
    rec.continuous = true; rec.interimResults = true
    rec.onresult = (e) =>
      setTranscript(Array.from(e.results).map((r) => r[0].transcript).join(''))
    rec.onerror = () => addViolation('Microphone error')
    recogRef.current = rec
    rec.start()
    setRecording(true); setPhase('answering')
  }

  const cleanAudio = () => {
    clearInterval(silenceRef.current); setSilenceSec(0)
    analyserRef.current?.stream.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close(); audioCtxRef.current = null
  }

  // ── Stop and evaluate ──────────────────────────────────────
  const handleStop = async () => {
    recogRef.current?.stop()
    clearInterval(timerRef.current); cleanAudio()
    setRecording(false); setLoading(true)
    window.speechSynthesis.cancel()
    try {
      const { data } = await submitAnswer(sessionId, {
        question: questions[idx].question,
        answer:   transcript.trim() || '(no answer provided)',
        category: questions[idx].category,
        role:     role || 'Software Engineer',
      })
      setEvaluation(data); setPhase('evaluated')
      covered.current.push(questions[idx].question)
    } catch (e) {
      console.error('Evaluation error:', e)
      addViolation('Evaluation request failed')
    } finally { setLoading(false) }
  }

  // ── Next question with adaptive fetch ─────────────────────
  const handleNext = async () => {
    if (idx + 1 >= questions.length) { onFinish(violations); return }

    if (evaluation) {
      axios.post(
        `${import.meta.env.VITE_AI_URL || 'http://localhost:8000'}/api/questions/adaptive`,
        { session_id: String(sessionId), last_score: evaluation.overall_score ?? 5,
          skills: [], covered: covered.current }
      ).then((r) => {
        setQuestions((prev) => {
          const clone = [...prev]
          if (idx + 2 < clone.length) clone[idx + 2] = r.data
          return clone
        })
      }).catch(() => {})
    }
    setIdx((i) => i + 1); setTranscript(''); setEvaluation(null); setPhase('question')
  }

  const q   = questions[idx]
  const pct = (idx / questions.length) * 100
  const scoreColor = (v) => v >= 7 ? '#10b981' : v >= 5 ? '#f59e0b' : '#ef4444'
  const diffColor  = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' }

  return (
    <div className="ir-layout">

      {/* ── LEFT: webcam + violations ──────────────────────── */}
      <div>
        <Webcam ref={webcamRef} mirrored width="100%" className="ir-webcam" />
        <FaceDetector webcamRef={webcamRef} onViolation={addViolation} />

        {violations.length > 0 && (
          <div className="ir-violations">
            <div className="ir-violations-title">⚠️ Violations detected</div>
            {violations.map((v) => (
              <div key={v} className="ir-violation-item">• {v}</div>
            ))}
          </div>
        )}

        {silenceSec > 5 && (
          <div className="ir-silence">🔇 {silenceSec}s of silence...</div>
        )}
      </div>

      {/* ── RIGHT: question + answer flow ─────────────────── */}
      <div>
        {/* Progress */}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6b7280', marginBottom:6 }}>
          <span>Question {idx + 1} of {questions.length}</span>
          <span style={{ color: diffColor[q?.difficulty], fontWeight:500 }}>
            {q?.difficulty} · {q?.category}
          </span>
        </div>
        <div className="progress-track" style={{ marginBottom:14 }}>
          <div className="progress-fill" style={{ width:`${pct}%` }} />
        </div>

        {/* Question card */}
        <div className="ir-question-card">
          <div className="ir-question-label">{q?.category}</div>
          <p className="ir-question-text">{q?.question}</p>
          <button
            onClick={() => speak(q?.question)}
            style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:10,
              fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer' }}
          >
            🔊 Repeat question
          </button>
        </div>

        {/* Timer */}
        {phase === 'answering' && (
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
              color: timeLeft < 30 ? '#ef4444' : '#6b7280', marginBottom:4 }}>
              <span>Time remaining</span><span>{timeLeft}s</span>
            </div>
            <div className="progress-track">
              <div className={`progress-fill ${timeLeft < 30 ? 'danger' : ''}`}
                style={{ width:`${(timeLeft / 120) * 100}%`, transition:'width 1s linear' }} />
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className={`ir-transcript ${!transcript ? 'empty' : ''}`}>
          {transcript || 'Your spoken answer will appear here...'}
        </div>

        {/* Keyboard fallback */}
        {phase === 'answering' && (
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Or type your answer here..."
            style={{ width:'100%', padding:10, border:'0.5px solid var(--border)', borderRadius:8,
              fontSize:13, fontFamily:'inherit', resize:'vertical', minHeight:60,
              marginBottom:10, outline:'none' }}
          />
        )}

        {/* Main action button */}
        {phase !== 'evaluated' && (
          <button
            onClick={recording ? handleStop : handleStart}
            disabled={loading}
            className={`btn btn-full btn-lg ${recording ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? 'Evaluating with AI...'
              : recording ? '⏹ Stop & Evaluate'
              : '🎤 Start Answering'}
          </button>
        )}

        {/* Evaluation result */}
        {evaluation && phase === 'evaluated' && (
          <div className="ir-eval">
            <div className="ir-scores">
              {[['Overall', evaluation.overall_score],
                ['Technical', evaluation.technical_accuracy],
                ['Comm.', evaluation.communication]
              ].map(([label, val]) => (
                <div key={label} className="ir-score-box">
                  <div className="ir-score-val" style={{ color: scoreColor(val ?? 0) }}>
                    {val ?? 0}/10
                  </div>
                  <div className="ir-score-label">{label}</div>
                </div>
              ))}
            </div>
            <p className="ir-feedback">{evaluation.feedback}</p>
            {evaluation.missing_keywords?.length > 0 && (
              <p style={{ fontSize:12, color:'#6b7280', marginBottom:10 }}>
                💡 Could mention: {evaluation.missing_keywords.join(', ')}
              </p>
            )}
            <button onClick={handleNext} className="btn btn-primary btn-full">
              {idx + 1 >= questions.length ? '🏁 Finish Interview' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
