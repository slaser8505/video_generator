'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Toggle from './Toggle'
import ClipSelector from './ClipSelector'
import ImageUpload from './ImageUpload'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  company_name: z.string().optional(),
  vessel_location: z.string().optional(),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  listing_description: z.string().min(20, 'Please provide a detailed description'),
  music_style: z.string().optional(),
  caption_template_id: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-0.5">{message}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50"
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 resize-none disabled:opacity-50"
    />
  )
}

export default function YachtForm() {
  const router = useRouter()
  const [useAiTwin, setUseAiTwin] = useState(true)
  const [useMusic, setUseMusic] = useState(true)
  const [clipCount, setClipCount] = useState(4)
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function setImageUrl(index: number, url: string | null) {
    setImageUrls((prev) => {
      const next = [...prev]
      next[index] = url
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)

    const validImages = imageUrls.slice(0, clipCount).filter(Boolean) as string[]
    if (validImages.length === 0) {
      setSubmitError('Please upload at least 1 image for your video clips.')
      return
    }

    if (useAiTwin && !avatarUrl) {
      setSubmitError('Please upload an avatar image for the AI twin, or disable AI twin.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          use_ai_twin: useAiTwin,
          use_music: useMusic,
          clip_count: clipCount,
          image_urls: validImages,
          logo_url: logoUrl ?? undefined,
          avatar_url: avatarUrl ?? undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create job')

      router.push(`/jobs/${json.jobId}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const uploadedImages = imageUrls.slice(0, clipCount).filter(Boolean).length

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Settings bar ─────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Video Settings
        </h2>
        <Toggle
          enabled={useAiTwin}
          onChange={setUseAiTwin}
          label="AI Twin"
          description="Generate a talking head video of the avatar presenting the listing"
        />
        <Toggle
          enabled={useMusic}
          onChange={setUseMusic}
          label="Background Music"
          description="Add AI-generated background music to the final video"
        />
        <ClipSelector value={clipCount} onChange={setClipCount} />
      </div>

      {/* ── Client info ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
          Client Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Full Name</Label>
            <Input {...register('full_name')} placeholder="John Smith" />
            <FieldError message={errors.full_name?.message} />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input {...register('company_name')} placeholder="Smith Yachts" />
          </div>
          <div>
            <Label required>Email</Label>
            <Input {...register('email')} type="email" placeholder="john@smithyachts.com" />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...register('phone')} type="tel" placeholder="+1 555 000 0000" />
          </div>
          <div className="sm:col-span-2">
            <Label>Vessel Location</Label>
            <Input {...register('vessel_location')} placeholder="Miami, FL" />
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
          Listing Content
        </h2>
        <div>
          <Label required>Listing Description</Label>
          <Textarea
            {...register('listing_description')}
            rows={5}
            placeholder="Describe the yacht — features, highlights, specs, lifestyle appeal..."
          />
          <p className="text-xs text-gray-400 mt-0.5">
            This will be read aloud as the voiceover narration
          </p>
          <FieldError message={errors.listing_description?.message} />
        </div>
        {useMusic && (
          <div>
            <Label>Music Style</Label>
            <Input
              {...register('music_style')}
              placeholder="Calm, luxury, ambient — or describe a vibe"
            />
          </div>
        )}
        {useAiTwin && (
          <div>
            <Label>Mirage Caption Template ID</Label>
            <Input {...register('caption_template_id')} placeholder="Optional — from your Mirage account" />
          </div>
        )}
      </div>

      {/* ── Assets ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide border-b pb-2">
          Assets
        </h2>

        {/* Yacht images */}
        <div>
          <Label required>Yacht Images ({clipCount} needed)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
            {Array.from({ length: clipCount }).map((_, i) => (
              <ImageUpload
                key={i}
                label={`Image ${i + 1}`}
                description="JPEG or PNG"
                value={imageUrls[i] ?? undefined}
                uploadPath={`uploads/${Date.now()}-img-${i}`}
                onUpload={(url) => setImageUrl(i, url)}
                onRemove={() => setImageUrl(i, null)}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {uploadedImages}/{clipCount} uploaded
          </p>
        </div>

        {/* Logo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label>Company Logo</Label>
            <ImageUpload
              label="Logo"
              description="PNG with transparency recommended"
              accept="image/*"
              value={logoUrl ?? undefined}
              uploadPath={`uploads/${Date.now()}-logo`}
              onUpload={setLogoUrl}
              onRemove={() => setLogoUrl(null)}
            />
          </div>

          {/* Avatar (AI twin only) */}
          {useAiTwin && (
            <div>
              <Label required={useAiTwin}>Avatar Photo</Label>
              <ImageUpload
                label="Avatar"
                description="Clear face photo for AI twin"
                value={avatarUrl ?? undefined}
                uploadPath={`uploads/${Date.now()}-avatar`}
                onUpload={setAvatarUrl}
                onRemove={() => setAvatarUrl(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creating job...
          </>
        ) : (
          'Generate Video'
        )}
      </button>
    </form>
  )
}
