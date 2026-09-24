import "dotenv/config";
import cors from "cors";
import express from "express";
import pool from "./db.js";
import newsRoutes from "./routes/newsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import explainerRoutes from "./routes/explainerRoutes.js";

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 5000;
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5177",
  "https://chinlungtoday.com",
  "https://www.chinlungtoday.com",
  "https://news-app-t5rb.onrender.com",
].filter(Boolean).map((origin) => origin.trim().replace(/\/$/, "")));

app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/$/, "");
    if (!origin || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
}));
// A modestly larger limit allows the prototype admin to submit a compressed
// image selected from the computer as a data URL.
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "API and database are working." });
  } catch (error) {
    next(error);
  }
});

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

app.get("/share/:kind/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const contentType = req.params.kind === "a" ? "article" : "news";
    if (!Number.isInteger(id) || id < 1) return res.status(404).send("Story not found.");

    const result = await pool.query(
      `SELECT id, slug, title, summary, image_url, content_type
       FROM news_articles
       WHERE id = $1 AND content_type = $2 AND status = 'published'
       LIMIT 1`,
      [id, contentType],
    );
    const story = result.rows[0];
    if (!story) return res.status(404).send("Story not found.");

    const frontendUrl = (process.env.FRONTEND_URL || "https://chinlungtoday.com").replace(/\/$/, "");
    const readablePart = String(story.slug || story.title || "story")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .split("-")
      .filter(Boolean)
      .slice(0, 4)
      .join("-") || "story";
    const storyPath = story.content_type === "article" ? "a" : "n";
    const destination = `${frontendUrl}/#/${storyPath}/${readablePart}-p${story.id}`;
    const shareUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const image = story.image_url?.startsWith("http")
      ? story.image_url
      : `${frontendUrl}/chinlung-today-logo.png`;
    const title = escapeHtml(story.title);
    const description = escapeHtml(story.summary);

    res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Chinlung Today</title>
<meta name="description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Chinlung Today">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head><body><p>Opening <a href="${escapeHtml(destination)}">${title}</a>…</p>
<script>window.location.replace(${JSON.stringify(destination)});</script>
<noscript><p><a href="${escapeHtml(destination)}">Read this story on Chinlung Today</a></p></noscript></body></html>`);
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/explainers", explainerRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(port, () => {
  console.log(`Chinlung Today API running at http://localhost:${port}`);
});
