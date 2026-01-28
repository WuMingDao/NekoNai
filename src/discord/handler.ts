import { Model, Resolution } from "nekoai-js";
import { generateImage } from "../generate.js";
import { defaultLockStore, type LockStore } from "../utils/concurrency.js";
import { editOriginalInteractionResponse } from "./api.js";

type InteractionOption = { name: string; value: unknown };

type Interaction = {
  type: number;
  token: string;
  channel_id?: string;
  data?: {
    name?: string;
    options?: InteractionOption[];
  };
};

type Env = {
  appId: string;
  naiToken: string;
};

function getOptionString(options: InteractionOption[], name: string) {
  const opt = options.find((o) => o.name === name);
  return typeof opt?.value === "string" ? opt.value : undefined;
}

function mapModel(model: string | undefined): Model {
  switch (model) {
    case "v4_5":
      return Model.V4_5;
    case "v4_5_cur":
      return Model.V4_5_CUR;
    case "v3":
      return Model.V3;
    case "furry":
      return Model.FURRY;
    default:
      return Model.V4_5_CUR;
  }
}

function mapResolution(size: string | undefined): Resolution {
  switch (size) {
    case "landscape":
      return Resolution.NORMAL_LANDSCAPE;
    case "square":
      return Resolution.NORMAL_SQUARE;
    case "portrait":
    default:
      return Resolution.NORMAL_PORTRAIT;
  }
}

export async function handleDiscordInteraction(
  interactionRaw: unknown,
  env: Env,
  deps?: { locks?: LockStore },
): Promise<void> {
  const interaction = interactionRaw as Interaction;
  if (interaction.type !== 2) return;

  const cmdName = interaction.data?.name;
  if (cmdName !== "nai") {
    await editOriginalInteractionResponse(env.appId, interaction.token, {
      content: `Unsupported command: ${String(cmdName)}`,
    });
    return;
  }

  const options = interaction.data?.options ?? [];
  const prompt = getOptionString(options, "prompt") ?? "";
  const model = mapModel(getOptionString(options, "model"));
  const resolution = mapResolution(getOptionString(options, "size"));

  const locks = deps?.locks ?? defaultLockStore;
  const lockKey = `channel:${interaction.channel_id ?? "unknown"}`;

  const acquired = await locks.tryAcquire(lockKey, 2 * 60 * 1000);
  if (!acquired) {
    await editOriginalInteractionResponse(env.appId, interaction.token, {
      content: "⏳ 正在生成中，请稍后再试",
    });
    return;
  }

  try {
    const result = await generateImage({
      token: env.naiToken,
      prompt,
      model,
      resolution,
    });

    await editOriginalInteractionResponse(
      env.appId,
      interaction.token,
      { content: `生成完成 (seed: ${result.seed})` },
      { data: result.data, filename: result.filename },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await editOriginalInteractionResponse(env.appId, interaction.token, {
      content: `生成失败: ${message}`,
    });
  } finally {
    await locks.release(lockKey);
  }
}

