import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import InterviewRoom from '../components/InterviewRoom.jsx'
import { completeSession } from '../services/api.js'
import toast from 'react-hot-toast'

export default function Interview() {
  const { sessionId } = useParams()
  const nav = useNavigate()

  const questions = JSON.parse(sessionStorage.getItem('questions') || '[]')
  const role      = sessionStorage.getItem('role') || 'Software Engineer'

  useEffect(() => {
    if (!questions.length) { nav('/'); return }
  }, [])

  const handleFinish = async (violations) => {
    try {
      await completeSession(Number(sessionId), { violations })
      toast.success('Interview complete! View your results.')
    } catch (e) {
      console.warn('Complete session failed:', e)
    }
    sessionStorage.removeItem('questions')
    sessionStorage.removeItem('role')
    nav('/dashboard')
  }

  if (!questions.length) return null

  return (
    <InterviewRoom
      questions={questions}
      sessionId={Number(sessionId)}
      role={role}
      onFinish={handleFinish}
    />
  )
}
