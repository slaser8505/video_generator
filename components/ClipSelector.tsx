'use client'

interface ClipSelectorProps {
  value: number
  onChange: (value: number) => void
}

export default function ClipSelector({ value, onChange }: ClipSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-2">Number of clips</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all border-2 ${
              value === n
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {value} image{value !== 1 ? 's' : ''} will be converted to video clips
      </p>
    </div>
  )
}
