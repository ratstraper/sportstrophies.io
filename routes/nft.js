// routes/nft.js
const path = require("node:path");
const fs = require("node:fs/promises");

// --- tiny in-memory LRU with TTL (fast & dependency-free) ---
const MAX_ITEMS = 500;        // tune for your memory budget
const TTL_MS    = 5 * 60e3;   // 5 minutes

const cache = new Map(); // key -> { value, expires, touch() via re-set ordering }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) { cache.delete(key); return null; }
  // refresh LRU order
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}
function cacheSet(key, value) {
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  if (cache.size > MAX_ITEMS) {
    // delete oldest (first inserted)
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// --- helpers ---
const NFT_DIR = path.join(process.cwd(), "nfts");

// strict id to prevent path traversal, weird chars, gigantic names
const ID_RX = /^[A-Za-z0-9_-]{1,64}$/;

function decodeMaybeBase64Json(bufOrString) {
  const s = Buffer.isBuffer(bufOrString) ? bufOrString.toString("utf8") : String(bufOrString);

  // Strip common data URI prefixes if present
  const base64Body = s.replace(/^data:(?:application|text)\/json;base64,/, "");

  // If the string still looks like JSON, parse directly
  const trimmed = base64Body.trim();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (looksJson) return JSON.parse(trimmed);

  // Otherwise try base64 → utf8 → JSON
  const utf8 = Buffer.from(base64Body, "base64").toString("utf8");
  return JSON.parse(utf8);
}

// --- the optimized route ---
module.exports = function (app) {
// export default function registerNftRoute(app) {
  app.get("/nft", (req, res) => {
    return res.render("no_nft_identifier", { reason: "bad_id" });
  });
  app.get("/nft/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // 1) validate id early
      if (!ID_RX.test(id)) {
        return res.status(400).render("no_nft_identifier", { reason: "bad_id", token: id });
      }

      // 2) cache hot metadata (avoids disk on repeat)
      const cacheKey = `nft:${id}`;
      const cached = cacheGet(cacheKey);
      if (cached) {
        res.set("Cache-Control", "public, max-age=60"); // let client keep for 60s
        return res.render("nft", { json: cached });
      }

      // 3) compute safe absolute path
      const fileName = `${id}.meta`;
      const filePath = path.join(NFT_DIR, fileName);

      // 4) check file and read asynchronously
      let data;
      try {
        data = await fs.readFile(filePath);
      } catch (e) {
        if (e.code === "ENOENT") {
          return res.status(404).render("no_nft_identifier", { reason: "not_found", token: id });
        }
        throw e;
      }

      // 5) parse (supports raw JSON or base64-wrapped json)
      let jsonData;
      try {
        jsonData = decodeMaybeBase64Json(data);
      } catch (e) {
        // malformed payload
        return res.status(422).render("no_nft_identifier", { reason: "bad_payload" });
      }

      // 6) cache & render
      cacheSet(cacheKey, jsonData);
      res.set("Cache-Control", "public, max-age=60");
      return res.render("nft", { json: jsonData });

    } catch (err) {
      // 7) fail safe, no internals leaked
      console.error("NFT route error:", err);
      return res.status(500).render("no_nft_identifier", { reason: "server_error" });
    }
  });
}
