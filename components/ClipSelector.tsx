'use client'

interface ClipSelectorProps {
  value: number
  onChange: (value: number) => void
}

export default function ClipSelector({ value, onChange }: ClipSelectorProps) {
  return (
    <div>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: 10, margin: 0 }}>Number of clips</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              border: value === n ? '1.5px solid var(--blue)' : '1.5px solid var(--border)',
              background: value === n ? 'var(--blue-dim)' : 'var(--surface-2)',
              color: value === n ? 'var(--blue)' : 'var(--text-muted)',
              boxShadow: value === n ? '0 0 10px rgba(46,163,242,0.15)' : 'none',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6, margin: 0 }}>
        {value} image{value !== 1 ? 's' : ''} will be converted to video clips
      </p>
    </div>
  )
}
