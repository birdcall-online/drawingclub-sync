import fs from "node:fs/promises";
import "dotenv/config";

const getMembers = async (url) => {
  const csv = await fetch(url).then((r) => r.text());
  const lines = csv.trim().split("\n");
  lines.shift(); // 표 맨 위 discord_user_id,arena_slug 제거

  const members = new Map();

  for (const line of lines) {
    const [discordUserId, arenaSlug] = line.split(",");
    const id = discordUserId?.trim();
    const slug = arenaSlug?.trim();

    if (
      id &&
      slug &&
      slug.includes("birdcall-drawing-club/birdcalldrawingclub-")
    ) {
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

const createBlock = async ({ url, id, token }) => {
  const body = {
    value: url,
    channels: [{ id: id }],
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

const getMessages = async (id, token) => {
  const url = new URL(
    `https://discord.com/api/v10/channels/${id}/messages`,
  );

  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Discord API Error: ${response.status}`);
  }

  const messages = await response.json();

  const map = new Map();

  for (const message of messages) {
    const id = message.author.id;
    const timestamp = message.timestamp;

    const images = (message.attachments ?? [])
    .filter((file) => file.content_type?.startsWith("image/"))
    .map((file) => ({
      url: file.url,
      time: timestamp,
    }));

    if (!images.length) continue;

    if (map.has(id)) {
      map.get(id).images.push(...images);
    } else {
      map.set(id, {
        id,
        images,
      });
    }
  }

  const result = [...map.values()];

  return result
}

const channels = await getChannels(process.env.ARENA_GROUP, process.env.ARENA_TOKEN);
const members = await getMembers(process.env.CSV_URL)
const messages = await getMessages(process.env.DISCORD_CHANNEL_ID, process.env.DISCORD_TOKEN);

console.log(channels);
console.log(members);
console.log(messages);



