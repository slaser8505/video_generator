import { notFound } from 'next/navigation'
import Link from 'next/link'
import JobProgress from '@/components/JobProgress'
import VideoResult from '@/components/VideoResult'
import type { Job } from '@/types'

async function getJob(id: string): Promise<Job | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/jobs/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) notFound()

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/jobs"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}
          >
            ← All jobs
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                {job.full_name}
              </h1>
              {job.vessel_location && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{job.vessel_location}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                {job.clip_count} clips
              </span>
              {job.use_ai_twin && (
                <span style={{ fontSize: '0.7rem', color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(46,163,242,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                  AI Twin
                </span>
              )}
              {job.use_music && (
                <span style={{ fontSize: '0.7rem', color: 'var(--blue)', background: 'var(--blue-dim)', border: '1px solid rgba(46,163,242,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                  Music
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Complete */}
        {job.status === 'completed' && job.final_video_url ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: '0.875rem', color: 'var(--success)', fontWeight: 500 }}>
              <span>✓</span>
              Video ready — download below
            </div>
            <VideoResult
              videoUrl={job.final_video_url}
              vesselLocation={job.vessel_location}
              clientName={job.full_name}
            />
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            <div className="accent-bar" />
            <h2 style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontSize: '1rem' }}>
              Generating your video...
            </h2>
            <JobProgress initialJob={job} />
          </div>
        )}
      </div>
    </div>
  )
}
