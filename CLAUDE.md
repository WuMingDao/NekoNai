# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **NEVER read or access the `.env` file** - it contains sensitive credentials

## Project Overview

NekoNai is a Hono-based HTTP API server that wraps NovelAI's image generation service using the `nekoai-js` library.

## Commands

```bash
pnpm dev      # Start dev server with hot reload (port 3000)
pnpm build    # TypeScript compile to dist/
pnpm start    # Run compiled dist/index.js
```

## Environment Variables

- `NAI_TOKEN` - NovelAI API token (required)
- `HTTP_PROXY` / `HTTPS_PROXY` - Proxy for NovelAI API requests (auto-configured via undici)

## Architecture

Single-file server (`src/index.ts`):
- Hono framework with `@hono/node-server`
- Proxy support via `undici.setGlobalDispatcher()` for Node.js native fetch
- Generated images saved to `images/` directory

## API Endpoints

- `GET /` - Health check
- `POST /generate` - Generate image
  - Body: `{ prompt?: string, seed?: number }`
  - Returns: `{ success, seed, prompt, image (base64), savedPath }`

## Known Issues

- `nekoai-js` `Image.save()` has ESM compatibility issues with dynamic require. Use `fs.writeFile(path, image.data)` instead.
