import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/server'
import { generateVoiceover, generateMusic } from '@/lib/elevenlabs'
import { startRunwayClip, checkRunwayClip } from '@/lib/runway'
import { generateAiTwin } from '@/lib/mirage'
import { downloadAndUpload } from '@/lib/storage'
import type { Job, AssembleRequest } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getJob(jobId: string): Promise<Job> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single()
  if (error) throw new Error(`Failed to fetch job ${jobId}: ${error.message}`)
  return data as Job
}

async function updateJob(jobId: string, patch: Partial<Job>) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('jobs').update(patch).eq('id', jobId)
  if (error) throw new Error(`Failed to update job ${jobId}: ${error.message}`)
}

async function callFfmpegWorker(payload: AssembleRequest): Promise<string> {
  const workerUrl = process.env.FFMPEG_WORKER_URL
  if (!workerUrl) throw new Error('FFMPEG_WORKER_URL is not set')

  const res = await fetch(`${workerUrl}/assemble`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': process.env.FFMPEG_WORKER_SECRET ?? '',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`FFmpeg worker failed: ${res.status} ${err}`)
  }

  const { url } = await res.json()
  return url as string
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export const processJob = inngest.createFunction(
  {
    id: 'process-yacht-video',
    retries: 2,
  },
  { event: 'yacht/job.started' },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string }

    // ── 1. Generate voiceover ──────────────────────────────────────────────
    await step.run('set-status-voice', () =>
      updateJob(jobId, {
        status: 'generating_voice',
        step_label: 'Generating voiceover...',
        progress: 10,
      })
    )

    const voiceoverUrl = await step.run('generate-voiceover', async () => {
      const job = await getJob(jobId)
      return generateVoiceover(job.listing_description, jobId)
    })

    await step.run('save-voiceover', () => updateJob(jobId, { voiceover_url: voiceoverUrl }))

    // ── 2. Generate music (optional) ──────────────────────────────────────
    const musicUrl = await step.run('generate-music', async () => {
      const job = await getJob(jobId)
      if (!job.use_music) return null

      await updateJob(jobId, {
        status: 'generating_music',
        step_label: 'Generating background music...',
        progress: 25,
      })

      const url = await generateMusic(job.music_style ?? 'calm, luxury, ambient', jobId)
      await updateJob(jobId, { music_url: url })
      return url
    })

    // ── 3. Generate video clips (Runway ML) ───────────────────────────────
    await step.run('set-status-clips', () =>
      updateJob(jobId, {
        status: 'generating_clips',
        step_label: 'Creating video clips...',
        progress: 35,
      })
    )

    const job = await step.run('fetch-job', () => getJob(jobId))
    const clipCount = job.clip_count
    const imageUrls = job.image_urls.slice(0, clipCount)
    const clipUrls: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      // Start Runway task
      const runwayTaskId = await step.run(`start-clip-${i}`, () =>
        startRunwayClip(imageUrls[i])
      )

      // Poll until done (Inngest persists state across step.sleep calls)
      let clipStatus = 'QUEUED'
      let outputUrl: string | undefined
      let attempt = 0

      while (clipStatus === 'QUEUED' || clipStatus === 'RUNNING') {
        await step.sleep(`wait-clip-${i}-attempt-${attempt}`, '20s')
        const result = await step.run(`check-clip-${i}-attempt-${attempt}`, () =>
          checkRunwayClip(runwayTaskId)
        )
        clipStatus = result.status
        outputUrl = result.outputUrl
        attempt++

        if (clipStatus === 'FAILED') {
          throw new Error(`Runway clip ${i + 1} failed`)
        }
        if (attempt > 30) {
          throw new Error(`Runway clip ${i + 1} timed out`)
        }
      }

      // Download Runway output and store in Supabase
      const storedUrl = await step.run(`store-clip-${i}`, () =>
        downloadAndUpload(outputUrl!, `jobs/${jobId}/clip-${i}.mp4`, 'video/mp4')
      )

      clipUrls.push(storedUrl)

      await step.run(`save-clip-progress-${i}`, () =>
        updateJob(jobId, {
          clip_urls: clipUrls,
          progress: 35 + Math.round(((i + 1) / clipCount) * 35),
        })
      )
    }

    // ── 4. Generate AI twin (optional) ────────────────────────────────────
    const aiTwinUrl = await step.run('generate-ai-twin', async () => {
      const job = await getJob(jobId)
      if (!job.use_ai_twin || !job.avatar_url) return null

      await updateJob(jobId, {
        status: 'generating_twin',
        step_label: 'Generating AI twin...',
        progress: 72,
      })

      const url = await generateAiTwin(job.avatar_url, voiceoverUrl, job.caption_template_id)
      await updateJob(jobId, { ai_twin_url: url })
      return url
    })

    // ── 5. Assemble final video (FFmpeg worker) ────────────────────────────
    await step.run('set-status-assemble', () =>
      updateJob(jobId, {
        status: 'assembling',
        step_label: 'Assembling final video...',
        progress: 80,
      })
    )

    const finalVideoUrl = await step.run('assemble-video', async () => {
      const job = await getJob(jobId)
      return callFfmpegWorker({
        jobId,
        clips: clipUrls,
        voiceoverUrl,
        musicUrl: musicUrl ?? null,
        logoUrl: job.logo_url ?? null,
        aiTwinUrl: aiTwinUrl ?? null,
        vesselLocation: job.vessel_location ?? null,
        fullName: job.full_name,
        companyName: job.company_name ?? null,
      })
    })

    // ── 6. Complete ────────────────────────────────────────────────────────
    await step.run('complete', () =>
      updateJob(jobId, {
        status: 'completed',
        step_label: 'Video ready!',
        progress: 100,
        final_video_url: finalVideoUrl,
      })
    )

    return { jobId, finalVideoUrl }
  }
)
