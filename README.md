[![Platform](https://img.shields.io/badge/platform-web%2Fbrowser-brightgreen)](https://github.com/William9923/ani-web)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://ani-web-viewer.vercel.app/)

# ani-web

> **[🌐 Live Demo → ani-web-viewer.vercel.app](https://ani-web-viewer.vercel.app/)**

<img width="1133" height="940" alt="image" src="https://github.com/user-attachments/assets/12717e54-9d5a-47ac-b9bd-505fc8da7a05" />

<img width="1173" height="880" alt="image" src="https://github.com/user-attachments/assets/369cfc2a-3484-46b5-8585-93c7cb0ea754" />

A browser-based anime streaming frontend for [AllAnime](https://allmanga.to/).

> This project explores building a web-based anime streaming interface as a learning exercise.

## ⚠️ Disclaimer

This is an **exploratory/learning project** for educational purposes only.

- Not intended for production use
- Content is provided by the AllAnime API
- Use at your own risk
- Not affiliated with or endorsed by AllAnime

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Player Controls](#-player-controls)
- [Tech Stack](#-tech-stack)
- [How Streaming Works](#-how-streaming-works-hls)
- [FAQ](#-faq)
- [Similar Projects](#-similar-projects)

## ✨ Features

- Search anime by title
- Toggle Sub/Dub mode
- Episode browser with watch history
- Video streaming with quality selection (HLS)
- Watch history saved locally (localStorage)
- Import / export watch history as JSON
- AniList integration — sync watch progress automatically
- Races multiple stream sources in parallel for best availability

## 🚀 Quick Start

### Step 1: Clone and Install

```bash
git clone https://github.com/William9923/ani-web.git
cd ani-web
npm install
```

### Step 2: Run Locally

```bash
npm start
```

### Step 3: Open Browser

Navigate to [http://localhost:9001](http://localhost:9001)

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start local dev server at http://localhost:9001 |

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## 🔧 API Reference / Serverless function

| Endpoint | Description |
|----------|-------------|
| `/api/search?q=<query>&mode=<sub/dub>` | Search anime by title |
| `/api/episodes?id=<anime-id>&mode=<sub/dub>` | Get episode list |
| `/api/resolve?id=<anime-id>&ep=<episode>&mode=<sub/dub>` | Get stream sources |

## 🎮 Player Controls

### Keyboard (desktop)

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek −5s / +5s |
| `↑` / `↓` | Volume +10% / −10% |
| `M` | Mute |
| `F` | Fullscreen |
| `C` | Toggle captions |
| `L` | Toggle loop |
| `0`–`9` | Seek to 0%–90% |
| `?` | Show controls help |

### Mouse (desktop)

| Action | Result |
|--------|--------|
| Hover → center button | Play / Pause |
| Double-click left half | Seek −10s |
| Double-click right half | Seek +10s |
| Long press | 2× speed (hold) |

### Touch (mobile)

| Gesture | Action |
|---------|--------|
| Double-tap left half | Seek −10s |
| Double-tap right half | Seek +10s |
| Long press | 2× speed (hold) |
| Drag progress bar | Scrub to position |


## 📚 Tech Stack

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://www.javascript.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Pico CSS](https://img.shields.io/badge/Pico%20CSS-2.0.11-blue)](https://picocss.com/)
[![Hls.js](https://img.shields.io/badge/Hls.js-1.6.15-red)](https://hls-js.com/)
[![Plyr](https://img.shields.io/badge/Plyr-3.8.4-orange)](https://plyr.io/)

- **JavaScript** - Vanilla JS (no frameworks)
- **Node.js** - Local development server
- **Pico CSS** - Minimal CSS framework
- **Hls.js** - HLS video streaming
- **Plyr** - Accessible video player

## 📡 How Streaming Works (HLS)

### What is HLS?

**HTTP Live Streaming (HLS)** is a protocol developed by Apple for delivering video over the web. Instead of serving one giant video file, HLS:

1. Splits the video into small segments (typically 2–10 seconds each, in `.ts` format)
2. Generates a **manifest file** (`.m3u8`) that lists all the segments in order
3. The player fetches the manifest, then downloads segments one by one as playback progresses

This makes adaptive bitrate streaming possible — the player can switch to a lower or higher quality segment stream on the fly depending on network conditions.

```
.m3u8 manifest
  ├── 360p playlist  →  seg001.ts, seg002.ts, ...
  ├── 720p playlist  →  seg001.ts, seg002.ts, ...
  └── 1080p playlist →  seg001.ts, seg002.ts, ...
```

### How ani-web uses HLS

```
AllAnime API
    │
    │  returns stream source URLs (encoded)
    ▼
/api/resolve  (server-side)
    │  decodes XOR-obfuscated URLs, races all sources with Promise.any
    │  returns { url, resolution, hls: true/false }
    ▼
anime.html  (browser)
    │
    ├─ hls: true  →  hls.js fetches the .m3u8 manifest
    │                 segments fetched via /api/proxy (bypasses CDN CORS)
    │                 quality levels parsed from manifest → rendered as buttons
    │
    └─ hls: false →  direct MP4/WebM src on <video> element
    │
    ▼
Plyr  (player UI layer on top of the <video> element)
```

**Why the proxy?** CDN servers that host `.ts` segments typically block direct browser requests (CORS policy). The `/api/proxy` endpoint forwards those requests server-side, stripping the restriction. It also rewrites all URLs inside `.m3u8` manifests so every subsequent segment request also goes through the proxy.

## ❓ FAQ

**Is this legal?**

This is an exploratory project. Content is sourced from AllAnime. Please use responsibly and respect their terms of service.

**Do I need an account?**

No account is needed to watch anime. Optionally, you can connect your [AniList](https://anilist.co) account to automatically sync your watch progress — episodes you watch will be tracked on your AniList profile, and your existing AniList progress will be imported back into ani-web.

**Where is my watch history stored?**

Watch history is saved in your browser's localStorage. You can also export it as a JSON file and import it on another device using the ↓ / ↑ buttons in the history panel.

**Can I download episodes?**

Yes. Use the download button built into the video player (the ⋮ menu or right-click the video). This triggers a standard browser download of the current stream.

**Does it work on mobile?**

Yes, the interface is responsive and works on mobile browsers.

## 🤝 Similar Projects

- [ani-cli](https://github.com/pystardust/ani-cli) - CLI tool to browse and play anime. Heavily inspired this project.
- [animdl](https://github.com/justfoolingaround/animdl) - Ridiculously efficient anime streaming

## ❤️ Support

If this project helped you learn something, that's enough! Want to contribute more? Please ⭐ this repo so others can find it too!
