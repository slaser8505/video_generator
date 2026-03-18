'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Toggle from './Toggle'
import ClipSelector from './ClipSelector'
import ImageUpload from './ImageUpload'
import ListingImagePicker from './ListingImagePicker'
import { Loader2, Search, CheckCircle2 } from 'lucide-react'
import type { ListingInfo } from '@/app/api/scrape-listing/route'

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
  return <p style={{ fontSize: '0.72rem', color: 'var(--error)', marginTop: 4, margin: 0 }}>{message}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
      {children} {required && <span style={{ color: 'var(--error)' }}>*</span>}
    </label>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  padding: '9px 12px',
  fontSize: '0.875rem',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...(props.style ?? {}) }} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...fieldStyle, resize: 'none' }} />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

export default function YachtForm() {
  const router = useRouter()
  const [useAiTwin, setUseAiTwin] = useState(true)
  const [useMusic, setUseMusic] = useState(true)
  const [clipCount, setClipCount] = useState(4)
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null])
  const [imageSource, setImageSource] = useState<'listing' | 'upload'>('listing')
  const [fetchedImages, setFetchedImages] = useState<string[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Quick fill from listing URL
  const [listingUrl, setListingUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [listingFetched, setListingFetched] = useState(false)
  const [filledFields, setFilledFields] = useState<string[]>([])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function setImageUrl(index: number, url: string | null) {
    setImageUrls((prev) => {
      const next = [...prev]
      next[index] = url
      return next
    })
  }

  async function fetchListing() {
    if (!listingUrl.trim()) return
    setFetchLoading(true)
    setFetchError(null)
    setListingFetched(false)

    try {
      const res = await fetch('/api/scrape-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch listing')

      const info: ListingInfo = json.listingInfo ?? {}
      const images: string[] = json.images ?? []

      // Auto-populate form fields
      const filled: string[] = []
      if (info.broker_name) { setValue('full_name', info.broker_name); filled.push('Broker name') }
      if (info.broker_company) { setValue('company_name', info.broker_company); filled.push('Company') }
      if (info.broker_email) { setValue('email', info.broker_email); filled.push('Email') }
      if (info.broker_phone) { setValue('phone', info.broker_phone); filled.push('Phone') }
      if (info.vessel_location) { setValue('vessel_location', info.vessel_location); filled.push('Location') }
      if (info.description) { setValue('listing_description', info.description); filled.push('Description') }

      // Load images into picker
      if (images.length > 0) {
        setFetchedImages(images)
        setImageSource('listing')
        filled.push(`${images.length} photos`)
        // Auto-select first N images up to clipCount
        const autoSelected = images.slice(0, clipCount)
        const next: (string | null)[] = [null, null, null, null]
        autoSelected.forEach((u, i) => { next[i] = u })
        setImageUrls(next)
      }

      setFilledFields(filled)
      setListingFetched(true)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch listing')
    } finally {
      setFetchLoading(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)

    const validImages = imageUrls.slice(0, clipCount).filter(Boolean) as string[]
    if (validImages.length === 0) {
      setSubmitError('Please select at least 1 image for your video clips.')
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
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Quick Fill from Listing URL ───────────────────────────────────── */}
      <div>
        <SectionHeader>Quick Fill from Listing URL</SectionHeader>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Paste a yacht listing URL to auto-populate broker info, description, and photos.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
              <input
                type="url"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), fetchListing())}
                placeholder="https://yachtworld.com/listing/..."
                style={{ ...fieldStyle, paddingLeft: 30 }}
              />
            </div>
            <button
              type="button"
              onClick={fetchListing}
              disabled={fetchLoading || !listingUrl.trim()}
              className="btn-primary"
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: '0.825rem', opacity: (fetchLoading || !listingUrl.trim()) ? 0.5 : 1, cursor: (fetchLoading || !listingUrl.trim()) ? 'not-allowed' : 'pointer', border: 'none' }}
            >
              {fetchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {fetchLoading ? 'Fetching...' : 'Fetch Listing'}
            </button>
          </div>

          {fetchError && (
            <div style={{ fontSize: '0.78rem', color: 'var(--error)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              ⚠ {fetchError}
            </div>
          )}

          {listingFetched && filledFields.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--success)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              <CheckCircle2 size={14} />
              Auto-filled: {filledFields.join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Video Settings</SectionHeader>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Toggle
            enabled={useAiTwin}
            onChange={setUseAiTwin}
            label="AI Twin"
            description="Generate a talking head video of the avatar presenting the listing"
          />
          <div style={{ height: 1, background: 'var(--border)' }} />
          <Toggle
            enabled={useMusic}
            onChange={setUseMusic}
            label="Background Music"
            description="Add AI-generated background music to the final video"
          />
          <div style={{ height: 1, background: 'var(--border)' }} />
          <ClipSelector value={clipCount} onChange={setClipCount} />
        </div>
      </div>

      {/* ── Client info ──────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Broker Information</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label required>Broker Name</Label>
            <Input {...register('full_name')} placeholder="John Smith" />
            <FieldError message={errors.full_name?.message} />
          </div>
          <div>
            <Label>Brokerage / Company</Label>
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
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Vessel Location</Label>
            <Input {...register('vessel_location')} placeholder="Miami, FL" />
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Listing Content</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label required>Listing Description</Label>
            <Textarea
              {...register('listing_description')}
              rows={5}
              placeholder="Describe the yacht — features, highlights, specs, lifestyle appeal..."
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
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
      </div>

      {/* ── Assets ───────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>Assets</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Yacht images */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Label required>Yacht Images ({clipCount} needed)</Label>
              <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', fontSize: '0.75rem', fontWeight: 600 }}>
                <button
                  type="button"
                  onClick={() => setImageSource('listing')}
                  style={{
                    padding: '5px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: imageSource === 'listing' ? 'var(--blue)' : 'var(--surface-2)',
                    color: imageSource === 'listing' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  From Listing URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('upload')}
                  style={{
                    padding: '5px 12px',
                    border: 'none',
                    borderLeft: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: imageSource === 'upload' ? 'var(--blue)' : 'var(--surface-2)',
                    color: imageSource === 'upload' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  Upload Files
                </button>
              </div>
            </div>

            {imageSource === 'listing' ? (
              <ListingImagePicker
                clipCount={clipCount}
                selectedUrls={imageUrls}
                preloadedImages={fetchedImages}
                onSelect={(urls) => {
                  const next: (string | null)[] = [null, null, null, null]
                  urls.forEach((u, i) => { next[i] = u })
                  setImageUrls(next)
                }}
              />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>{uploadedImages}/{clipCount} uploaded</p>
              </>
            )}
          </div>

          {/* Logo + Avatar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div>
              <Label>Company Logo</Label>
              <ImageUpload
                label="Logo"
                description="PNG recommended"
                accept="image/*"
                value={logoUrl ?? undefined}
                uploadPath={`uploads/${Date.now()}-logo`}
                onUpload={setLogoUrl}
                onRemove={() => setLogoUrl(null)}
              />
            </div>

            {useAiTwin && (
              <div>
                <Label required={useAiTwin}>Avatar Photo</Label>
                <ImageUpload
                  label="Avatar"
                  description="Clear face photo"
                  value={avatarUrl ?? undefined}
                  uploadPath={`uploads/${Date.now()}-avatar`}
                  onUpload={setAvatarUrl}
                  onRemove={() => setAvatarUrl(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      {submitError && (
        <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: '0.875rem', color: 'var(--error)' }}>
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer', border: 'none' }}
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
