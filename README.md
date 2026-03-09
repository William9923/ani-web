[![Platform](https://img.shields.io/badge/platform-web%2Fbrowser-brightgreen)](https://github.com/William9923/ani-web)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

# ani-web

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
- [Future Features](#-future-features)
- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [FAQ](#-faq)
- [Similar Projects](#-similar-projects)

## ✨ Features

- Search anime by title
- Toggle Sub/Dub mode
- Episode browser with watch history
- Video streaming with quality selection (HLS)
- Watch history saved locally (localStorage)

## 🔮 Future Features

- Improve mobile responsiveness and video player UX
- Load/export watch history
- Integrate watch history with AniList
- Support multiple sources beyond AllAnime API

## 🚀 Quick Start

### Step 1: Clone and Install

```bash
git clone https://github.com/William9923/ani-web.git
cd ani-web
```

### Step 2: Run Locally

```bash
node server.js
```

### Step 3: Open Browser

Navigate to [http://localhost:9001](http://localhost:9001)

## 🔧 API Reference / Serverless function

| Endpoint | Description |
|----------|-------------|
| `/api/search?q=<query>&mode=<sub/dub>` | Search anime by title |
| `/api/episodes?id=<anime-id>&mode=<sub/dub>` | Get episode list |
| `/api/resolve?id=<anime-id>&ep=<episode>&mode=<sub/dub>` | Get stream sources |


## 📚 Tech Stack

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://www.javascript.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Pico CSS](https://img.shields.io/badge/Pico%20CSS-2.0.11-blue)](https://picocss.com/)
[![Hls.js](https://img.shields.io/badge/Hls.js-1.5.7-red)](https://hls-js.com/)
[![Plyr](https://img.shields.io/badge/Plyr-3.8.4-orange)](https://plyr.io/)

- **JavaScript** - Vanilla JS (no frameworks)
- **Node.js** - Local development server
- **Pico CSS** - Minimal CSS framework
- **Hls.js** - HLS video streaming
- **Plyr** - Accessible video player

## ❓ FAQ

**Is this legal?**

This is an exploratory project. Content is sourced from AllAnime. Please use responsibly and respect their terms of service.

**Do I need an account?**

No. ani-web works without any authentication.

**Where is my watch history stored?**

Watch history is saved in your browser's localStorage.

**Can I download episodes?**

No. ani-web is a streaming-only interface.

**Does it work on mobile?**

Yes, the interface is responsive and works on mobile browsers.

## 🤝 Similar Projects

- [ani-cli](https://github.com/pystardust/ani-cli) - CLI tool to browse and play anime. Heavily inspired this project.
- [animdl](https://github.com/justfoolingaround/animdl) - Ridiculously efficient anime streaming

## ❤️ Support

If this project helped you learn something, that's enough! Want to contribute more? Please ⭐ this repo so others can find it too!
