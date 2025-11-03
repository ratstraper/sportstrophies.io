// routes/subscribe.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("node:fs/promises");
const path = require("node:path");
// const pg = require("pg");


// === утилиты ===
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizeEmail = (s) => String(s || "").trim().toLowerCase();
const isBot = (req) => typeof req.body.website === "string" && req.body.website.trim() !== "";

async function ensureCsv(csvPath) {
  try { await fs.access(csvPath); }
  catch { await fs.writeFile(csvPath, "email,ts\n"); }
}

// Если pool не передан, но есть PG_URL — создаём сами
// async function ensurePool(pgUrl, pool) {
//   if (pool) return pool;
//   if (!pgUrl) return null;
//   const p = new pg.Pool({ connectionString: pgUrl });
//   await p.query(`
//     CREATE TABLE IF NOT EXISTS newsletter_subscribers (
//       id SERIAL PRIMARY KEY,
//       email TEXT NOT NULL UNIQUE,
//       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//     );
//   `);
//   return p;
// }

/**
 * Создаёт роутер подписки.
 * @param {{ csvPath?: string, pool?: import("pg").Pool, pgUrl?: string }} opts
 */
function createSubscribeRouter(opts = {}) {
// export function createSubscribeRouter(opts = {}) {
  const router = express.Router();

  const limiter = rateLimit({ windowMs: 60_000, max: 10 });
  router.use(express.urlencoded({ extended: false }));
  router.use(limiter);

  const csvPath = opts.csvPath || path.join(process.cwd(), "subscribers.csv");
//   let poolPromise = ensurePool(opts.pgUrl || process.env.PG_URL, opts.pool);

  // GET /subscribe  → форма
  router.get("/", (req, res) => {
    res.render("subscribe", { error: null, ok: false, email: "" });
  });

  // POST /subscribe  → обработка формы
  router.post("/", async (req, res) => {
    try {
      if (isBot(req)) return res.status(200).render("subscribe_ok");

      const email = normalizeEmail(req.body.email);
      if (!EMAIL_RX.test(email)) {
        return res.status(400).render("subscribe", {
          error: "Введите корректный email.",
          ok: false,
          email
        });
      }

      await ensureCsv(csvPath);
      await fs.appendFile(csvPath, `${email},${new Date().toISOString()}\n`);

    //   const pool = await poolPromise;
    //   if (pool) {
    //     try {
    //       await pool.query(
    //         `INSERT INTO newsletter_subscribers (email)
    //          VALUES ($1) ON CONFLICT (email) DO NOTHING`,
    //         [email]
    //       );
    //     } catch (e) {
    //       console.warn("PG insert warning:", e.message);
    //     }
    //   }

      return res.status(200).render("subscribe_ok");
    } catch (err) {
      console.error("Subscribe error:", err);
      return res.status(500).render("subscribe", {
        error: "Что-то пошло не так. Попробуйте позже.",
        ok: false,
        email: normalizeEmail(req.body.email || "")
      });
    }
  });

  return router;
}

module.exports = createSubscribeRouter;

