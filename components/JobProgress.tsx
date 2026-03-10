'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{job.step_label ?? 'Processing...'}</span>
          <span>{job.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Step timeline */}
      <div className="space-y-3">
        {visibleSteps.map((step) => {
          const state = stepState(step.id, job.status)
          return (
            <div key={step.id} className="flex items-center gap-3">
              {state === 'done' && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
              {state === 'active' && job.status !== 'failed' && (
                <Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />
              )}
              {state === 'pending' && <Circle size={18} className="text-gray-300 shrink-0" />}
              <span
                className={`text-sm ${
                  state === 'done'
                    ? 'text-gray-800'
                    : state === 'active'
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Error state */}
      {job.status === 'failed' && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <XCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Pipeline failed</p>
            {job.error_message && <p className="text-xs mt-0.5 opacity-80">{job.error_message}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
