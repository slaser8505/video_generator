const BASE = 'https://api.dev.runwayml.com/v1'
const RUNWAY_VERSION = '2024-11-06'

function headers() {
  return {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_VERSION,
  }
}

export async function startRunwayClip(imageUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/image_to_video`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: 'gen4_turbo',
      promptImage: imageUrl,
      promptText:
        'Bring this scene to life with smooth, cinematic motion. ' +
        'Gentle water movement, soft light, stable composition. ' +
        'Professional luxury yacht footage.',
      ratio: '720:1280',
      duration: 5,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Runway start failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  // Runway returns { id } for the task
  return data.id as string
}

export async function checkRunwayClip(
  taskId: string
): Promise<{ status: string; outputUrl?: string; failureReason?: string }> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, { headers: headers() })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Runway poll failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return {
    status: data.status as string, // QUEUED | RUNNING | SUCCEEDED | FAILED
    outputUrl: data.output?.[0] as string | undefined,
    failureReason: (data.failure ?? data.failureCode) as string | undefined,
  }
}
