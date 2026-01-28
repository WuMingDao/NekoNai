import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { NovelAI, Model, Resolution, Action } from "nekoai-js";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import path from "path";
import fs from "fs/promises";

// 图片保存目录
const IMAGES_DIR = path.join(import.meta.dirname, "../images");

// 配置代理（读取环境变量）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log(`Using proxy: ${proxyUrl}`);
}

const app = new Hono();

// 从环境变量获取 NovelAI token
const NAI_TOKEN = process.env.NAI_TOKEN;

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// 生图 POST 端点
app.post("/generate", async (c) => {
  if (!NAI_TOKEN) {
    return c.json({ error: "NAI_TOKEN environment variable not set" }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const prompt = body.prompt || "1girl, cute, anime style, detailed";
  const seed = body.seed || Math.floor(Math.random() * 4294967295);

  const client = new NovelAI({ token: NAI_TOKEN });

  try {
    const images = (await client.generateImage({
      prompt,
      model: Model.V4_5,
      action: Action.GENERATE,
      resPreset: Resolution.NORMAL_PORTRAIT,
      n_samples: 1,
      seed,
    })) as import("nekoai-js").Image[];

    if (images.length === 0) {
      return c.json({ error: "No image generated" }, 500);
    }

    // 返回 base64 图片数据
    const image = images[0];
    const base64 = image.toBase64();

    // 保存图片到本地（手动实现，绕过 nekoai-js 的 ESM 兼容问题）
    const savedPath = path.join(IMAGES_DIR, image.filename);
    await fs.writeFile(savedPath, image.data);
    console.log(`Image saved to: ${savedPath}`);

    return c.json({
      success: true,
      seed,
      prompt,
      image: base64,
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
