const http = require('node:http')
const https = require('node:https')
const { URL } = require('node:url')
const fs = require('node:fs')
const path = require('node:path')

// ============================================================================
// CONSTANTS
// ============================================================================

const PORT = process.env.PORT || 9001
const ALLANIME_BASE = 'allanime.day'
const ALLANIME_API = `https://api.${ALLANIME_BASE}`
const ALLANIME_REFR = 'https://allmanga.to'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'

// ============================================================================
// XOR DECODER
// ============================================================================

const XOR_MAP = {
  0x79: 'A', 0x7a: 'B', 0x7b: 'C', 0x7c: 'D', 0x7d: 'E', 0x7e: 'F', 0x7f: 'G', 0x70: 'H', 0x71: 'I', 0x72: 'J', 0x73: 'K', 0x74: 'L', 0x75: 'M', 0x76: 'N', 0x77: 'O',
  0x68: 'P', 0x69: 'Q', 0x6a: 'R', 0x6b: 'S', 0x6c: 'T', 0x6d: 'U', 0x6e: 'V', 0x6f: 'W', 0x60: 'X', 0x61: 'Y', 0x62: 'Z',
  0x59: 'a', 0x5a: 'b', 0x5b: 'c', 0x5c: 'd', 0x5d: 'e', 0x5e: 'f', 0x5f: 'g', 0x50: 'h', 0x51: 'i', 0x52: 'j', 0x53: 'k', 0x54: 'l', 0x55: 'm', 0x56: 'n', 0x57: 'o',
  0x48: 'p', 0x49: 'q', 0x4a: 'r', 0x4b: 's', 0x4c: 't', 0x4d: 'u', 0x4e: 'v', 0x4f: 'w', 0x40: 'x', 0x41: 'y', 0x42: 'z',
  0x08: '0', 0x09: '1', 0x0a: '2', 0x0b: '3', 0x0c: '4', 0x0d: '5', 0x0e: '6', 0x0f: '7', 0x00: '8', 0x01: '9',
  0x15: '-', 0x16: '.', 0x67: '_', 0x46: '~', 0x02: ':', 0x17: '/', 0x07: '?', 0x1b: '#', 0x63: '[', 0x65: ']', 0x78: '@', 0x19: '!', 0x1c: '$', 0x1e: '&', 0x10: '(', 0x11: ')', 0x12: '*', 0x13: '+', 0x14: ',', 0x03: ';', 0x05: '=', 0x1d: '%'
}

function decodeUrl(encoded) {
  // Strip leading "--"
  const hex = encoded.slice(2)
  let result = ''
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result += XOR_MAP[byte] ?? ''
  }
  // ani-cli replaces /clock with /clock.json
  return result.replace('/clock', '/clock.json')
}

// ============================================================================
// HTTPS GET WITH REDIRECT SUPPORT
// ============================================================================

