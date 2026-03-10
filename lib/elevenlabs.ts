import { downloadAndUpload, uploadBuffer } from './storage'

const BASE = 'https://api.elevenlabs.io/v1'
const VOICE_ID = 'H1JKdAbwBPUcXxQvuQob'

function headers() {
  return {
    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    'Content-Type': 'application/json',
  }
}

export async function generateVoiceover(text: string, jobId: string): Promise<string> {
  const res = await fetch(`${BASE}/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${err}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  return uploadBuffer(buffer, `jobs/${jobId}/voiceover.mp3`, 'audio/mpeg')
}

export async function generateMusic(style: string, jobId: string): Promise<string> {
  const res = await fetch(`${BASE}/music/compose`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      prompt: style,
      duration_ms: 20000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs Music failed: ${res.status} ${err}`)
  }

  const { audio_url } = await res.json()

  if (audio_url) {
    // API returned a URL — download and re-upload
    return downloadAndUpload(audio_url, `jobs/${jobId}/music.mp3`, 'audio/mpeg')
  }

  // API returned raw audio bytes
  const buffer = Buffer.from(await res.arrayBuffer())
  return uploadBuffer(buffer, `jobs/${jobId}/music.mp3`, 'audio/mpeg')
}
