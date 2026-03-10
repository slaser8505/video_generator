import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { processJob } from '@/inngest/functions/processJob'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processJob],
})
