import fs from "fs";
import path from "path";
import { glob } from "glob";
import dotenv from "dotenv";
import crypto from "crypto";
import { OpenAI } from "openai";
import { autoTranslatedLanguages, defaultLanguage } from "./config-app.js";

dotenv.config();

const LOCALES_PATH = path.resolve("content");
const CACHE_PATH = path.resolve("config/translation-cache.json");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------------------------------------------
    HELPERS : HASH, FILE OPS
--------------------------------------------------- */

function hashString(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("hex");
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/* ---------------------------------------------------
    FLATTEN / UNFLATTEN JSON
--------------------------------------------------- */

function flattenJSON(obj, prefix = "", result = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      flattenJSON(v, full, result);
    } else {
      result[full] = v;
    }
  }
  return result;
}

function unflattenJSON(flatObj) {
  const root = {};
  for (const key in flatObj) {
    const segs = key.split(".");
    let cur = root;
    for (let i = 0; i < segs.length - 1; i++) {
      if (!cur[segs[i]]) cur[segs[i]] = {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = flatObj[key];
  }
  return root;
}

/* ---------------------------------------------------
    TEXT CONVERSION (KEY= / VAL=)
--------------------------------------------------- */

function buildTranslationBatch(flatMap, cache, lang, fileTag) {
  const lines = [];

  for (const key in flatMap) {
    const original = String(flatMap[key] ?? "");
    const trimmed = original.trim();

    // Skip URLs, images, placeholders
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (/^\[ROOT\]/.test(trimmed)) continue;
    if (/\{\{.*?\}\}/.test(trimmed)) continue;
    if (trimmed === "") continue;

    // Create cache bucket if needed
    if (!cache[trimmed]) {
      cache[trimmed] = {};
    }

    // If translation exists → skip
    if (cache[trimmed][lang]) continue;

    // Mark value hash (for modified value detection)
    const hashVal = hashString(trimmed);
    if (cache[trimmed].__sourceHash === hashVal && cache[trimmed][lang]) {
      continue;
    }

    cache[trimmed].__sourceHash = hashVal;

    lines.push(`FILE=${fileTag}\nKEY=${key}\nVAL=${trimmed}\n---`);
  }

  return lines.join("\n");
}

function parseTranslationResponse(text) {
  const blocks = text
    .split("---")
    .map((b) => b.trim())
    .filter(Boolean);
  const results = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    let file = null;
    let key = null;
    let val = null;

    for (const line of lines) {
      if (line.startsWith("FILE=")) file = line.slice(5).trim();
      else if (line.startsWith("KEY=")) key = line.slice(4).trim();
      else if (line.startsWith("VAL=")) val = line.slice(4).trim();
    }
    if (file && key && val !== null) {
      results.push({ file, key, val });
    }
  }

  return results;
}

/* ---------------------------------------------------
    MAIN TRANSLATION REQUEST (ONE REQUEST PER LANG)
--------------------------------------------------- */

async function translateAllValues(batchText, lang) {
  if (batchText.trim() === "") {
    console.log(`✔ Nothing to translate for '${lang}'`);
    return "";
  }

  console.log(`⏳ Sending one batch request for '${lang}'...`);

  const prompt = `
You will receive blocks of:

FILE=<filename>
KEY=<json.key.path>
VAL=<English text>

Translate ONLY the VAL content to ${lang}.
Do NOT modify FILE or KEY.
Do NOT translate:
- URLs
- image paths
- placeholders like {{this}}
- HTML tags (<br>, <span>, etc)
- identifiers or slugs

Return strictly in the same format:

FILE=...
KEY=...
VAL=...
---
FILE=...
KEY=...
VAL=...
---

No commentary, no markdown, no extra text.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: batchText },
    ],
  });

  return response.choices[0].message.content.trim();
}

/* ---------------------------------------------------
    RECONSTRUCT TRANSLATED JSON FILES
--------------------------------------------------- */

function applyTranslations(flatMap, lang, cache) {
  const out = {};

  for (const key in flatMap) {
    const original = String(flatMap[key] ?? "");
    const trimmed = original.trim();

    let translated = original;
    if (cache[trimmed] && cache[trimmed][lang]) {
      translated = cache[trimmed][lang];
    }

    out[key] = translated;
  }

  return unflattenJSON(out);
}

/* ---------------------------------------------------
    MAIN
--------------------------------------------------- */

async function run() {
  console.log("🚀 Starting ultra-fast translation engine");

  // Load global cache
  const cache = loadCache();

  // Get all EN files
  const enFiles = glob.sync(`**/${defaultLanguage}.json`, {
    cwd: LOCALES_PATH,
  });

  // Flatten all files & build per-file lookup
  const fileMaps = {};
  enFiles.forEach((f) => {
    const abs = path.join(LOCALES_PATH, f);
    const json = JSON.parse(fs.readFileSync(abs, "utf8"));
    fileMaps[f] = flattenJSON(json);
  });

  // For each language → one batch
  for (const lang of autoTranslatedLanguages) {
    console.log(`\n🌍 Language: ${lang}`);

    // Build a single compact batch
    let batch = "";
    for (const fileName in fileMaps) {
      const textBlock = buildTranslationBatch(
        fileMaps[fileName],
        cache,
        lang,
        fileName
      );
      if (textBlock.trim() !== "") batch += textBlock + "\n";
    }

    if (batch.trim() === "") {
      console.log(`✔ No new values to translate for '${lang}'`);
      continue;
    }

    // One request to OpenAI
    const translatedText = await translateAllValues(batch, lang);
    const parsed = parseTranslationResponse(translatedText);

    // Insert into cache
    for (const { file, key, val } of parsed) {
      // Retrieve original value
      const originalValue = fileMaps[file][key];
      const trimmed = String(originalValue ?? "").trim();
      if (!cache[trimmed]) cache[trimmed] = {};
      cache[trimmed][lang] = val;
    }

    saveCache(cache);

    // Rebuild JSON files for this language
    for (const fileName in fileMaps) {
      const flat = fileMaps[fileName];
      const finalObj = applyTranslations(flat, lang, cache);

      const outPath = path.join(
        LOCALES_PATH,
        fileName.replace(`${defaultLanguage}.json`, `${lang}.json`)
      );

      fs.writeFileSync(outPath, JSON.stringify(finalObj, null, 2));
      console.log(`✔ Written: ${outPath}`);
    }
  }

  console.log("\n✨ All translations done.");
}

run().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
