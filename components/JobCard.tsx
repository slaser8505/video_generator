'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import type { Job } from '@/types'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(107,124,155,0.12)', color: 'var(--text-muted)' },
  uploading: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  generating_voice: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  generating_music: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  generating_clips: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  generating_twin: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  assembling: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  completed: { bg: 'rgba(34,197,94,0.1)', color: 'var(--success)' },
  failed: { bg: 'rgba(239,68,68,0.1)', color: 'var(--error)' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  generating_voice: 'Voice',
  generating_music: 'Music',
  generating_clips: 'Clips',
  generating_twin: 'AI Twin',
  assembling: 'Assembling',
  completed: 'Complete',
  failed: 'Failed',
}

interface Props {
  job: Pick<
    Job,
    | 'id'
    | 'created_at'
    | 'status'
    | 'step_label'
    | 'progress'
    | 'full_name'
    | 'company_name'
    | 'vessel_location'
    | 'use_ai_twin'
    | 'use_music'
    | 'clip_count'
    | 'final_video_url'
  >
}

export default function JobCard({ job }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const isActive = !['completed', 'failed', 'pending'].includes(job.status)
  const statusColor = STATUS_COLORS[job.status] ?? STATUS_COLORS.pending

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this job?')) return
    setDeleting(true)
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <Link href={`/jobs/${job.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div className="card card-hover" style={{ padding: 20, opacity: deleting ? 0.4 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
              {job.full_name}
            </p>
            {job.vessel_location && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {job.vessel_location}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 20,
              background: statusColor.bg,
              color: statusColor.color,
              letterSpacing: '0.04em',
            }}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, display: 'flex', alignItems: 'center', borderRadius: 4 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isActive && (
          <div style={{ marginBottom: 14 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${job.progress}%` }} />
            </div>
            {job.step_label && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>{job.step_label}</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          <span>{formatDistanceToNow(job.created_at)}</span>
          <span>·</span>
          <span>{job.clip_count} clip{job.clip_count !== 1 ? 's' : ''}</span>
          {job.use_ai_twin && <span>· AI twin</span>}
          {job.use_music && <span>· Music</span>}
        </div>
      </div>
    </Link>
  )
}
