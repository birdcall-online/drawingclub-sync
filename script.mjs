import fs from "node:fs/promises";
import "dotenv/config";

const snowflakeToKST = (snowflake) => {
  const DISCORD_EPOCH = 1420070400000n;

  const timestamp = (BigInt(snowflake) >> 22n) + DISCORD_EPOCH;

  return new Date(Number(timestamp)).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
};

const loadState = async () => {
  try {
    return JSON.parse(await fs.readFile("./state.json", "utf8"));
  } catch {
    return {
      messageId: null,
      imageIndex: null,
      userId: null,
      channelSlug: null,
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
    const res = await fetch(
      `https://api.are.na/v3/groups/${group}/contents?type=Channel&per=${per}&page=${page}&sort=created_at_asc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
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

  return new Map(
    [...channels.entries()].sort(([slugA], [slugB]) =>
      slugA.localeCompare(slugB),
    ),
  );
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
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

const getMessages = async (id, token, state) => {
  const result = new Map();

  const fetchMessages = async (params) => {
    const url = new URL(`https://discord.com/api/v10/channels/${id}/messages`);

    url.searchParams.set("limit", "100");

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Discord API Error: ${response.status} ${await response.text()}`,
      );
    }

    return response.json();
  };

  if (state.messageId) {
    const aroundMessages = await fetchMessages({
      around: state.messageId,
    });

    const stateMessage = aroundMessages.find(
      (message) => message.id === state.messageId,
    );

    if (!stateMessage) {
      throw new Error(`State message not found in Discord: ${state.messageId}`);
    }

    for (const message of aroundMessages) {
      const images = (message.attachments ?? [])
        .filter((file) => file.content_type?.startsWith("image/"))
        .map((file) => ({
          url: file.url,
        }));

      if (images.length) {
        result.set(message.id, {
          messageId: message.id,
          userId: message.author.id,
          timestamp: snowflakeToKST(message.id),
          images,
        });
      }
    }
  }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let cursor = state.messageId;
  let pageNumber = 1;

  while (true) {
    const page = await fetchMessages({
      after: cursor,
    });

    let pageImageCount = 0;

    if (page.length === 0) {
      break;
    }

    // Discord는 최신 → 과거 순서로 주므로
    // 과거 → 최신 순서로 뒤집는다.
    page.reverse();

    for (const message of page) {
      const images = (message.attachments ?? [])
        .filter((file) => file.content_type?.startsWith("image/"))
        .map((file) => ({
          url: file.url,
        }));

      pageImageCount += images.length;

      if (images.length) {
        result.set(message.id, {
          messageId: message.id,
          userId: message.author.id,
          time: snowflakeToKST(message.id),
          images,
        });
      }
    }

    console.log(`\n===== PAGE (${pageNumber}) =====`);
    console.log(`after  : ${cursor} | ${snowflakeToKST(cursor)}`);
    console.log(`count  : ${page.length}`);
    console.log(`images : ${pageImageCount}`);
    console.log(`first  : ${page[0].id} | ${snowflakeToKST(page[0].id)}`);
    console.log(
      `last   : ${page[page.length - 1].id} | ${snowflakeToKST(
        page[page.length - 1].id,
      )}`,
    );

    if (page.length < 100) {
      console.log(`\n===== TOTAL PAGE (${pageNumber}) =====`);
      break;
    }

    cursor = page[page.length - 1].id;

    console.log(`\nnext cursor: ${cursor} | ${snowflakeToKST(cursor)}`);

    pageNumber++;

    await sleep(1000);
  }

  return [...result.values()].sort((a, b) => {
    const aa = BigInt(a.messageId);
    const bb = BigInt(b.messageId);

    if (aa < bb) return -1;
    if (aa > bb) return 1;

    return 0;
  });
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
  process.env.ARENA_TOKEN,
);

const members = await getMembers(process.env.CSV_URL);

const messages = await getMessages(
  process.env.DISCORD_CHANNEL_ID,
  process.env.DISCORD_TOKEN,
  state,
);

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
    console.error(`❌ Member not found: ${message.userId}`);

    continue;
  }

  const channelSlug = arenaSlug.split("/")[1];

  const channelId = findChannelId(channels, channelSlug);

  if (!channelId) {
    missingChannels.push({
      userId: message.userId,
      messageId: message.messageId,
      channelSlug,
    });

    continue;
  }

  for (const [imageIndex, image] of message.images.entries()) {
    const messageId = BigInt(message.messageId);
    const stateMessageId = state.messageId ? BigInt(state.messageId) : null;

    if (stateMessageId !== null && messageId < stateMessageId) {
      continue;
    }

    if (
      stateMessageId !== null &&
      messageId === stateMessageId &&
      imageIndex <= state.imageIndex
    ) {
      continue;
    }

    tasks.push({
      userId: message.userId,
      messageId: message.messageId,
      imageIndex,
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

console.log(`\nAll ${messages.length} messages matched`);
console.log(`${tasks.length} image(s)`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DELAY = 600;

let lastSuccessfulTask = null;

if (tasks.length > 0) {
  const first = tasks[0];
  const last = tasks[tasks.length - 1];

  console.log(`
===== TASK RANGE =====
FIRST:
${first.messageId} #${first.imageIndex + 1}
${snowflakeToKST(first.messageId)}
${first.imageUrl}
${first.channelSlug}

LAST:
${last.messageId} #${last.imageIndex + 1}
${snowflakeToKST(last.messageId)}
${last.imageUrl}
${last.channelSlug}`);
}

for (const [index, task] of tasks.entries()) {
  try {
    await createBlock({
      url: task.imageUrl,
      id: task.channelId,
      token: process.env.ARENA_TOKEN,
    });

    console.log(
      `✅ [${index + 1}/${tasks.length}] ${task.channelSlug} image #${task.imageIndex + 1} ${snowflakeToKST(task.messageId)}`,
    );

    lastSuccessfulTask = task;
  } catch (err) {
    console.error(
      `❌ [${index + 1}/${tasks.length}] ${task.channelSlug} image #${task.imageIndex + 1} ${snowflakeToKST(task.messageId)}`,
    );

    console.error(err);

    if (lastSuccessfulTask) {
      await saveState({
        time: snowflakeToKST(lastSuccessfulTask.messageId),
        messageId: lastSuccessfulTask.messageId,
        imageIndex: lastSuccessfulTask.imageIndex,
        userId: lastSuccessfulTask.userId,
        channelSlug: lastSuccessfulTask.channelSlug,
        url: lastSuccessfulTask.imageUrl,
      });

      console.log(
        `💾 State saved: ${lastSuccessfulTask.messageId} / image #${lastSuccessfulTask.imageIndex + 1} ${snowflakeToKST(lastSuccessfulTask.messageId)}`,
      );
    } else {
      console.log(`💾 No successful uploads. State was not changed.`);
    }

    console.error("\n❌ Upload failed. Stopping.");
    process.exit(1);
  }

  await sleep(DELAY);
}

if (lastSuccessfulTask) {
  await saveState({
    time: snowflakeToKST(lastSuccessfulTask.messageId),
    messageId: lastSuccessfulTask.messageId,
    imageIndex: lastSuccessfulTask.imageIndex,
    userId: lastSuccessfulTask.userId,
    channelSlug: lastSuccessfulTask.channelSlug,
    url: lastSuccessfulTask.imageUrl,
  });

  console.log(
    `💾 State saved: ${lastSuccessfulTask.messageId} / image #${lastSuccessfulTask.imageIndex + 1}`,
  );
}

console.log(`\n🎉 Done! ${tasks.length} image(s) uploaded.`);
