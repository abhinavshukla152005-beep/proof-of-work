export function evidenceUrl(value) {
  const v = (value || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

export function entryLabel(entry) {
  return entry.evidence_url && entry.evidence_url.trim()
    ? { text: 'Evidence linked', tone: 'linked' }
    : { text: 'Self-reported', tone: 'self' }
}

export function parseSkills(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25)
}
