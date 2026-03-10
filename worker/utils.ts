import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

/**
 * Download a remote URL to a local file path. Returns the local path.
 */
export function downloadFile(url: string, destPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const file = fs.createWriteStream(destPath)
    const protocol = url.startsWith('https') ? https : http

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        const location = response.headers.location!
        file.close()
        fs.unlinkSync(destPath)
        downloadFile(location, destPath).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => file.close(() => resolve(destPath)))
      file.on('error', (err) => {
        fs.unlink(destPath, () => {})
        reject(err)
      })
    }).on('error', reject)
  })
}
