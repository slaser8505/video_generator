import { NextRequest, NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListingInfo {
  vessel_name?: string
  vessel_location?: string
  description?: string
  broker_name?: string
  broker_company?: string
  broker_email?: string
  broker_phone?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getMeta(html: string, property: string): string | undefined {
  const m = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')
  ) ?? html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i')
  )
  return m?.[1]?.trim()
}

function getFirstMatch(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return stripHtml(m[1]).trim()
  }
}

function extractText(block: string): string {
  return stripHtml(block).replace(/\s+/g, ' ').trim()
}

// ── Image Extraction ───────────────────────────────────────────────────────────

function extractImages(html: string, baseUrl: string): string[] {
  const seen = new Set<string>()
  const images: string[] = []

  const imgTagRegex = /<img[^>]+>/gi
  const srcAttrRegex = /(?:src|data-src|data-lazy-src|data-original|data-image|data-full)\s*=\s*["']([^"']+)["']/gi
  const srcsetRegex = /srcset\s*=\s*["']([^"']+)["']/gi

  let imgMatch
  while ((imgMatch = imgTagRegex.exec(html)) !== null) {
    const tag = imgMatch[0]
    const attrRegexCopy = new RegExp(srcAttrRegex.source, 'gi')
    let attrMatch
    while ((attrMatch = attrRegexCopy.exec(tag)) !== null) {
      const resolved = resolveUrl(attrMatch[1].trim(), baseUrl)
      if (resolved && !seen.has(resolved)) { seen.add(resolved); images.push(resolved) }
    }
    const srcsetRegexCopy = new RegExp(srcsetRegex.source, 'gi')
    let srcsetMatch
    while ((srcsetMatch = srcsetRegexCopy.exec(tag)) !== null) {
      const candidates = srcsetMatch[1].split(',').map((s) => s.trim().split(/\s+/)[0])
      for (const candidate of candidates) {
        const resolved = resolveUrl(candidate, baseUrl)
        if (resolved && !seen.has(resolved)) { seen.add(resolved); images.push(resolved) }
      }
    }
  }

  // OG/Twitter images — often the best
  for (const prop of ['og:image', 'twitter:image']) {
    const val = getMeta(html, prop)
    if (val) {
      const resolved = resolveUrl(val, baseUrl)
      if (resolved && !seen.has(resolved)) { seen.add(resolved); images.unshift(resolved) }
    }
  }

  return images.filter((url) => {
    const lower = url.toLowerCase()
    const isPhoto =
      /\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(lower) ||
      lower.includes('/photos/') ||
      lower.includes('/images/') ||
      lower.includes('/gallery/') ||
      lower.includes('/media/')
    const isIcon =
      lower.includes('logo') ||
      lower.includes('icon') ||
      lower.includes('favicon') ||
      lower.includes('sprite') ||
      /\d+x\d+/.test(lower)
    return isPhoto && !isIcon
  })
}

// ── Listing Info Extraction ───────────────────────────────────────────────────

function extractListingInfo(html: string, baseUrl: string): ListingInfo {
  const info: ListingInfo = {}

  // ── Vessel name / title ────────────────────────────────────────────────────
  const ogTitle = getMeta(html, 'og:title')
  if (ogTitle) {
    info.vessel_name = ogTitle.replace(/\s*[|–—-].*$/, '').trim()
  } else {
    const h1 = getFirstMatch(html, [
      /<h1[^>]*class="[^"]*(?:title|listing|vessel|boat|yacht)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    ])
    if (h1) info.vessel_name = h1.replace(/\s*[|–—-].*$/, '').trim()
  }

  // ── Location ──────────────────────────────────────────────────────────────
  info.vessel_location = getFirstMatch(html, [
    // Structured data
    /<[^>]+(?:itemprop|class|id)=["'][^"']*(?:location|city|port|region|harbor)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    // Common label patterns: "Location: Miami, FL" or "<dt>Location</dt><dd>Miami</dd>"
    /location\s*(?::|<\/\w+>\s*<\w[^>]*>)\s*([\w\s,]+?)(?:<|,?\s*(?:usa?|united states?|fl|ca|ny|tx|ct|ri|ma|me|nc|sc|md|va|wa)?\b)/i,
    // Port / marina
    /(?:port|marina|slip)\s*:\s*([^<\n,]+)/i,
  ])

  // ── Description ───────────────────────────────────────────────────────────
  const ogDesc = getMeta(html, 'og:description') ?? getMeta(html, 'description')
  if (ogDesc && ogDesc.length > 40) {
    info.description = ogDesc
  } else {
    // Try structured description blocks
    const descBlock = getFirstMatch(html, [
      /<[^>]+(?:class|id)=["'][^"']*(?:description|listing-desc|content|details|summary)[^"']*["'][^>]*>([\s\S]{100,2000}?)<\/(?:div|section|article|p)>/i,
      /<article[^>]*>([\s\S]{100,2000}?)<\/article>/i,
    ])
    if (descBlock) info.description = descBlock.slice(0, 800)
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  const emailMatch = html.match(/href\s*=\s*["']mailto:([^"'?\s]+)["']/i)
    ?? html.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})\b/)
  if (emailMatch?.[1]) info.broker_email = emailMatch[1]

  // ── Phone ─────────────────────────────────────────────────────────────────
  const phoneMatch = html.match(/href\s*=\s*["']tel:([^"']+)["']/i)
    ?? html.match(/(?:tel|phone|call)[^>]*>[\s\S]*?(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i)
    ?? html.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/)
  if (phoneMatch?.[1]) info.broker_phone = phoneMatch[1].trim()

  // ── Broker name ───────────────────────────────────────────────────────────
  info.broker_name = getFirstMatch(html, [
    /<[^>]+(?:class|id)=["'][^"']*(?:broker|agent|contact|salesperson)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    /(?:broker|agent|contact|listed by|listing agent)\s*:?\s*<\/?\w*>?\s*([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /<strong[^>]*>\s*([A-Z][a-z]+ [A-Z][a-z]+)\s*<\/strong>/,
  ])

  // ── Broker company ────────────────────────────────────────────────────────
  // Often from the page title after the separator, or a brokerage div
  const origin = new URL(baseUrl).hostname.replace(/^www\./, '')
  info.broker_company = getFirstMatch(html, [
    /<[^>]+(?:class|id)=["'][^"']*(?:brokerage|company|firm)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    /(?:brokerage|company)\s*:\s*([^<\n]+)/i,
  ]) ?? toTitleCase(origin.split('.')[0].replace(/-/g, ' '))

  return info
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    let parsed: URL
    try { parsed = new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Try multiple header sets in case of 403
    const headerSets: Record<string, string>[] = [
      {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    ]

    let html: string | null = null
    let lastStatus = 0

    for (const headers of headerSets) {
      try {
        const res = await fetch(parsed.href, {
          headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(12000),
        })
        lastStatus = res.status
        if (res.ok) {
          html = await res.text()
          break
        }
      } catch {
        // Try next header set
      }
    }

    if (!html) {
      return NextResponse.json(
        { error: `Could not access this page (HTTP ${lastStatus}). The site may block automated access — try uploading images directly instead.` },
        { status: 422 }
      )
    }

    const images = extractImages(html, parsed.href)
    const listingInfo = extractListingInfo(html, parsed.href)

    return NextResponse.json({ images, listingInfo, total: images.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch listing'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
