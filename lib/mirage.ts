/**
 * Mirage AI talking head integration.
 * Workflow:
 *   1. POST /tasks — creates a talking head video from avatar image + voiceover
 *   2. Poll GET /tasks/{id} until complete
 *   3. POST /captions — overlays captions using a template
 *   4. Poll until captions complete
 *   5. Return final content URL
 */

const BASE = process.env.MIRAGE_API_BASE_URL ?? 'https://api.mirageml.com/v1'

function headers() {
  return {
    Authorization: `Bearer ${process.env.MIRAGE_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function pollUntilDone(
  taskId: string,
  endpoint: string,
  intervalMs = 15000,
  maxAttempts = 60
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 0 : intervalMs))

    const res = await fetch(`${BASE}${endpoint}/${taskId}`, { headers: headers() })
    if (!res.ok) throw new Error(`Mirage poll failed: ${res.status}`)

    const data = await res.json()
    const status: string = data.status ?? data.state ?? ''

    if (status === 'completed' || status === 'succeeded' || status === 'done') {
      const url: string = data.content_url ?? data.output_url ?? data.url ?? ''
      if (!url) throw new Error('Mirage returned no content URL')
      return url
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Mirage task ${taskId} failed: ${data.error ?? 'unknown'}`)
    }
  }
  throw new Error(`Mirage task ${taskId} timed out after ${maxAttempts} attempts`)
}

export async function generateAiTwin(
  avatarUrl: string,
  voiceoverUrl: string,
  captionTemplateId?: string | null
): Promise<string> {
  // 1. Create talking head task
  const createRes = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      image_url: avatarUrl,
      audio_url: voiceoverUrl,
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Mirage create task failed: ${createRes.status} ${err}`)
  }

  const { id: taskId } = await createRes.json()

  // 2. Poll for talking head completion
  let videoUrl = await pollUntilDone(taskId, '/tasks')

  // 3. Add captions if template provided
  if (captionTemplateId) {
    const captionRes = await fetch(`${BASE}/captions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        video_url: videoUrl,
        template_id: captionTemplateId,
      }),
    })

    if (!captionRes.ok) {
      // Captions are optional — log and continue without them
      console.warn(`Mirage captions failed: ${captionRes.status}`)
    } else {
      const { id: captionTaskId } = await captionRes.json()
      try {
        videoUrl = await pollUntilDone(captionTaskId, '/captions')
      } catch (e) {
        console.warn('Mirage caption polling failed, using uncaptioned video:', e)
      }
    }
  }

  return videoUrl
}
