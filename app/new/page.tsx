import YachtForm from '@/components/YachtForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewJobPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={14} />
            All jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">New Yacht Video</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details below to generate an AI-powered marketing video.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <YachtForm />
        </div>
      </div>
    </div>
  )
}
