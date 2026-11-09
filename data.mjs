import { writeFile } from "node:fs/promises";
import "dotenv/config";

const CHANNEL_SLUG = process.env.ARENA_CHANNEL;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const api = async (path, params = {}) => {
  const url = `https://api.are.na/v3${path}?${new URLSearchParams(params)}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${process.env.ARENA_TOKEN}`,
            },
    });

    if (res.status === 429) {
      const reset = Number(res.headers.get("X-RateLimit-Reset")) * 1000;
      const wait = Math.max(reset - Date.now(), 2000) + 500;

      console.warn(`429 → ${Math.round(wait / 1000)}초 대기`);

      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      throw new Error(`${res.status} ${url}`);
    }

    const json = await res.json();

    await sleep(600);

    return json;
  }

  throw new Error(`재시도 초과: ${url}`);
};

const getAll = async (path, extra = {}) => {
  const results = [];
  let page = 1;

  while (true) {
    const json = await api(path, {
      per: 100,
      page,
      ...extra,
    });

    results.push(...json.data);

    if (!json.meta?.has_more_pages) {
      break;
    }

    page = json.meta.next_page || page + 1;
  }

  return results;
};


const pickImageUrl = (img) => {
  if (!img) return "";

  return (
    img.display?.url ||
    img.large?.url ||
    img.src ||
    img.original?.url ||
    img.url ||
    ""
  );
};

const normalise = (s) =>
  (s || "").toLowerCase().replaceAll(" ", "").replaceAll("-", "").replaceAll("_", "");

const isClub = (ch) =>
  normalise(ch.title + ch.slug).includes("birdcalldrawingclub");

const personName = (title = "", slug = "") => {
  const src = title || slug;

  const name = src.includes("{")
    ? src.split("{")[1].split("}")[0]
    : src.split("birdcall-drawing-club-")[1] || src;

  return name
    .split(/[ _-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getChannelInfo = async () => {
    const res = await fetch(`https://api.are.na/v3/channels/${CHANNEL_SLUG}`, {
            headers: {
              Authorization: `Bearer ${process.env.ARENA_TOKEN}`,
            },
    });
    
    const { id, title, slug, created_at, description } = await res.json();
    const lines = description.plain.split('\n').filter(Boolean);

    const [artist, date, thumbnailUrl] = lines;
        console.log(artist);
        console.log(date);
    return { id, title, slug, created_at, artist, date, thumbnailUrl }
}

const main = async () => {
  const info = await getChannelInfo();
  const channels = await getAll(`/channels/${CHANNEL_SLUG}/contents`);
  
  const people = [];

  for (const ch of channels) {
    if (ch.type !== "Channel" || !isClub(ch)) {
      continue;
    }

    const blocks = await getAll(
      `/channels/${ch.slug}/contents`,
      { sort: "created_at_asc" }
    );

    const images = [];

    for (const b of blocks) {
      if (b.type !== "Image") continue;

      const src = pickImageUrl(b.image);

      if (src) {
        images.push({
          src,
          alt: b.title || "",
        });
      }
    }

    people.push({
      slug: ch.slug,
      name: personName(ch.title, ch.slug),
      images,
    });

    console.log(`${ch.slug}: ${images.length}장`);
  }
  
  const result = {
    info,
    people,
  };

  await writeFile(
    `./data/${CHANNEL_SLUG}.json`,
    JSON.stringify(result, null, 2)
  );

  console.log(`완료: ${people.length}명`);
};

const getFileList = async () => {
  const url =
    "https://api.github.com/repos/birdcall-online/drawingclub-sync/contents/data?ref=main";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  const data = await response.json();

  const files = await Promise.all(
    data
      .filter((item) => item.type === "file" && item.name.endsWith(".json"))
      .map(async (item) => {
        const res = await fetch(item.download_url);

        if (!res.ok) {
          throw new Error(`File Error: ${item.name}`);
        }

        const json = await res.json();

        return {
          slug: json.info?.slug || null,
          title: json.info?.title || null,
          date: json.info?.date || null,
          thumbnailUrl: json.info?.thumbnailUrl || null,
          name: json.info?.title.replace(/^.*\bwith\s+/i, "") || null,
          file: item.name,
          url: item.download_url,
          created_at: json.info?.created_at || null,
        };
      })
  );

  await writeFile(
    "./list.json",
    JSON.stringify({ files }, null, 2),
    "utf-8"
  );

  console.log(`Saved ${files.length} files`);
};

const execute = async () => {
  await main();
  await getFileList();    
};

execute().catch(console.error);
