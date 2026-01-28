import { Action, Model, NovelAI, Resolution, type Image } from "nekoai-js";

export type GenerateImageParams = {
  token: string;
  prompt: string;
  seed?: number;
  model?: Model;
  resolution?: Resolution;
};

export type GenerateImageResult = {
  seed: number;
  filename: string;
  data: Uint8Array;
  base64: string;
};

export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const seed =
    typeof params.seed === "number"
      ? params.seed
      : Math.floor(Math.random() * 4294967295);

  const model = params.model ?? Model.V4_5_CUR;
  const resolution = params.resolution ?? Resolution.NORMAL_PORTRAIT;

  const client = new NovelAI({ token: params.token });
  const images = (await client.generateImage({
    prompt: params.prompt,
    model,
    action: Action.GENERATE,
    resPreset: resolution,
    n_samples: 1,
    seed,
  })) as Image[];

  if (images.length === 0) throw new Error("No image generated");

  const image = images[0];
  return {
    seed,
    filename: image.filename,
    data: image.data,
    base64: image.toBase64(),
  };
}

