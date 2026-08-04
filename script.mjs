import fs from "node:fs/promises";
import "dotenv/config";

const loadState = async () => {
  try {
    return JSON.parse(await fs.readFile("./state.json", "utf8"));
  } catch {
    return {
      lastMessageId: null,
    };
  }
};

const saveState = async (state) => {
  await fs.writeFile("./state.json", JSON.stringify(state, null, 2));
};

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

const getMessages = async (id, token, after) => {
  const url = new URL(
    `https://discord.com/api/v10/channels/${id}/messages`,
  );

  url.searchParams.set("limit", "100");

  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Discord API Error: ${response.status}`);
  }

  const messages = await response.json();
  const result = [];

  for (const message of messages) {
    const images = (message.attachments ?? [])
    .filter((file) => file.content_type?.startsWith("image/"))
    .map((file) => ({
      url: file.url,
    }));

    if (!images.length) continue;

    result.push({
      messageId: message.id,
      userId: message.author.id,
      timestamp: message.timestamp,
      images,
    });
  }

  return result;
}

const findChannelId = (channels, channelSlug) => {
  for (const [arenaSlug, id] of channels) {
    if (
      arenaSlug === channelSlug ||
      arenaSlug.startsWith(`${channelSlug}-`)
    ) {
      return id;
    }
  }

  return null;
}

const state = await loadState();
const channels = await getChannels(process.env.ARENA_GROUP, process.env.ARENA_TOKEN);
const members = await getMembers(process.env.CSV_URL);
const messages = await getMessages(
  process.env.DISCORD_CHANNEL_ID,
  process.env.DISCORD_TOKEN,
  state.lastMessageId,
);

console.log(channels);
console.log(members);
console.log(messages);

// 디스코드 이미지의 유저가 CSV에 있는지 체크 없으면 작업 전체 취소
const unknownUsers = [];

for (const message of messages) {
  if (!members.has(message.userId)) {
    unknownUsers.push({
      userId: message.userId,
      messageId: message.messageId,
    });
  }
}

if (unknownUsers.length > 0) {
  console.error("Unknown Discord users found:");

  for (const user of unknownUsers) {
    console.error(
      `- ${user.userId} (message: ${user.messageId})`
    );
  }

  process.exit(1);
}

const tasks = [];
const missingChannels = [];

for (const message of messages) {
  const slug = members.get(message.userId);

  // birdcall-drawing-club/birdcalldrawingclub-kristen
  const channelSlug = slug.split("/")[1]; // birdcalldrawingclub-kristen

  // 정확히 일치하거나 뒤에 suffix가 있는 채널 찾기
  const channelId = findChannelId(channels, channelSlug);

  if (!channelId) {
    missingChannels.push({
      userId: message.userId,
      messageId: message.messageId,
      channelSlug,
    });

    continue;
  }

  for (const image of message.images) {
    tasks.push({
      run: () =>
      createBlock({
        url: image.url,
        id: channelId,
        token: process.env.ARENA_TOKEN,
      }),
      userId: message.userId,
      messageId: message.messageId,
      imageUrl: image.url,
      channelSlug,
    });
  }
}

// CSV에 작성한 채널 이름이 are.na에 없을 경우
if (missingChannels.length > 0) {
  console.error("Arena channels not found:");

  for (const channel of missingChannels) {
    console.error(
      `- ${channel.channelSlug} (Discord user: ${channel.userId}, message: ${channel.messageId})`,
    );
  }

  process.exit(1);
}

const sleep = (ms) =>
new Promise((resolve) => setTimeout(resolve, ms));
const DELAY = 500;

let hasFailure = false;

for (const task of tasks) {
  try {
    await task.run();
    console.log("✅", task.userId, task.imageUrl, `-> ${task.channelSlug}`);
  } catch (err) {
    hasFailure = true;
    console.error("❌", task.userId, task.imageUrl, err);
  }

  await sleep(DELAY);
}

if (!hasFailure && messages.length > 0) {
  await saveState({
    lastMessageId: messages[0].messageId,
  });

  console.log(`State updated: ${messages[0].messageId}`);
}
