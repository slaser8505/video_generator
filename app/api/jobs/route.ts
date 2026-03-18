import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import { z } from 'zod'
import type { CreateJobInput } from '@/types'

const CreateJobSchema = z.object({
  use_ai_twin: z.boolean().default(true),
  use_music: z.boolean().default(true),
  clip_count: z.number().int().min(1).max(4).default(4),
  full_name: z.string().min(1),
  company_name: z.string().optional(),
  vessel_location: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  listing_description: z.string().min(1),
  music_style: z.string().optional(),
  caption_template_id: z.string().optional(),
  notification_email: z.string().email().optional(),
  image_urls: z.array(z.string().url()).min(1).max(4),
  logo_url: z.string().url().optional(),
  avatar_url: z.string().url().optional(),
})

// GET /api/jobs — list all jobs (for dashboard)
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('jobs')
      .select(
        'id, created_at, status, step_label, progress, full_name, company_name, vessel_location, email, use_ai_twin, use_music, clip_count, final_video_url, error_message'
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

// POST /api/jobs — create new job and trigger Inngest pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = CreateJobSchema.parse(body) as CreateJobInput

    const supabase = createAdminClient()
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        ...input,
        status: 'pending',
        step_label: 'Starting pipeline...',
        progress: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Fire Inngest event to start the background pipeline
    await inngest.send({
      name: 'yacht/job.started',
      data: { jobId: job.id },
    })

    return NextResponse.json({ jobId: job.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 })
    }
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
        ? String((error as Record<string, unknown>).message)
        : JSON.stringify(error)
    console.error('Create job error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
