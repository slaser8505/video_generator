'use client'

interface ToggleProps {
  enabled: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}

export default function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: 24,
          width: 44,
          alignItems: 'center',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
          background: enabled ? 'var(--blue)' : 'var(--surface-2)',
          boxShadow: enabled ? '0 0 10px rgba(46,163,242,0.3)' : 'none',
          outline: 'none',
        }}
        role="switch"
        aria-checked={enabled}
      >
        <span
          style={{
            display: 'inline-block',
            height: 16,
            width: 16,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
            transform: enabled ? 'translateX(24px)' : 'translateX(4px)',
          }}
        />
      </button>
    </div>
  )
}
