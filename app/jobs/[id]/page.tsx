import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={14} />
            All jobs
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.full_name}</h1>
              {job.vessel_location && (
                <p className="text-sm text-gray-500">{job.vessel_location}</p>
              )}
            </div>
            <div className="flex gap-2 text-xs text-gray-400 mt-1">
              {job.clip_count} clips
              {job.use_ai_twin && <span>· AI twin</span>}
              {job.use_music && <span>· Music</span>}
            </div>
          </div>
        </div>

        {/* Complete */}
        {job.status === 'completed' && job.final_video_url ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-medium">
              <CheckCircle2 size={18} />
              Video ready! Check your email for the download link.
            </div>
            <VideoResult
              videoUrl={job.final_video_url}
              vesselLocation={job.vessel_location}
              clientName={job.full_name}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Generating your video...</h2>
            <JobProgress initialJob={job} />
          </div>
        )}
      </div>
    </div>
  )
}
