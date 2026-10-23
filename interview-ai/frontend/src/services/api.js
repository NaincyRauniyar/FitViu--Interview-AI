import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
})

// Auto-attach JWT
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const login    = (data) => api.post('/api/auth/login', data)
export const register = (data) => api.post('/api/auth/register', data)
export const resendVerification = (email) =>
  api.post(`/api/auth/resend-verification?email=${email}`)

// ── Interview ─────────────────────────────────────────────────
export const parseResume = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/api/interview/parse-resume', fd)
}
export const startInterview  = (body) => api.post('/api/interview/start', body)
export const submitAnswer    = (sid, body) => api.post(`/api/interview/${sid}/answer`, body)
export const completeSession = (sid, body) => api.post(`/api/interview/${sid}/complete`, body)
export const getSessions     = () => api.get('/api/interview/sessions')
export const getSession      = (id) => api.get(`/api/interview/sessions/${id}`)

export default api
