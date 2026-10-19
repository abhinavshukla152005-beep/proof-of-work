import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (err) throw err
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then sign in.')
        } else {
          navigate('/dashboard')
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div>
          <h1 className="wordmark">ProofOfWork</h1>
          <p className="tagline">A portfolio backed by evidence.</p>
          <ul className="brand-points">
            <li>Showcase projects, certificates and hackathons</li>
            <li>Attach a real link to every claim</li>
            <li>Share one clean public URL</li>
          </ul>
          <p className="brand-note">
            Not sure what it looks like?{' '}
            <Link to="/p/sample">View the sample portfolio →</Link>
          </p>
        </div>
      </aside>

      <main className="auth-panel">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            {isSignup
              ? 'Sign up with your email to start building your portfolio.'
              : 'Sign in to edit and share your portfolio.'}
          </p>

          {isSignup && (
            <label>
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maya Chen"
                required
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <div className="form-error">{error}</div>}
          {notice && <div className="form-notice">{notice}</div>}

          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
          </button>

          <p className="switch-line">
            {isSignup ? (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <>
                New here? <Link to="/signup">Create an account</Link>
              </>
            )}
          </p>
        </form>
      </main>
    </div>
  )
}
