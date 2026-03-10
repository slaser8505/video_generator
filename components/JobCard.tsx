import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/utils'
import type { Job } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  uploading: 'bg-blue-100 text-blue-700',
  generating_voice: 'bg-blue-100 text-blue-700',
  generating_music: 'bg-blue-100 text-blue-700',
  generating_clips: 'bg-blue-100 text-blue-700',
  generating_twin: 'bg-blue-100 text-blue-700',
  assembling: 'bg-purple-100 text-purple-700',
  sending_email: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  generating_voice: 'Voice',
  generating_music: 'Music',
  generating_clips: 'Clips',
  generating_twin: 'AI Twin',
  assembling: 'Assembling',
  sending_email: 'Sending',
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
  const isActive = !['completed', 'failed', 'pending'].includes(job.status)

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{job.full_name}</p>
            {job.vessel_location && (
              <p className="text-sm text-gray-500 truncate">{job.vessel_location}</p>
            )}
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
              STATUS_STYLES[job.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>

        {isActive && (
          <div className="mb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{job.step_label}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400">
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
