import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { entryLabel, evidenceUrl, parseSkills } from '../lib/utils'
import EntryForm from '../components/EntryForm'

const EMPTY_ENTRY = { title: '', description: '', evidence_url: '' }

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [entries, setEntries] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [skillsText, setSkillsText] = useState('')
  const [profileDirty, setProfileDirty] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [entryForm, setEntryForm] = useState(null) // null | {...draft, id?}
  const [busyEntryId, setBusyEntryId] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      setLoadError(schemaHint(error))
      setLoading(false)
      return
    }
    if (!prof) {
      const slug = (user.email || 'user').split('@')[0].replace(/[^a-zA-Z0-9]/g, '-')
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: user.id, name: slug, slug: `${slug}-${Math.random().toString(36).slice(2, 7)}` })
        .select()
        .single()
      if (!created) {
        setLoadError(schemaHint({ message: 'No profile row found.' }))
        setLoading(false)
        return
      }
      setProfile(created)
      fillProfile(created)
    } else {
      setProfile(prof)
      fillProfile(prof)
    }
    const { data: rows } = await supabase
      .from('entries')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(rows || [])
    setLoading(false)
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  function fillProfile(p) {
    setName(p.name || '')
    setBio(p.bio || '')
    setSkillsText((p.skills || []).join(', '))
    setProfileDirty(false)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (!profile) return
    setSavingProfile(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ name: name.trim() || 'Unnamed', bio: bio.trim(), skills: parseSkills(skillsText) })
      .eq('id', profile.id)
      .select()
      .single()
    if (!error && data) {
      setProfile(data)
      setProfileDirty(false)
    } else if (error) {
      setLoadError(schemaHint(error))
    }
    setSavingProfile(false)
  }

  async function saveEntry(draft) {
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      evidence_url: evidenceUrl(draft.evidence_url),
    }
    setBusyEntryId(draft.id || 'new')
    let error
    if (draft.id) {
      ;({ error } = await supabase.from('entries').update(payload).eq('id', draft.id))
    } else {
      ;({ error } = await supabase
        .from('entries')
        .insert({ ...payload, profile_id: user.id }))
    }
    if (!error) {
      const { data: rows } = await supabase
        .from('entries')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
      setEntries(rows || [])
      setEntryForm(null)
    } else {
      setLoadError(schemaHint(error))
    }
    setBusyEntryId(null)
  }

  async function deleteEntry(id) {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    setBusyEntryId(id)
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error) setEntries((prev) => prev.filter((x) => x.id !== id))
    setBusyEntryId(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const base = window.location.href.split('#')[0]
  const publicUrl = profile ? `${base}#/p/${profile.slug}` : ''

  return (
    <div className="page">
      <header className="topbar">
        <span className="wordmark small">ProofOfWork</span>
        <nav>
          {profile && (
            <Link className="btn ghost" to={`/p/${profile.slug}`}>
              View public portfolio ↗
            </Link>
          )}
          <Link className="btn ghost" to="/p/sample">
            Sample
          </Link>
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="dash-grid">
        {loadError && <div className="form-error wide">{loadError}</div>}

        <section className="card" aria-labelledby="profile-heading">
          <h3 id="profile-heading">Your profile</h3>
          {loading && !profile ? (
            <p className="muted">Loading your profile…</p>
          ) : (
            <form className="stack" onSubmit={saveProfile}>
              <label>
                <span>Name</span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setProfileDirty(true)
                  }}
                  placeholder="Your name"
                />
              </label>
              <label>
                <span>Bio</span>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    setProfileDirty(true)
                  }}
                  placeholder="A sentence or two about what you build and learn."
                />
              </label>
              <label>
                <span>Skills <em className="muted">(comma separated)</em></span>
                <input
                  value={skillsText}
                  onChange={(e) => {
                    setSkillsText(e.target.value)
                    setProfileDirty(true)
                  }}
                  placeholder="React, Python, Public Speaking"
                />
              </label>
              <button className="btn primary" type="submit" disabled={!profileDirty || savingProfile}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          )}

          {profile && (
            <div className="share-box">
              <span className="label">Your public URL</span>
              <div className="share-row">
                <code title={publicUrl}>{publicUrl}</code>
                <button
                  className="btn ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1800)
                    })
                  }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="entries-heading">
          <div className="section-head">
            <h3 id="entries-heading">Portfolio entries</h3>
            <button className="btn primary" onClick={() => setEntryForm({ ...EMPTY_ENTRY })}>
              + Add entry
            </button>
          </div>
          <p className="muted">
            Add a link (GitHub repo, Devpost, certificate page…) and the entry is labelled
            <strong> Evidence linked</strong>. Without a link it stays <strong>Self-reported</strong>.
            Nothing is ever marked as verified.
          </p>

          {entryForm && (
            <EntryForm
              draft={entryForm}
              busy={busyEntryId === (entryForm.id || 'new')}
              onSave={saveEntry}
              onCancel={() => setEntryForm(null)}
            />
          )}

          {entries.length === 0 && !entryForm && (
            <div className="empty-state">
              No entries yet. Add your first project, certificate or hackathon.
            </div>
          )}

          <ul className="entry-list">
            {entries.map((entry) => {
              const label = entryLabel(entry)
              return (
                <li key={entry.id} className="entry-row">
                  <div className="entry-main">
                    <div className="entry-title-line">
                      <strong>{entry.title}</strong>
                      <span className={`pill ${label.tone}`}>{label.text}</span>
                    </div>
                    {entry.description && <p className="entry-desc">{entry.description}</p>}
                    {entry.evidence_url && (
                      <a className="evidence-link" href={entry.evidence_url} target="_blank" rel="noreferrer noopener">
                        {entry.evidence_url} ↗
                      </a>
                    )}
                  </div>
                  <div className="entry-actions">
                    <button
                      className="btn ghost"
                      disabled={!!busyEntryId}
                      onClick={() =>
                        setEntryForm({
                          id: entry.id,
                          title: entry.title,
                          description: entry.description || '',
                          evidence_url: entry.evidence_url || '',
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn ghost danger"
                      disabled={!!busyEntryId}
                      onClick={() => deleteEntry(entry.id)}
                    >
                      {busyEntryId === entry.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}

function schemaHint(error) {
  if (/relation|does not exist|schema|2P180|42P01|table/i.test(error.message || '')) {
    return `Database tables are missing. Open your Supabase SQL Editor and run db/schema.sql. (Error: ${error.message})`
  }
  return `Something went wrong: ${error.message || 'unknown error'}`
}
