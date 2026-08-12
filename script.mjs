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
  const csv = await fetch(url).then((response) => response.text());
  const lines = csv.trim().split("\n");
  lines.shift();

  const members = new Map();

  for (const line of lines) {
    const [discordUserId, arenaSlug] = line.split(",");
    const id = discordUserId?.trim();
    const slug = arenaSlug?.trim();

    if (
      id &&
      slug &&
      slug.startsWith("birdcall-drawing-club/birdcalldrawingclub-")
    ) {
      members.set(id, slug);
    }
  }

  return members;
};

const getChannels = async (group, token) => {
  const channels = new Map();
  const per = 100;
  let page = 1;

  while (true) {
    const res = await fetch(`https://api.are.na/v3/groups/${group}/contents?type=Channel&per=${per}&page=${page}&sort=created_at_asc`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const { data } = await res.json();

    if (data.length === 0) {
      break;
    }

    for (const channel of data) {
      if (channel.slug.startsWith("birdcalldrawingclub-")) {
        channels.set(channel.slug, channel.id);
      }
    }

    page++;
  }

  return channels;
};

const createBlock = async ({ url, id, token }) => {
  const body = {
    value: url,
    channels: [{ id }],
  };

  const res = await fetch("https://api.are.na/v3/blocks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

const getMessages = async (id, token, after) => {
  const url = new URL(`https://discord.com/api/v10/channels/${id}/messages`);
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
      .filter((file) =>
        file.content_type?.startsWith("image/")
      )
      .map((file) => ({
        url: file.url,
      }));

    if (!images.length) {
      continue;
    }

    result.push({
      messageId: message.id,
      userId: message.author.id,
      timestamp: message.timestamp,
      images,
    });
  }

  return result;
};

const findChannelId = (channels, channelSlug) => {
  if (channels.has(channelSlug)) {
    return channels.get(channelSlug);
  }

  for (const [arenaSlug, channelId] of channels) {
    if (arenaSlug.startsWith(`${channelSlug}-`)) {
      return channelId;
    }
  }

  return null;
};

const state = await loadState();

const channels = await getChannels(
  process.env.ARENA_GROUP,
  process.env.ARENA_TOKEN
);

const members = await getMembers(
  process.env.CSV_URL
);

const messages = await getMessages(
  process.env.DISCORD_CHANNEL_ID,
  process.env.DISCORD_TOKEN,
  state.lastMessageId
);

console.log("are.na channels:", channels.size);
console.log("google sheet members:", members.size);
console.log("discord messages:", messages.length);

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
  console.error("\n❌ Unknown Discord users found:\n");

  for (const user of unknownUsers) {
    console.error(`- Discord user: ${user.userId}`);
    console.error(`  Message: ${user.messageId}`);
  }

  process.exit(1);
}

const tasks = [];
const missingChannels = [];

for (const message of messages) {
  const arenaSlug = members.get(message.userId);

  if (!arenaSlug) {
    console.error(
      `❌ Member not found: ${message.userId}`
    );

    continue;
  }

  const channelSlug = arenaSlug.split("/")[1];

  const channelId = findChannelId(
    channels,
    channelSlug
  );

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
      userId: message.userId,
      messageId: message.messageId,
      imageUrl: image.url,
      channelSlug,
      channelId,
    });
  }
}

if (missingChannels.length > 0) {
  console.error("\n❌ Arena channels not found:\n");

  for (const channel of missingChannels) {
    console.error(`- ${channel.channelSlug}`);
    console.error(`  Discord user: ${channel.userId}`);
    console.error(`  Message: ${channel.messageId}`);
  }

  process.exit(1);
}

console.log(`\n✅ All ${messages.length} messages matched successfully.`);
console.log(`📦 ${tasks.length} image(s) ready to upload.`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DELAY = 500;

let hasFailure = false;

for (const task of tasks) {
  try {
    await createBlock({
      url: task.imageUrl,
      id: task.channelId,
      token: process.env.ARENA_TOKEN,
    });

    console.log(`✅ ${task.userId} ${task.imageUrl} -> ${task.channelSlug}`);

  } catch (err) {
    hasFailure = true;

    console.error(`❌ ${task.userId} ${task.imageUrl} -> ${task.channelSlug}`);
    console.error(err);
  }

  await sleep(DELAY);
}

if (!hasFailure && messages.length > 0) {
  await saveState({
    lastMessageId: messages[0].messageId,
  });

  console.log(`\nState updated: ${messages[0].messageId}`);
}

if (hasFailure) {
  console.error("\n❌ Some blocks failed. State was NOT updated.");
  process.exit(1);
}

console.log(`\n🎉 Done! ${tasks.length} image(s) uploaded.`);