function httpsGet(url, headers, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0
    const maxRedirects = 5

    function get(urlStr) {
      if (redirectCount >= maxRedirects) {
        return reject(new Error('Too many redirects'))
      }

      const req = https.get(urlStr, { headers }, (res) => {
        let data = ''

        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++
          return get(res.headers.location)
        }

        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          resolve(data)
        })
      }).on('error', reject)

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Timeout after ${timeoutMs}ms`))
      })
    }

    get(url)
  })
}

// ============================================================================
// API HANDLERS
// ============================================================================

async function handleSearch(res, query, mode) {
  try {
    const graphqlQuery = `query($search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType) { shows(search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin) { edges { _id name availableEpisodes __typename } } }`

    const variables = {
      search: { allowAdult: false, allowUnknown: false, query },
      limit: 40,
      page: 1,
      translationType: mode,
      countryOrigin: 'ALL'
    }

    const url = new URL(`${ALLANIME_API}/api`)
    url.searchParams.set('variables', JSON.stringify(variables))
    url.searchParams.set('query', graphqlQuery)

    const headers = {
      'Referer': ALLANIME_REFR,
      'User-Agent': USER_AGENT
    }

    const body = await httpsGet(url.toString(), headers)
    const data = JSON.parse(body)

    if (!data.data?.shows?.edges) {
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([]))
    }

    const results = data.data.shows.edges.map((edge) => ({
      id: edge._id,
      title: edge.name,
      episodes: edge.availableEpisodes?.[mode] ?? 0
    }))

    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(results))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }))
  }
}

async function handleEpisodes(res, id, mode) {
  try {
    const graphqlQuery = `query($showId: String!) { show(_id: $showId) { _id availableEpisodesDetail } }`

    const variables = { showId: id }

    const url = new URL(`${ALLANIME_API}/api`)
    url.searchParams.set('variables', JSON.stringify(variables))
    url.searchParams.set('query', graphqlQuery)

    const headers = {
      'Referer': ALLANIME_REFR,
      'User-Agent': USER_AGENT
    }

    const body = await httpsGet(url.toString(), headers)
    const data = JSON.parse(body)

    if (!data.data?.show?.availableEpisodesDetail) {
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([]))
    }

    const episodes = data.data.show.availableEpisodesDetail[mode] ?? []

    // Sort numerically
    const sorted = episodes.sort((a, b) => {
      const numA = parseFloat(a)
      const numB = parseFloat(b)
      return numA - numB
    })

    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(sorted))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }))
  }
}

async function handleResolve(res, id, ep, mode) {
  try {
    const graphqlQuery = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId translationType: $translationType episodeString: $episodeString) { episodeString sourceUrls } }`

    const variables = { showId: id, translationType: mode, episodeString: ep }

    const url = new URL(`${ALLANIME_API}/api`)
    url.searchParams.set('variables', JSON.stringify(variables))
    url.searchParams.set('query', graphqlQuery)

    const headers = {
      'Referer': ALLANIME_REFR,
      'User-Agent': USER_AGENT
    }

    const body = await httpsGet(url.toString(), headers)
    const data = JSON.parse(body)

    if (!data.data?.episode?.sourceUrls) {
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sources: [] }))
    }

    const sourceUrls = data.data.episode.sourceUrls

    // Filter to decodable sources (starting with "--")
    const decodableSources = sourceUrls.filter((s) => s.sourceUrl?.startsWith('--'))

    if (decodableSources.length === 0) {
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sources: [] }))
    }

    const sourceHeaders = { 'Referer': ALLANIME_REFR, 'User-Agent': USER_AGENT }

    // Race all sources in parallel — like ani-cli does with background jobs
    // Each attempt resolves with a sources array or rejects; Promise.any takes the first success
    const attempts = decodableSources.map(async (source) => {
      const decoded = decodeUrl(source.sourceUrl)

      // If decoded URL is already absolute (e.g. https://tools.fast4...), use as-is
      // Otherwise it's a relative path under allanime.day
      const clockUrl = /^https?:\/\//i.test(decoded)
        ? decoded
        : `https://${ALLANIME_BASE}${decoded}`

      const body = await httpsGet(clockUrl, sourceHeaders)
      const data = JSON.parse(body)

      if (!data.links || data.links.length === 0) throw new Error('no links')

      return data.links.map((link) => ({
        url: link.link,
        resolution: link.resolutionStr || 'unknown',
        hls: link.hls ?? false
      }))
    })

    try {
      const sources = await Promise.any(attempts)
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sources }))
    } catch {
      // All sources failed
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sources: [] }))
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }))
  }
}

// ============================================================================
// M3U8 PROXY
// ============================================================================

// Rewrite M3U8 playlist so all segment/sub-playlist URLs go through our proxy
function rewriteM3u8(content, originalUrl) {
  const base = new URL(originalUrl)
  return content.split('\n').map(line => {
    const trimmed = line.trim()
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) return line
    // Absolute URL
    if (/^https?:\/\//i.test(trimmed)) {
      return `/api/proxy?url=${encodeURIComponent(trimmed)}`
    }
    // Relative URL — resolve against the original M3U8 URL
    const resolved = new URL(trimmed, base).toString()
    return `/api/proxy?url=${encodeURIComponent(resolved)}`
  }).join('\n')
}

