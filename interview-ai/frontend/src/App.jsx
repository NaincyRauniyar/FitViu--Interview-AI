import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login        from './pages/Login.jsx'
import Register     from './pages/Register.jsx'
import Home         from './pages/Home.jsx'
import Interview    from './pages/Interview.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import VerifyEmail  from './pages/VerifyEmail.jsx'

// DEMO: Guard disabled — always renders children directly
function Guard({ children }) {
  return children
  // ORIGINAL: return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/"             element={<Guard><Home /></Guard>} />
        <Route path="/interview/:sessionId" element={<Guard><Interview /></Guard>} />
        <Route path="/dashboard"    element={<Guard><DashboardPage /></Guard>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
