import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import path from "path";
import fs from "fs/promises";
import { verifyDiscordRequest } from "./discord/verify.js";
import { handleDiscordInteraction } from "./discord/handler.js";
import { generateImage } from "./generate.js";

// 图片保存目录（仅本地调试用）
const IMAGES_DIR = path.join(import.meta.dirname, "../images");

// 配置代理（读取环境变量）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log(`Using proxy: ${proxyUrl}`);
}

const app = new Hono();

app.get("/", (c) => c.text("NekoNai OK"));

function runInBackground(c: unknown, p: Promise<unknown>) {
  const ctx = (c as { executionCtx?: { waitUntil(p: Promise<unknown>): void } })
    .executionCtx;
  if (ctx?.waitUntil) ctx.waitUntil(p);
  else p.catch((err) => console.error(err));
}

// Discord Interactions 端点（HTTP Interactions）
app.post("/interactions", async (c) => {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const appId = process.env.DISCORD_APP_ID;
  const naiToken = process.env.NAI_TOKEN;

  if (!publicKey) return c.text("DISCORD_PUBLIC_KEY not set", 500);
  if (!appId) return c.text("DISCORD_APP_ID not set", 500);
  if (!naiToken) return c.text("NAI_TOKEN not set", 500);

  const { isValid, body } = await verifyDiscordRequest(c.req.raw, publicKey);
  if (!isValid) return c.text("Invalid request signature", 401);

  const interaction = JSON.parse(body) as unknown;
  const type = (interaction as { type?: unknown }).type;

  // PING -> PONG（Discord 用来验证端点可用性）
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

// 本地调试用生图 POST 端点（非 Discord 流程）
app.post("/generate", async (c) => {
  const naiToken = process.env.NAI_TOKEN;
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

    // 保存图片到本地（仅用于你本机调试）
    const savedPath = path.join(IMAGES_DIR, result.filename);
    await fs.writeFile(savedPath, result.data);
    console.log(`Image saved to: ${savedPath}`);

    return c.json({
      success: true,
      seed: result.seed,
      prompt,
      image: result.base64,
      savedPath,
    });
  } catch (err) {
    console.error("Generate error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause ? String(err.cause) : undefined;
    return c.json({ error: message, cause }, 500);
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
