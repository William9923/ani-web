// Anilist Integration Service

const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize'
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'
let CLIENT_ID = ''

const anilistState = {
  token: null,
  user: null
}

// 1. Initialize Anilist Service
async function initAnilist() {
  // Try to extract token from URL hash (after redirect)
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')

  if (accessToken) {
    localStorage.setItem('anilist_token', accessToken)
    // Remove token from URL for security
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  anilistState.token = localStorage.getItem('anilist_token')

  try {
    const res = await fetch('/api/config')
    const config = await res.json()
    CLIENT_ID = config.ANILIST_CLIENT_ID
  } catch (err) {
    console.warn('Failed to fetch AniList Client ID')
  }

  if (anilistState.token) {
    await fetchAnilistUser()
  }

  setupAnilistUI()

  if (anilistState.token) {
    // Run sync asynchronously in the background
    syncLocalToAnilist()
  }
}

// 2. Auth Flow
function loginAnilist() {
  if (!CLIENT_ID) {
    alert('AniList integration is not configured.')
    return
  }
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname)
  window.location.href = `${ANILIST_AUTH_URL}?client_id=${CLIENT_ID}&response_type=token`
}

function logoutAnilist() {
  if (confirm('Are you sure you want to logout from AniList?')) {
    localStorage.removeItem('anilist_token')
    anilistState.token = null
    anilistState.user = null
    setupAnilistUI()
  }
}

// 3. UI Setup (Hamburger Menu Integration)
function setupAnilistUI() {
  const fabItems = document.getElementById('fab-items')
  if (!fabItems) return

  let btn = document.getElementById('anilist-auth-btn')
  if (!btn) {
    btn = document.createElement('button')
    btn.id = 'anilist-auth-btn'
    // Insert before the last item (or just append)
    fabItems.insertBefore(btn, fabItems.firstChild)
  }

  if (anilistState.token && anilistState.user) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
    btn.setAttribute('aria-label', `Logout from AniList: ${anilistState.user.name}`)
    btn.onclick = logoutAnilist
  } else {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    btn.setAttribute('aria-label', 'Login with AniList to track progress')
    btn.onclick = loginAnilist
  }
}

// 4. GraphQL API Wrapper
async function anilistRequest(query, variables = {}) {
  if (!anilistState.token) return null

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anilistState.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables })
  }

  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, options)
    const json = await response.json()
    return json.data
  } catch (err) {
    console.error('AniList API Error:', err)
    return null
  }
}

async function fetchAnilistUser() {
  const query = `
    query {
      Viewer {
        id
        name
      }
    }
  `
  const data = await anilistRequest(query)
  if (data && data.Viewer) {
    anilistState.user = data.Viewer
  } else {
    // Token might be invalid or expired
    logoutAnilist()
  }
}

// 5. Search Anime by Title
async function searchAnilistAnime(title) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
          english
        }
        mediaListEntry {
          id
          progress
          status
        }
      }
    }
  `
  const data = await anilistRequest(query, { search: title })
  return data ? data.Media : null
}

// 6. Update Watch Progress
async function updateAnilistProgress(mediaId, episodeNumber) {
  if (!anilistState.token || !mediaId) return null

  // First fetch current progress to only update if new episode > current progress
  const query = `
    mutation ($mediaId: Int, $progress: Int) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
        id
        progress
      }
    }
  `
  const data = await anilistRequest(query, { mediaId, progress: episodeNumber })
  return data ? data.SaveMediaListEntry : null
}

// 7. Background Auto-Sync
async function syncLocalToAnilist() {
  const stored = localStorage.getItem('ani-web-history')
  if (!stored || !anilistState.token) return
  
  let history
  try {
    history = JSON.parse(stored)
  } catch(e) { return }

  const toSync = []
  for (const [id, data] of Object.entries(history)) {
    if (!data.title || !data.eps || data.eps.length === 0) continue
    
    const highestEp = Math.max(...data.eps)
    if (data.anilist_synced_ep === highestEp) continue

    toSync.push({ id, title: data.title, highestEp, data })
  }

  if (toSync.length === 0) return

  for (const item of toSync) {
    try {
      const media = await searchAnilistAnime(item.title)
      if (media) {
        const mediaId = media.id
        const currentProgress = media.mediaListEntry ? media.mediaListEntry.progress : 0
        if (item.highestEp > currentProgress) {
          await updateAnilistProgress(mediaId, item.highestEp)
        }
        
        // Mark as synced locally
        if (window.state && window.state.history && window.state.history[item.id]) {
          window.state.history[item.id].anilist_synced_ep = item.highestEp
          localStorage.setItem('ani-web-history', JSON.stringify(window.state.history))
        } else {
          // Read fresh from localstorage to avoid overwriting user progress made during sync
          const freshStored = localStorage.getItem('ani-web-history')
          if (freshStored) {
            const freshHistory = JSON.parse(freshStored)
            if (freshHistory[item.id]) {
              freshHistory[item.id].anilist_synced_ep = item.highestEp
              localStorage.setItem('ani-web-history', JSON.stringify(freshHistory))
            }
          }
        }
      }
    } catch (e) {
      console.warn('AniList sync failed for', item.title, e)
    }
    // Throttle: 1.5 seconds between API calls to stay within 90/min limit
    await new Promise(r => setTimeout(r, 1500))
  }
}

window.anilistState = anilistState
window.initAnilist = initAnilist
window.searchAnilistAnime = searchAnilistAnime
window.updateAnilistProgress = updateAnilistProgress
