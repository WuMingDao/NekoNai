import { ALL_COMMANDS } from "../src/discord/commands.js";

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID) throw new Error("DISCORD_APP_ID not set");
if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN not set");

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

for (const cmd of ALL_COMMANDS) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Register command failed: ${res.status} ${text}`);
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  console.log(`Registered /${cmd.name}${data?.id ? ` (id: ${data.id})` : ""}`);
}

