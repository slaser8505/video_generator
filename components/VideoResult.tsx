'use client'

import { Download, ExternalLink } from 'lucide-react'

interface VideoResultProps {
  videoUrl: string
  vesselLocation?: string | null
  clientName?: string
}

export default function VideoResult({ videoUrl, vesselLocation, clientName }: VideoResultProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ aspectRatio: '9/16', maxHeight: 600, margin: '0 auto', width: '100%', background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <video
          src={videoUrl}
          controls
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <a
          href={videoUrl}
          download={`${vesselLocation ?? clientName ?? 'yacht'}-video.mp4`}
          className="btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Download size={15} />
          Download Video
        </a>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontWeight: 500,
            fontSize: '0.875rem',
            padding: '10px 20px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={15} />
          Open in Tab
        </a>
      </div>
    </div>
  )
}
