import Link from 'next/link'
import JobCard from '@/components/JobCard'
import type { Job } from '@/types'

async function getJobs() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/jobs`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json() as Promise<Job[]>
}

export default async function JobsPage() {
  const jobs = await getJobs()

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 6 }}>Dashboard</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Yacht Videos
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} generated
            </p>
          </div>
          <Link href="/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            + New Video
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="card" style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--blue-dim)', border: '1px solid rgba(46,163,242,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: '1.5rem' }}>🎬</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>No videos yet. Generate your first yacht marketing video.</p>
            <Link href="/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              + Generate First Video
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
