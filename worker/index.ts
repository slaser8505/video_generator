import express from 'express'
import { assembleVideo } from './assembler'
import type { AssembleRequest } from '../types'

const app = express()
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT ?? 3001
const SECRET = process.env.FFMPEG_WORKER_SECRET

// Simple shared-secret auth
app.use((req, res, next) => {
  if (SECRET && req.headers['x-worker-secret'] !== SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/assemble', async (req, res) => {
  const body = req.body as AssembleRequest

  if (!body.jobId || !body.clips?.length || !body.voiceoverUrl) {
    res.status(400).json({ error: 'Missing required fields: jobId, clips, voiceoverUrl' })
    return
  }

  console.log(`[${new Date().toISOString()}] Starting assembly for job ${body.jobId}`)

  try {
    const url = await assembleVideo(body)
    console.log(`[${new Date().toISOString()}] Assembly complete for job ${body.jobId}: ${url}`)
    res.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[${new Date().toISOString()}] Assembly failed for job ${body.jobId}:`, message)
    res.status(500).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`FFmpeg worker listening on port ${PORT}`)
})
