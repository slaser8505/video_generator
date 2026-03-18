'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { Job, JobStatus } from '@/types'

interface Step {
  id: JobStatus
  label: string
  condition?: (job: Job) => boolean
}

const PIPELINE_STEPS: Step[] = [
  { id: 'uploading', label: 'Uploading assets' },
  { id: 'generating_voice', label: 'Generating voiceover' },
  { id: 'generating_music', label: 'Generating music', condition: (j) => j.use_music },
  { id: 'generating_clips', label: 'Creating video clips' },
  { id: 'generating_twin', label: 'Generating AI twin', condition: (j) => j.use_ai_twin },
  { id: 'assembling', label: 'Assembling final video' },
  { id: 'completed', label: 'Complete' },
]

const STATUS_ORDER: JobStatus[] = [
  'pending',
  'uploading',
  'generating_voice',
  'generating_music',
  'generating_clips',
  'generating_twin',
  'assembling',
  'sending_email',
  'completed',
]

// Rough remaining-time estimates (seconds) per status
const ETA_SECONDS: Partial<Record<JobStatus, number>> = {
  uploading: 20,
  generating_voice: 40,
  generating_music: 45,
  generating_clips: 5 * 60,  // parallel = ~5 min total
  generating_twin: 2.5 * 60,
  assembling: 90,
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${Math.ceil(seconds)}s`
  const mins = Math.ceil(seconds / 60)
  return `~${mins} min`
}

function stepState(stepId: JobStatus, currentStatus: JobStatus): 'done' | 'active' | 'pending' {
  if (currentStatus === 'failed') return 'pending'
  const current = STATUS_ORDER.indexOf(currentStatus)
  const step = STATUS_ORDER.indexOf(stepId)
  if (step < current) return 'done'
  if (step === current) return 'active'
  return 'pending'
}

interface Props {
  initialJob: Job
}

export default function JobProgress({ initialJob }: Props) {
  const [job, setJob] = useState<Job>(initialJob)
  const [elapsed, setElapsed] = useState(0) // seconds elapsed in current step
  const stepStartRef = useRef<number>(Date.now())

  // Reset elapsed timer when status changes
  useEffect(() => {
    stepStartRef.current = Date.now()
    setElapsed(0)
  }, [job.status])

  // Tick every second while active
  useEffect(() => {
    const activeStatuses: JobStatus[] = [
      'uploading', 'generating_voice', 'generating_music',
      'generating_clips', 'generating_twin', 'assembling',
    ]
    if (!activeStatuses.includes(job.status)) return

    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - stepStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [job.status])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`job-${job.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${job.id}` },
        (payload) => setJob(payload.new as Job)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [job.id])

  const visibleSteps = PIPELINE_STEPS.filter((s) => !s.condition || s.condition(job))

  // Compute ETA for current step
  const etaTotal = ETA_SECONDS[job.status]
  const etaRemaining = etaTotal ? Math.max(0, etaTotal - elapsed) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.75rem', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>{job.step_label ?? 'Processing...'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {etaRemaining !== null && job.status !== 'completed' && (
              <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                {etaRemaining > 0 ? `${formatEta(etaRemaining)} remaining` : 'almost done...'}
              </span>
            )}
            <span style={{ color: 'var(--blue)', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
              {job.progress}%
            </span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${job.progress}%` }} />
        </div>
        {/* Elapsed time for current step */}
        {elapsed > 0 && job.status !== 'completed' && job.status !== 'failed' && (
          <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4, margin: 0 }}>
            {formatElapsed(elapsed)} on this step
          </p>
        )}
      </div>

      {/* Step timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleSteps.map((step) => {
          const state = stepState(step.id, job.status)
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {state === 'done' && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1.5px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--success)', fontWeight: 700 }}>✓</span>
                  </div>
                )}
                {state === 'active' && job.status !== 'failed' && (
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--blue)' }} />
                )}
                {(state === 'pending' || (state === 'active' && job.status === 'failed')) && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--border)' }} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: state === 'done' ? 'var(--text)' : state === 'active' ? 'var(--blue)' : 'var(--text-dim)',
                  fontWeight: state === 'active' ? 500 : 400,
                }}>
                  {step.label}
                </span>
                {state === 'active' && ETA_SECONDS[step.id] && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {`est. ${formatEta(ETA_SECONDS[step.id]!)}`}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error state */}
      {job.status === 'failed' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: '0.875rem', color: 'var(--error)' }}>
          <span style={{ flexShrink: 0 }}>✕</span>
          <div>
            <p style={{ fontWeight: 600, margin: 0 }}>Pipeline failed</p>
            {job.error_message && <p style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8, margin: 0 }}>{job.error_message}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function formatElapsed(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}
