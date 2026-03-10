export type JobStatus =
  | 'pending'
  | 'uploading'
  | 'generating_voice'
  | 'generating_music'
  | 'generating_clips'
  | 'generating_twin'
  | 'assembling'
  | 'sending_email'
  | 'completed'
  | 'failed'

export interface Job {
  id: string
  created_at: string
  updated_at: string
  status: JobStatus
  step_label: string | null
  progress: number
  error_message: string | null
  use_ai_twin: boolean
  use_music: boolean
  clip_count: number
  full_name: string
  company_name: string | null
  vessel_location: string | null
  email: string
  phone: string | null
  listing_description: string
  music_style: string | null
  caption_template_id: string | null
  notification_email: string | null
  image_urls: string[]
  logo_url: string | null
  avatar_url: string | null
  voiceover_url: string | null
  music_url: string | null
  clip_urls: string[]
  ai_twin_url: string | null
  final_video_url: string | null
}

export interface CreateJobInput {
  use_ai_twin: boolean
  use_music: boolean
  clip_count: number
  full_name: string
  company_name?: string
  vessel_location?: string
  email: string
  phone?: string
  listing_description: string
  music_style?: string
  caption_template_id?: string
  notification_email?: string
  image_urls: string[]
  logo_url?: string
  avatar_url?: string
}

export interface AssembleRequest {
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
