'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ListingImagePickerProps {
  clipCount: number
  onSelect: (urls: string[]) => void
  selectedUrls: (string | null)[]
  preloadedImages?: string[]
}

export default function ListingImagePicker({
  clipCount,
  onSelect,
  selectedUrls,
  preloadedImages = [],
}: ListingImagePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedUrls.filter(Boolean) as string[])
  )

  const images = preloadedImages

  function toggleImage(imgUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(imgUrl)) {
        next.delete(imgUrl)
      } else {
        if (next.size >= clipCount) {
          const [first] = next
          next.delete(first)
        }
        next.add(imgUrl)
      }
      onSelect(Array.from(next))
      return next
    })
  }

  function clearSelected() {
    setSelected(new Set())
    onSelect([])
  }

  if (images.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        Fetch a listing URL above to load images here
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
          {selected.size}/{clipCount} selected — click to select
        </p>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={clearSelected}
            style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
        {images.map((imgUrl, i) => {
          const isSelected = selected.has(imgUrl)
          const selectionIndex = isSelected ? Array.from(selected).indexOf(imgUrl) + 1 : null

          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleImage(imgUrl)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 8,
                overflow: 'hidden',
                border: isSelected ? '2px solid var(--blue)' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                background: 'var(--surface-2)',
                boxShadow: isSelected ? '0 0 10px rgba(46,163,242,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <img
                src={imgUrl}
                alt={`Listing image ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  ;(e.currentTarget.parentElement as HTMLElement).style.display = 'none'
                }}
              />
              {isSelected && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(46,163,242,0.15)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 4 }}>
                  <span style={{ background: 'var(--blue)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectionIndex}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selected.size === clipCount && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px' }}>
          ✓ {clipCount} images selected — ready to go
        </div>
      )}
    </div>
  )
}
