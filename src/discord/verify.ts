import { createPublicKey, verify } from "node:crypto";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function makeEd25519PublicKey(publicKeyHex: string) {
  const publicKeyBytes = Buffer.from(publicKeyHex, "hex");
  const der = Buffer.concat([ED25519_SPKI_PREFIX, publicKeyBytes]);
  return createPublicKey({ key: der, format: "der", type: "spki" });
}

export async function verifyDiscordRequest(req: Request, publicKeyHex: string) {
  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  const body = await req.text();

  if (!signature || !timestamp) return { isValid: false, body };

  const message = Buffer.from(timestamp + body, "utf8");
  const sig = Buffer.from(signature, "hex");

  let isValid = false;
  try {
    const key = makeEd25519PublicKey(publicKeyHex);
    isValid = verify(null, message, key, sig);
  } catch {
    isValid = false;
  }

  return { isValid, body };
}

