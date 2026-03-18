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
  { id: 'process-yacht-video', retries: 2, triggers: [{ event: 'yacht/job.started' }] },
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

    // ── 3. Generate video clips (Runway ML — all in parallel) ─────────────
    await step.run('set-status-clips', () =>
      updateJob(jobId, {
        status: 'generating_clips',
        step_label: 'Starting clip generation...',
        progress: 35,
      })
    )

    const job = await step.run('fetch-job-for-clips', () => getJob(jobId))
    const imageUrls = job.image_urls.slice(0, job.clip_count)

    // Re-upload listing images to Supabase so Runway can access them
    const uploadedImageUrls = await Promise.all(
      imageUrls.map((url, i) =>
        step.run(`upload-image-${i}`, () =>
          downloadAndUpload(url, `jobs/${jobId}/image-${i}.jpg`, 'image/jpeg')
        )
      )
    )

    // Start ALL Runway tasks simultaneously
    const runwayTaskIds = await Promise.all(
      uploadedImageUrls.map((url, i) =>
        step.run(`start-clip-${i}`, () => startRunwayClip(url))
      )
    )

    await step.run('clips-started', () =>
      updateJob(jobId, {
        step_label: `All ${imageUrls.length} clips started in parallel...`,
        progress: 38,
      })
    )

    // Poll all clips together every 20s — track each as it finishes
    const clipOutputUrls: Record<number, string> = {}
    const MAX_POLL_ATTEMPTS = 20 // 20 × 20s ≈ 7 min max

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (Object.keys(clipOutputUrls).length >= imageUrls.length) break

      await step.sleep(`clips-poll-${attempt}`, '20s')

      // Check all still-pending clips in parallel
      await Promise.all(
        runwayTaskIds.map(async (taskId, i) => {
          if (clipOutputUrls[i] !== undefined) return // already done
          const result = await step.run(`check-clip-${i}-${attempt}`, () =>
            checkRunwayClip(taskId)
          )
          if (result.status === 'SUCCEEDED') {
            clipOutputUrls[i] = result.outputUrl!
          } else if (result.status === 'FAILED') {
            throw new Error(`Runway clip ${i + 1} failed: ${result.failureReason ?? 'unknown'}`)
          }
        })
      )

      const doneCount = Object.keys(clipOutputUrls).length
      const remaining = imageUrls.length - doneCount

      await step.run(`clips-progress-${attempt}`, () =>
        updateJob(jobId, {
          progress: 35 + Math.round((doneCount / imageUrls.length) * 30),
          step_label:
            doneCount === imageUrls.length
              ? 'All clips complete — saving...'
              : remaining === 1
              ? `${doneCount}/${imageUrls.length} clips done — waiting on last one...`
              : `${doneCount}/${imageUrls.length} clips done, ${remaining} still running...`,
        })
      )
    }

    if (Object.keys(clipOutputUrls).length < imageUrls.length) {
      throw new Error('Clip generation timed out after 7 minutes')
    }

    // Download all Runway outputs → Supabase in parallel
    const storedClipUrls = await Promise.all(
      imageUrls.map((_, i) =>
        step.run(`store-clip-${i}`, () =>
          downloadAndUpload(clipOutputUrls[i], `jobs/${jobId}/clip-${i}.mp4`, 'video/mp4')
        )
      )
    )

    await step.run('save-clips', () =>
      updateJob(jobId, { clip_urls: storedClipUrls, progress: 68 })
    )

    // ── 4. Generate AI twin (optional) ────────────────────────────────────
    const aiTwinUrl = await step.run('generate-ai-twin', async () => {
      const freshJob = await getJob(jobId)
      if (!freshJob.use_ai_twin || !freshJob.avatar_url) return null

      await updateJob(jobId, {
        status: 'generating_twin',
        step_label: 'Generating AI twin...',
        progress: 72,
      })

      const url = await generateAiTwin(freshJob.avatar_url, voiceoverUrl, freshJob.caption_template_id)
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
      const freshJob = await getJob(jobId)
      return callFfmpegWorker({
        jobId,
        clips: storedClipUrls,
        voiceoverUrl,
        musicUrl: musicUrl ?? null,
        logoUrl: freshJob.logo_url ?? null,
        aiTwinUrl: aiTwinUrl ?? null,
        vesselLocation: freshJob.vessel_location ?? null,
        fullName: freshJob.full_name,
        companyName: freshJob.company_name ?? null,
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
