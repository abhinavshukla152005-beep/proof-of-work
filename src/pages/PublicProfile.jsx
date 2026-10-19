import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { entryLabel } from '../lib/utils'

export default function PublicProfile() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', profile: null, entries: [] })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading', profile: null, entries: [] })
    ;(async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (!alive) return
      if (error || !profile) {
        setState({ status: 'missing', profile: null, entries: [] })
        return
      }
      const { data: entries } = await supabase
        .from('entries')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
      if (alive) setState({ status: 'ok', profile, entries: entries || [] })
    })()
    return () => {
      alive = false
    }
  }, [slug])

  if (state.status === 'loading') {
    return <div className="center-note">Loading portfolio…</div>
  }

  if (state.status === 'missing') {
    return (
      <div className="center-note">
        <h2>Portfolio not found</h2>
        <p>No portfolio exists at this address.</p>
        <Link to="/p/sample">View the sample portfolio →</Link>
      </div>
    )
  }

  const { profile, entries } = state
  const isSample = profile.slug === 'sample'

  return (
    <div className="page public-page">
      <header className="topbar minimal">
        <Link className="wordmark small" to="/">
          ProofOfWork
        </Link>
        <span className="muted">Public portfolio · read only</span>
      </header>

      <main className="portfolio">
        {isSample && (
          <div className="sample-banner">
            Sample portfolio — this content is illustrative, created by the app to show how a
            finished portfolio looks.
          </div>
        )}

        <section className="portfolio-head">
          <div className="avatar" aria-hidden="true">
            {(profile.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1>{profile.name}</h1>
            {profile.bio && <p className="bio">{profile.bio}</p>}
            {profile.skills?.length > 0 && (
              <ul className="skill-list">
                {profile.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-label="Portfolio entries">
          <h2 className="entries-heading">Work &amp; proof</h2>
          {entries.length === 0 ? (
            <p className="muted">No entries yet.</p>
          ) : (
            <ul className="portfolio-entries">
              {entries.map((entry) => {
                const label = entryLabel(entry)
                return (
                  <li key={entry.id} className="portfolio-entry">
                    <div className="entry-title-line">
                      <h3>{entry.title}</h3>
                      <span className={`pill ${label.tone}`}>{label.text}</span>
                    </div>
                    {entry.description && <p>{entry.description}</p>}
                    {entry.evidence_url && (
                      <a
                        className="btn ghost evidence-btn"
                        href={entry.evidence_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        View evidence ↗
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <footer className="portfolio-foot">
          <p>
            Entries are labelled by their owner. <strong>Self-reported</strong> means the claim has
            no attached link; <strong>Evidence linked</strong> means a link was provided — neither
            means the content has been independently verified.
          </p>
          <Link className="btn primary" to="/signup">
            Build your own portfolio
          </Link>
        </footer>
      </main>
    </div>
  )
}
