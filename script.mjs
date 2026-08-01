import fs from "node:fs/promises";
import "dotenv/config";

const url = new URL(
  `https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
);

url.searchParams.set("limit", "100");

const getMembers = async () => {
  const csv = await fetch(process.env.CSV_URL).then((r) => r.text());
  const lines = csv.trim().split("\n");
  lines.shift(); // 표 맨 위 discord_user_id,arena_slug 제거

  const members = new Map();

  for (const line of lines) {
    const [discordUserId, arenaSlug] = line.split(",");
    const id = discordUserId.trim();
    const slug = arenaSlug.trim();

    if(discordUserId !== ""){
      members.set(id, slug);
    }
  }

  return members;
};

const getChannels = async (group, token) => {
  const res = await fetch(
    `https://api.are.na/v3/groups/${group}/contents`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  const channels = new Map();

  for (const block of data.data) {
    if (block.type !== "Channel") continue;

    channels.set(block.slug, block.id);
  }

  return channels;
};

const createBlock = async ({ imageUrl, channelId, token }) => {
  const body = {
    value: imageUrl,
    channels: [{ id: channelId }],
  };

  const res = await fetch("https://api.are.na/v3/blocks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

const channels = await getChannels(process.env.ARENA_GROUP, process.env.ARENA_TOKEN);
const members = await getMembers();

console.log(channels);
console.log(members);


