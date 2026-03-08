# AGENTS.md

This file provides guidance for agentic coding agents operating in this repository.

## Project Overview

**ani-web** is a browser-based anime streaming frontend for AllAnime. It consists of:
- A Node.js server (`server.js`) for local development
- Vercel serverless functions (`api/*.js`) for production deployment
- Static HTML pages (`index.html`, `anime.html`)

## Build & Development Commands

### Installation
```bash
npm install
```

### Running Locally
```bash
npm start
```
Starts the server at http://localhost:9001

### Deployment to Vercel
```bash
npm i -g vercel
vercel
```

### Testing API Endpoints
```bash
# Test search
curl "http://localhost:9001/api/search?q=naruto&mode=sub"

# Test episodes
curl "http://localhost:9001/api/episodes?id=<anime-id>&mode=sub"

# Test resolve
curl "http://localhost:9001/api/resolve?id=<anime-id>&ep=1&mode=sub"
```

## Code Style Guidelines

### General Principles
- Keep dependencies minimal — zero-production-dependencies for the server
- Prefer native Node.js APIs over external libraries
- Use async/await over callback patterns
- Target Node.js 18+

### Formatting
- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use semicolons consistently
- Use single quotes for strings

### Naming Conventions
- **Files**: kebab-case (e.g., `search.js`, `_lib.js`)
- **Functions**: camelCase, verb-first (e.g., `handleSearch`, `decodeUrl`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ALLANIME_BASE`)
- **Variables**: camelCase, descriptive (e.g., `redirectCount`)

### Import Organization
```javascript
// Node.js built-ins first
const http = require('node:http')
const https = require('node:https')
const { URL } = require('node:url')
const fs = require('node:fs')
const path = require('node:path')

// External modules (if any)
// Local modules last
const { search } = require('./_lib')
```

### Error Handling
- Always wrap async operations in try/catch
- Return meaningful error messages in JSON responses
- Use appropriate HTTP status codes (200, 400, 500)
- Never expose internal error details to clients

Example:
```javascript
async function handleSearch(res, query, mode) {
  try {
    // ... operation
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: error.message }))
  }
}
```

### Types
- Plain JavaScript (no TypeScript)
- Validate query parameters explicitly (avoid implicit type coercion)

### API Response Format
```javascript
// Success
res.writeHead(200, { 'Content-Type': 'application/json' })
  .end(JSON.stringify({ data: ... }))

// Error
res.writeHead(500, { 'Content-Type': 'application/json' })
  .end(JSON.stringify({ error: 'message' }))

// Empty results
res.writeHead(200, { 'Content-Type': 'application/json' })
  .end(JSON.stringify([]))
```

### Security Considerations
- Validate all URL parameters before use
- Only allow HTTP/HTTPS protocols in proxy endpoints
- Don't log sensitive information

### Performance Tips
- Use `Promise.any` for racing multiple sources
- Limit concurrent requests with timeouts
- Buffer binary content appropriately

## Project Structure

```
ani-web/
├── server.js          # Main Node.js server
├── index.html         # Homepage (search)
├── anime.html         # Anime detail page
├── api/               # Vercel serverless functions
│   ├── _lib.js        # Shared logic
│   ├── search.js      # Search endpoint
│   ├── episodes.js    # Episodes endpoint
│   └── resolve.js     # Stream resolve endpoint
├── package.json       # Project config
└── README.md         # Project docs
```

## Key Files Reference

### server.js
Contains the complete server implementation including:
- XOR decoder for AllAnime URLs (`decodeUrl`)
- HTTP/HTTPS helpers (`httpsGet`)
- API handlers (`handleSearch`, `handleEpisodes`, `handleResolve`)
- M3U8 proxy (`handleProxy`, `rewriteM3u8`)
- Static file serving

### api/_lib.js
Shared logic used by Vercel serverless functions. Some code is duplicated in `server.js` for zero-dependency local development.

## Adding Dependencies

Before adding any npm dependency:
1. Verify it's truly necessary (prefer native APIs)
2. Check Node.js 18+ can handle the use case natively
3. Consider Vercel serverless function size limits

## JavaScript Standards
- Use ES modules syntax in API files (Vercel serverless)
- Use CommonJS (`require`) in `server.js` for Node.js compatibility
- Keep frontend code vanilla JavaScript (no frameworks)
- Use semantic HTML
- Ensure CORS headers are set on server for API calls
