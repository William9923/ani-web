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
    btn.textContent = 'A✓'
    btn.setAttribute('aria-label', `Logout from AniList: ${anilistState.user.name}`)
    btn.onclick = logoutAnilist
  } else {
    btn.textContent = 'A'
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

window.anilistState = anilistState
window.initAnilist = initAnilist
window.searchAnilistAnime = searchAnilistAnime
window.updateAnilistProgress = updateAnilistProgress
