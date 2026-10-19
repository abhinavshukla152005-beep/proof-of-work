import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PublicProfile from './pages/PublicProfile'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center-note">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="center-note">Loading…</div>
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route path="/p/:slug" element={<PublicProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
