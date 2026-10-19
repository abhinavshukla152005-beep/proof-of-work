import { useState } from 'react'

export default function EntryForm({ draft, onSave, onCancel, busy }) {
  const [title, setTitle] = useState(draft.title || '')
  const [description, setDescription] = useState(draft.description || '')
  const [evidence, setEvidence] = useState(draft.evidence_url || '')

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ ...draft, title, description, evidence_url: evidence })
  }

  return (
    <form className="entry-form stack" onSubmit={submit}>
      <h4>{draft.id ? 'Edit entry' : 'New entry'}</h4>
      <label>
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hackathon project — RouteWise"
          required
          autoFocus
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you built, your role, the outcome."
        />
      </label>
      <label>
        <span>
          Evidence URL <em className="muted">(optional — GitHub, Devpost, credential link…)</em>
        </span>
        <input
          type="url"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="https://github.com/you/project"
        />
      </label>
      <p className="hint">
        {evidence.trim()
          ? 'This entry will be labelled “Evidence linked”.'
          : 'This entry will be labelled “Self-reported”.'}
      </p>
      <div className="row-actions">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Add entry'}
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
