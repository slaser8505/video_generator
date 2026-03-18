import YachtForm from '@/components/YachtForm'
import Link from 'next/link'

export default function NewJobPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/jobs"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}
          >
            ← All jobs
          </Link>
          <p className="section-label" style={{ marginBottom: 6 }}>New Video</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Generate Yacht Video
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
            Fill in the details below to generate an AI-powered marketing video.
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <div className="accent-bar" />
          <YachtForm />
        </div>
      </div>
    </div>
  )
}
