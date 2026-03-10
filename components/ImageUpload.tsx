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
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        <img src={value} alt={label} className="w-full h-32 object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="bg-white rounded-full p-1.5 text-gray-700 hover:text-red-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center py-1 bg-white">{label}</p>
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
        className={`w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ImageIcon size={20} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {description && <p className="text-xs text-gray-400">{description}</p>}
            <p className="text-xs text-blue-500 flex items-center gap-1">
              <Upload size={10} /> Click or drag to upload
            </p>
          </div>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
