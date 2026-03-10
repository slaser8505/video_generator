import { Resend } from 'resend'

export async function sendVideoReadyEmail({
  to,
  clientName,
  vesselLocation,
  videoUrl,
}: {
  to: string
  clientName: string
  vesselLocation: string | null
  videoUrl: string
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const subject = vesselLocation
    ? `Your yacht video is ready — ${vesselLocation}`
    : `Your yacht marketing video is ready`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Yacht Videos <videos@resend.dev>',
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin-top:0">Your video is ready! 🎬</h2>
        <p>Hi ${clientName},</p>
        <p>
          ${vesselLocation ? `The marketing video for <strong>${vesselLocation}</strong> has been generated and is ready to download.` : 'Your yacht marketing video is ready.'}
        </p>
        <p style="margin:32px 0">
          <a href="${videoUrl}"
             style="background:#0070f3;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
            Download Video
          </a>
        </p>
        <p style="color:#666;font-size:14px">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="${videoUrl}" style="color:#0070f3">${videoUrl}</a>
        </p>
      </body>
      </html>
    `,
  })
}
