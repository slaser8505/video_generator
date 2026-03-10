import { createAdminClient } from './supabase/server'

const BUCKET = 'yacht-videos'

/**
 * Upload a Buffer/Blob to Supabase Storage and return a public URL.
 */
export async function uploadBuffer(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Download a remote URL and re-upload to Supabase Storage.
 * Returns the new public URL.
 */
export async function downloadAndUpload(
  url: string,
  storagePath: string,
  contentType = 'application/octet-stream'
): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return uploadBuffer(buffer, storagePath, contentType)
}

/**
 * Upload a File/Blob from a FormData request.
 */
export async function uploadFile(file: File, storagePath: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return uploadBuffer(buffer, storagePath, file.type || 'application/octet-stream')
}
