'use client'

import { Download, Play } from 'lucide-react'

interface VideoResultProps {
  videoUrl: string
  vesselLocation?: string | null
  clientName?: string
}

export default function VideoResult({ videoUrl, vesselLocation, clientName }: VideoResultProps) {
  return (
    <div className="space-y-4">
      <div className="aspect-[9/16] max-h-[600px] mx-auto bg-black rounded-xl overflow-hidden shadow-lg">
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full object-contain"
          poster=""
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="flex gap-3 justify-center">
        <a
          href={videoUrl}
          download={`${vesselLocation ?? clientName ?? 'yacht'}-video.mp4`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
        >
          <Download size={16} />
          Download Video
        </a>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-5 rounded-lg transition-colors"
        >
          <Play size={16} />
          Open in New Tab
        </a>
      </div>
    </div>
  )
}
