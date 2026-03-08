// Shared logic for all serverless functions.
// Also used conceptually by server.js (which has its own copy for zero-dependency local dev).

const https = require('node:https')
const { URL } = require('node:url')

const ALLANIME_BASE = 'allanime.day'
const ALLANIME_API = `https://api.${ALLANIME_BASE}`
const ALLANIME_REFR = 'https://allmanga.to'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'

const XOR_MAP = {
  0x79: 'A', 0x7a: 'B', 0x7b: 'C', 0x7c: 'D', 0x7d: 'E', 0x7e: 'F', 0x7f: 'G', 0x70: 'H', 0x71: 'I', 0x72: 'J', 0x73: 'K', 0x74: 'L', 0x75: 'M', 0x76: 'N', 0x77: 'O',
  0x68: 'P', 0x69: 'Q', 0x6a: 'R', 0x6b: 'S', 0x6c: 'T', 0x6d: 'U', 0x6e: 'V', 0x6f: 'W', 0x60: 'X', 0x61: 'Y', 0x62: 'Z',
  0x59: 'a', 0x5a: 'b', 0x5b: 'c', 0x5c: 'd', 0x5d: 'e', 0x5e: 'f', 0x5f: 'g', 0x50: 'h', 0x51: 'i', 0x52: 'j', 0x53: 'k', 0x54: 'l', 0x55: 'm', 0x56: 'n', 0x57: 'o',
  0x48: 'p', 0x49: 'q', 0x4a: 'r', 0x4b: 's', 0x4c: 't', 0x4d: 'u', 0x4e: 'v', 0x4f: 'w', 0x40: 'x', 0x41: 'y', 0x42: 'z',
  0x08: '0', 0x09: '1', 0x0a: '2', 0x0b: '3', 0x0c: '4', 0x0d: '5', 0x0e: '6', 0x0f: '7', 0x00: '8', 0x01: '9',
  0x15: '-', 0x16: '.', 0x67: '_', 0x46: '~', 0x02: ':', 0x17: '/', 0x07: '?', 0x1b: '#', 0x63: '[', 0x65: ']', 0x78: '@', 0x19: '!', 0x1c: '$', 0x1e: '&', 0x10: '(', 0x11: ')', 0x12: '*', 0x13: '+', 0x14: ',', 0x03: ';', 0x05: '=', 0x1d: '%'
}

function decodeUrl(encoded) {
  const hex = encoded.slice(2)
  let result = ''
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result += XOR_MAP[byte] ?? ''
  }
  return result.replace('/clock', '/clock.json')
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0
    function get(urlStr) {
      if (redirectCount >= 5) return reject(new Error('Too many redirects'))
      https.get(urlStr, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++
          return get(res.headers.location)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => resolve(data))
      }).on('error', reject)
    }
    get(url)
  })
}

const PROXY_HEADERS = { 'Referer': ALLANIME_REFR, 'User-Agent': USER_AGENT }

async function search(q, mode) {
  const gql = `query($search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType) { shows(search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin) { edges { _id name availableEpisodes __typename } } }`
  const variables = { search: { allowAdult: false, allowUnknown: false, query: q }, limit: 40, page: 1, translationType: mode, countryOrigin: 'ALL' }
  const url = new URL(`${ALLANIME_API}/api`)
  url.searchParams.set('variables', JSON.stringify(variables))
  url.searchParams.set('query', gql)
  const body = await httpsGet(url.toString(), PROXY_HEADERS)
  const data = JSON.parse(body)
  return (data.data?.shows?.edges ?? []).map((e) => ({ id: e._id, title: e.name, episodes: e.availableEpisodes?.[mode] ?? 0 }))
}

async function episodes(id, mode) {
  const gql = `query($showId: String!) { show(_id: $showId) { _id availableEpisodesDetail } }`
  const variables = { showId: id }
  const url = new URL(`${ALLANIME_API}/api`)
  url.searchParams.set('variables', JSON.stringify(variables))
  url.searchParams.set('query', gql)
  const body = await httpsGet(url.toString(), PROXY_HEADERS)
  const data = JSON.parse(body)
  const list = data.data?.show?.availableEpisodesDetail?.[mode] ?? []
  return list.sort((a, b) => parseFloat(a) - parseFloat(b))
}

async function resolve(id, ep, mode) {
  const gql = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId translationType: $translationType episodeString: $episodeString) { episodeString sourceUrls } }`
  const variables = { showId: id, translationType: mode, episodeString: ep }
  const url = new URL(`${ALLANIME_API}/api`)
  url.searchParams.set('variables', JSON.stringify(variables))
  url.searchParams.set('query', gql)
  const body = await httpsGet(url.toString(), PROXY_HEADERS)
  const data = JSON.parse(body)
  const sourceUrls = data.data?.episode?.sourceUrls ?? []
  const decodable = sourceUrls.filter((s) => s.sourceUrl?.startsWith('--')).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  for (const source of decodable) {
    try {
      const decoded = decodeUrl(source.sourceUrl)
      const srcBody = await httpsGet(`https://${ALLANIME_BASE}${decoded}`, PROXY_HEADERS)
      const srcData = JSON.parse(srcBody)
      if (srcData.links?.length > 0) {
        return { sources: srcData.links.map((l) => ({ url: l.link, resolution: l.resolutionStr || 'unknown', hls: l.hls ?? false })) }
      }
    } catch { continue }
  }
  return { sources: [] }
}

module.exports = { search, episodes, resolve }
