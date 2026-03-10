# Yacht Video Creator — Setup Guide

## Architecture

```
Next.js on Vercel  ←→  Supabase (DB + Storage + Realtime)
                   ←→  Inngest (background jobs)
                   ←→  ElevenLabs, Runway ML, Mirage APIs
                   ←→  FFmpeg Worker on Railway
                   ←→  Resend (email)
```

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in the SQL editor:
   ```
   supabase/migrations/001_initial.sql
   ```
3. Create a storage bucket named **`yacht-videos`** and set it to **Public**
4. Copy your project URL and keys to `.env.local`

---

## 2. Inngest

1. Sign up at [inngest.com](https://www.inngest.com) (free tier)
2. Create an app → copy the **Event Key** and **Signing Key** to `.env.local`
3. After deploying to Vercel, add the webhook URL in Inngest:
   ```
   https://your-vercel-app.vercel.app/api/inngest
   ```

For local dev, run the Inngest dev server in a separate terminal:
```bash
npx inngest-cli@latest dev
```
This proxies events from Inngest cloud to your local Next.js server.

---

## 3. Resend

1. Sign up at [resend.com](https://resend.com) (free: 100 emails/day)
2. Add and verify your sending domain
3. Create an API key and add to `.env.local`
4. Set `RESEND_FROM_EMAIL` to `videos@yourdomain.com`

---

## 4. FFmpeg Worker (Railway)

The worker is a separate Express service in the `worker/` directory.

**Deploy to Railway:**
1. Create a new project at [railway.app](https://railway.app)
2. Connect the `worker/` directory (or push just that folder as a separate repo)
3. Set the start command: `npm start`
4. Set environment variables:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   FFMPEG_WORKER_SECRET=your-shared-secret
   PORT=3001
   ```
5. Copy the Railway deployment URL to your main app's `FFMPEG_WORKER_URL`

**Install worker dependencies:**
```bash
cd worker
npm install
```

**Run locally (for testing):**
```bash
cd worker
npx ts-node index.ts
```

---

## 5. Main App

**Install dependencies:**
```bash
npm install
```

**Copy and fill in env:**
```bash
cp .env.local.example .env.local
# edit .env.local with your keys
```

**Run locally:**
```bash
npm run dev
```

**Deploy to Vercel:**
```bash
npx vercel
# or connect your GitHub repo at vercel.com
```
Add all env vars from `.env.local` to your Vercel project settings.

---

## API Keys Needed

| Service | Where to get |
|---------|-------------|
| Supabase | supabase.com → Project Settings |
| ElevenLabs | elevenlabs.io → Profile → API Keys |
| Runway ML | app.runwayml.com → Settings → API |
| Mirage | Your Mirage account |
| Inngest | app.inngest.com → Settings → Event Keys |
| Resend | resend.com → API Keys |

---

## App Flow

1. Go to `/new` → fill in form → upload images/logo/avatar
2. Click **Generate Video** → job created in Supabase, Inngest pipeline starts
3. Redirected to `/jobs/{id}` → real-time progress via Supabase channel
4. When complete: video player appears + download button + email sent
5. View all jobs at `/jobs`

---

## Toggle Features

- **AI Twin** — requires avatar photo and Mirage API. Creates talking head intro.
- **Music** — requires music style description. Generates 20s AI background track.
- **Clip count** — 1–4. Only those many images are needed.

When AI twin is OFF, no avatar is required and the Mirage step is skipped.
When music is OFF, the music generation step is skipped and only voiceover audio is used.
