'use client'

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  label: string
  description?: string
  accept?: string
  onUpload: (url: string) => void
  onRemove?: () => void
  value?: string
  uploadPath: string
}

export default function ImageUpload({
  label,
  description,
  accept = 'image/*',
  onUpload,
  onRemove,
  value,
  uploadPath,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  async function handleFile(file: File) {
    if (!file) return
    setError(null)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', uploadPath)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      onUpload(json.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (value) {
    return (
      <div
        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img src={value} alt={label} style={{ width: '100%', height: 'auto', maxHeight: 240, objectFit: 'contain', display: 'block', background: 'var(--surface-2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }}>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#374151' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0', background: 'var(--surface)' }}>{label}</p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        style={{
          width: '100%',
          borderRadius: 10,
          border: `2px dashed ${isDragOver ? 'var(--blue)' : 'var(--border)'}`,
          background: isDragOver ? 'var(--blue-dim)' : 'var(--surface-2)',
          padding: '14px 8px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          transition: 'all 0.15s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: 18, height: 18, border: '2px solid var(--blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Uploading...</span>
          </>
        ) : (
          <>
            <ImageIcon size={18} style={{ color: 'var(--text-dim)' }} />
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
            {description && <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: 0 }}>{description}</p>}
            <p style={{ fontSize: '0.65rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 3, margin: 0 }}>
              <Upload size={9} /> Click or drop
            </p>
          </>
        )}
      </button>
      {error && <p style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: 4 }}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
