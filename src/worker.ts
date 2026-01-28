import { Hono } from "hono";
import { Buffer } from "node:buffer";
import { verifyDiscordRequest } from "./discord/verify.js";
import { handleDiscordInteraction } from "./discord/handler.js";
import { generateImage } from "./generate.js";

type Bindings = {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APP_ID: string;
  NAI_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Some dependencies assume Node's global Buffer exists.
if (!(globalThis as unknown as { Buffer?: unknown }).Buffer) {
  (globalThis as unknown as { Buffer: unknown }).Buffer = Buffer;
}

app.get("/", (c) => c.text("NekoNai OK"));

function runInBackground(c: unknown, p: Promise<unknown>) {
  const ctx = (c as { executionCtx?: { waitUntil(p: Promise<unknown>): void } })
    .executionCtx;
  if (ctx?.waitUntil) ctx.waitUntil(p);
  else p.catch((err) => console.error(err));
}

// Discord Interactions endpoint (HTTP Interactions)
app.post("/interactions", async (c) => {
  const publicKey = c.env.DISCORD_PUBLIC_KEY;
  const appId = c.env.DISCORD_APP_ID;
  const naiToken = c.env.NAI_TOKEN;

  if (!publicKey) return c.text("DISCORD_PUBLIC_KEY not set", 500);
  if (!appId) return c.text("DISCORD_APP_ID not set", 500);
  if (!naiToken) return c.text("NAI_TOKEN not set", 500);

  const { isValid, body } = await verifyDiscordRequest(c.req.raw, publicKey);
  if (!isValid) return c.text("Invalid request signature", 401);

  const interaction = JSON.parse(body) as unknown;
  const type = (interaction as { type?: unknown }).type;

  // PING -> PONG (Discord endpoint verification)
  if (type === 1) return c.json({ type: 1 });

  // APPLICATION_COMMAND
  if (type === 2) {
    runInBackground(c, handleDiscordInteraction(interaction, { appId, naiToken }));
    return c.json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  }

  return c.json({
    type: 4,
    data: { content: `Unsupported interaction type: ${String(type)}` },
  });
});

// Debug endpoint (no filesystem on Workers)
app.post("/generate", async (c) => {
  const naiToken = c.env.NAI_TOKEN;
  if (!naiToken) return c.json({ error: "NAI_TOKEN not set" }, 500);

  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: unknown;
    seed?: unknown;
  };

  const prompt =
    typeof body.prompt === "string"
      ? body.prompt
      : "1girl, cute, anime style, detailed";
  const seed =
    typeof body.seed === "number"
      ? body.seed
      : Math.floor(Math.random() * 4294967295);

  try {
    const result = await generateImage({
      token: naiToken,
      prompt,
      seed,
    });

    return c.json({
      success: true,
      seed: result.seed,
      prompt,
      image: result.base64,
      filename: result.filename,
    });
  } catch (err) {
    console.error("Generate error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause ? String(err.cause) : undefined;
    return c.json({ error: message, cause }, 500);
  }
});

export default app;
