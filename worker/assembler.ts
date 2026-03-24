import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { downloadFile } from './utils'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const BUCKET = 'yacht-videos'

interface AssembleOptions {
  jobId: string
  clips: string[]
  voiceoverUrl: string
  musicUrl: string | null
  logoUrl: string | null
  aiTwinUrl: string | null
  vesselLocation: string | null
  fullName: string
  companyName: string | null
}

/**
 * Runs ffmpeg to combine all assets into a final portrait MP4.
 * Returns the Supabase public URL of the output file.
 */
export async function assembleVideo(opts: AssembleOptions): Promise<string> {
  const tmpDir = `/tmp/yacht-${opts.jobId}`
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // ── Download all assets ───────────────────────────────────────────────
    const downloads: Promise<string | null>[] = [
      ...opts.clips.map((url, i) => downloadFile(url, `${tmpDir}/clip-${i}.mp4`)),
      downloadFile(opts.voiceoverUrl, `${tmpDir}/voiceover.mp3`),
      opts.musicUrl ? downloadFile(opts.musicUrl, `${tmpDir}/music.mp3`) : Promise.resolve(null),
      opts.logoUrl ? downloadFile(opts.logoUrl, `${tmpDir}/logo.png`) : Promise.resolve(null),
      opts.aiTwinUrl ? downloadFile(opts.aiTwinUrl, `${tmpDir}/aitwin.mp4`) : Promise.resolve(null),
    ]

    const results = await Promise.all(downloads)
    const clipCount = opts.clips.length
    const clipPaths = results.slice(0, clipCount) as string[]
    const voiceoverPath = results[clipCount] as string
    const musicPath = results[clipCount + 1] as string | null
    const logoPath = results[clipCount + 2] as string | null
    const aiTwinPath = results[clipCount + 3] as string | null

    // ── Build video list ──────────────────────────────────────────────────
    // If AI twin exists, it plays first as the intro
    const videoSequence = aiTwinPath ? [aiTwinPath, ...clipPaths] : clipPaths

    // Create concat file
    const concatListPath = `${tmpDir}/concat.txt`
    const concatContent = videoSequence.map((p) => `file '${p}'`).join('\n')
    fs.writeFileSync(concatListPath, concatContent)

    // ── Concatenate videos ────────────────────────────────────────────────
    const concatPath = `${tmpDir}/concat.mp4`
    await runFfmpeg((cmd) =>
      cmd
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(concatPath)
    )

    // ── Build audio mix ───────────────────────────────────────────────────
    const audioPath = `${tmpDir}/audio.aac`
    if (musicPath) {
      // Mix voiceover (full volume) with music (30% volume)
      await runFfmpeg((cmd) =>
        cmd
          .input(voiceoverPath)
          .input(musicPath)
          .complexFilter([
            '[0:a]volume=1.0[voice]',
            '[1:a]volume=0.30[music]',
            '[voice][music]amix=inputs=2:duration=first[aout]',
          ])
          .outputOptions(['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'])
          .output(audioPath)
      )
    } else {
      // Just voiceover
      await runFfmpeg((cmd) =>
        cmd
          .input(voiceoverPath)
          .outputOptions(['-c:a', 'aac', '-b:a', '192k'])
          .output(audioPath)
      )
    }

    // ── Merge video + audio + overlays ────────────────────────────────────
    const outputPath = `${tmpDir}/output.mp4`

    await runFfmpeg((cmd) => {
      cmd.input(concatPath).input(audioPath)

      const filters: string[] = []
      let currentVideo = '[0:v]'

      // Scale / pad to exactly 720x1280 portrait
      filters.push(`${currentVideo}scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[scaled]`)
      currentVideo = '[scaled]'

      // Text overlay: vessel location (top centre)
      if (opts.vesselLocation) {
        const safe = opts.vesselLocation.replace(/'/g, "\\'").replace(/:/g, '\\:')
        filters.push(
          `${currentVideo}drawtext=text='${safe}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=60:shadowcolor=black:shadowx=2:shadowy=2[withloc]`
        )
        currentVideo = '[withloc]'
      }

      // Text overlay: company name (bottom centre)
      if (opts.companyName) {
        const safe = opts.companyName.replace(/'/g, "\\'").replace(/:/g, '\\:')
        filters.push(
          `${currentVideo}drawtext=text='${safe}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h-80:shadowcolor=black:shadowx=2:shadowy=2[withco]`
        )
        currentVideo = '[withco]'
      }

      // Logo overlay (top-right corner)
      if (logoPath) {
        cmd.input(logoPath)
        filters.push(
          `[2:v]scale=120:-1[logo]`,
          `${currentVideo}[logo]overlay=W-w-20:20[withlogo]`
        )
        currentVideo = '[withlogo]'
      }

      if (filters.length > 0) {
        cmd.complexFilter(filters)
        cmd.outputOptions(['-map', `${currentVideo}`, '-map', '1:a'])
      } else {
        cmd.outputOptions(['-map', '0:v', '-map', '1:a'])
      }

      cmd.outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'copy',
        '-shortest',
        '-movflags', '+faststart',
      ])

      cmd.output(outputPath)
      return cmd
    })

    // ── Upload to Supabase Storage ─────────────────────────────────────────
    const storagePath = `jobs/${opts.jobId}/final.mp4`
    const fileBuffer = fs.readFileSync(outputPath)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: 'video/mp4', upsert: true })

    if (error) throw new Error(`Supabase upload failed: ${error.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    return data.publicUrl
  } finally {
    // Cleanup temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

// Helper: wrap fluent-ffmpeg in a promise
function runFfmpeg(configure: (cmd: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
    configure(cmd)
      .on('error', reject)
      .on('end', () => resolve())
      .run()
  })
}