async function handleProxy(res, targetUrl) {
  if (!targetUrl) {
    return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing url param')
  }

  // Only allow http/https
  let parsed
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol')
  } catch {
    return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Invalid URL')
  }

  try {
    const proxyHeaders = {
      'User-Agent': USER_AGENT,
      'Referer': ALLANIME_REFR,
      'Origin': 'https://allmanga.to',
    }

    await new Promise((resolve, reject) => {
      let redirectCount = 0
      function get(urlStr) {
        if (redirectCount >= 5) return reject(new Error('Too many redirects'))
        https.get(urlStr, { headers: proxyHeaders }, (upstream) => {
          if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
            redirectCount++
            return get(upstream.headers.location)
          }

          if (upstream.statusCode !== 200) {
            upstream.resume()
            res.writeHead(upstream.statusCode, { 'Content-Type': 'text/plain' })
            res.end(`Upstream ${upstream.statusCode}`)
            return resolve()
          }

          const contentType = upstream.headers['content-type'] || ''
          const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL')

          if (isM3u8) {
            // Buffer the playlist, rewrite URLs, send as text
            let body = ''
            upstream.setEncoding('utf8')
            upstream.on('data', chunk => { body += chunk })
            upstream.on('end', () => {
              const rewritten = rewriteM3u8(body, targetUrl)
              res.writeHead(200, {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*'
              })
              res.end(rewritten)
              resolve()
            })
          } else {
            // Binary passthrough (TS segments, keys, etc.)
            res.writeHead(200, {
              'Content-Type': contentType || 'application/octet-stream',
              'Access-Control-Allow-Origin': '*'
            })
            upstream.pipe(res)
            upstream.on('end', resolve)
          }
        }).on('error', reject)
      }
      get(targetUrl)
    })
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' }).end(`Proxy error: ${error.message}`)
    }
  }
}

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

function serveStatic(res, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found')
  }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

async function requestHandler(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
  const pathname = parsedUrl.pathname
  const query = parsedUrl.searchParams

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.writeHead(200).end()
  }

  if (req.method !== 'GET') {
    return res.writeHead(405, { 'Content-Type': 'text/plain' }).end('405 Method Not Allowed')
  }

  // Static files
  if (pathname === '/') {
    return serveStatic(res, path.join(__dirname, 'index.html'))
  }

  if (pathname === '/anime.html') {
    return serveStatic(res, path.join(__dirname, 'anime.html'))
  }

  if (pathname === '/anilist.js') {
    return serveStatic(res, path.join(__dirname, 'anilist.js'))
  }

  // API routes
  if (pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ANILIST_CLIENT_ID: process.env.ANILIST_CLIENT_ID || '' }))
  }

  if (pathname === '/api/search') {
    const q = query.get('q') || ''
    const mode = query.get('mode') || 'sub'
    return handleSearch(res, q, mode)
  }

  if (pathname === '/api/episodes') {
    const id = query.get('id') || ''
    const mode = query.get('mode') || 'sub'
    return handleEpisodes(res, id, mode)
  }

  if (pathname === '/api/resolve') {
    const id = query.get('id') || ''
    const ep = query.get('ep') || ''
    const mode = query.get('mode') || 'sub'
    return handleResolve(res, id, ep, mode)
  }

  if (pathname === '/api/proxy') {
    const targetUrl = query.get('url') || ''
    return handleProxy(res, targetUrl)
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found')
}

// ============================================================================
// START SERVER
// ============================================================================

const server = http.createServer(requestHandler)

server.listen(PORT, () => {
  console.log(`ani-web running at http://localhost:${PORT}`)
})
