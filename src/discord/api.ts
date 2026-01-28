type DiscordMessagePayload = {
  content?: string;
  embeds?: unknown[];
  allowed_mentions?: unknown;
};

type DiscordFile = {
  data: Uint8Array;
  filename: string;
  contentType?: string;
};

async function expectOk(res: Response, action: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(`${action} failed: ${res.status} ${res.statusText} ${text}`);
}

export async function editOriginalInteractionResponse(
  appId: string,
  token: string,
  payload: DiscordMessagePayload,
  file?: DiscordFile,
): Promise<void> {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;

  if (!file) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await expectOk(res, "editOriginalInteractionResponse");
    return;
  }

  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  // Node's lib.dom types are picky about ArrayBuffer vs SharedArrayBuffer.
  // Make a copy to ensure the underlying buffer is a plain ArrayBuffer.
  const bytes = new Uint8Array(file.data.byteLength);
  bytes.set(file.data);
  form.append(
    "files[0]",
    new Blob([bytes], { type: file.contentType ?? "image/png" }),
    file.filename,
  );

  const res = await fetch(url, { method: "PATCH", body: form });
  await expectOk(res, "editOriginalInteractionResponse");
}
