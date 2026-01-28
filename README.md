# NekoNai

Discord slash command (`/nai`) that generates images via NovelAI.

## Local Development

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Cloudflare Deployment (Workers) - Environment Variables

This project is designed to run as a Discord "HTTP Interactions" endpoint. When deploying to Cloudflare Workers, you will need the following environment variables (stored as Workers secrets/vars).

Worker entry/config:
- `wrangler.jsonc` uses `main: "src/worker.ts"` and does NOT use `assets`.
- (Compat) `wrangler.toml` is also provided in case your deploy environment doesn't pick up `wrangler.jsonc`.
- Deploy with: `npx wrangler deploy` (do not pass `--assets`).

### Required (runtime)

- `DISCORD_PUBLIC_KEY`
  - Used to verify Discord request signatures.
  - Get it from: Discord Developer Portal -> Your Application -> General Information -> "Public Key".
- `DISCORD_APP_ID`
  - Discord Application ID (used to edit the original interaction response via webhook URL).
  - Get it from: Discord Developer Portal -> Your Application -> General Information -> "APPLICATION ID".
- `NAI_TOKEN`
  - NovelAI access token.
  - Get it from NovelAI (your account/session token; keep it secret).

### Optional (command registration / development tooling)

- `DISCORD_BOT_TOKEN`
  - Only needed to run the command registration script locally.
  - Get it from: Discord Developer Portal -> Your Application -> Bot -> "Reset Token" / "Token".
- `DISCORD_GUILD_ID`
  - If set, registers commands to a single guild (faster to update).
  - Get it by enabling Developer Mode in Discord, then right-click your server -> "Copy Server ID".

### Setting secrets on Cloudflare

Typical Wrangler commands (examples):

```bash
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APP_ID
wrangler secret put NAI_TOKEN
```

### Registering the `/nai` command

Run locally (needs `DISCORD_APP_ID` + `DISCORD_BOT_TOKEN`, optional `DISCORD_GUILD_ID`):

```bash
npm run register
```
