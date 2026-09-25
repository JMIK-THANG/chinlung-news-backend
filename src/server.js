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

const publicSiteUrl = (process.env.PUBLIC_SITE_URL || "https://chinlungtoday.com").replace(/\/$/, "");

const sectionConfig = {
  news: { contentType: "news", excludedCategories: ["Sports", "Business", "Editorial"] },
  sports: { contentType: "news", category: "Sports" },
  business: { contentType: "news", category: "Business" },
  editorial: { contentType: "news", category: "Editorial" },
  articles: { contentType: "article", excludedCategories: ["Cahram"] },
  cahram: { contentType: "article", category: "Cahram" },
};

const getPublishedStory = async (identifier, contentType, { category, excludedCategories = [] } = {}) => {
  const values = [String(identifier), contentType];
  let categoryClause = "";
  if (category) {
    values.push(category);
    categoryClause = ` AND category = $${values.length}`;
  } else if (excludedCategories.length) {
    values.push(excludedCategories);
    categoryClause = ` AND NOT (category = ANY($${values.length}))`;
  }
  const result = await pool.query(
    `SELECT id, slug, title, summary, image_url, content_type, category
     FROM news_articles
     WHERE (slug = $1 OR id::text = $1) AND content_type = $2${categoryClause} AND status = 'published'
     LIMIT 1`,
    values,
  );
  return result.rows[0];
};

const storySection = (story) => {
  if (story.content_type === "article") return story.category === "Cahram" ? "cahram" : "articles";
  if (["Sports", "Business", "Editorial"].includes(story.category)) return story.category.toLowerCase();
  return "news";
};

const publicStoryUrl = (story) => `${publicSiteUrl}/${storySection(story)}/${story.slug || story.id}`;

const isManagedCloudinaryImage = (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    return url.protocol === "https:"
      && url.hostname === "res.cloudinary.com"
      && url.pathname.startsWith("/id4hu8yk/image/upload/");
  } catch {
    return false;
  }
};

const transformedImageUrl = (imageUrl) => {
  if (!imageUrl?.startsWith("http")) return `${publicSiteUrl}/chinlung-today-logo.png`;
  if (!isManagedCloudinaryImage(imageUrl)) return imageUrl;
  return imageUrl.replace(
    "/image/upload/",
    "/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/",
  );
};

const socialImageUrl = (story) => isManagedCloudinaryImage(story.image_url)
  ? `${publicSiteUrl}/social-image/${storySection(story)}/${story.slug || story.id}.jpg`
  : transformedImageUrl(story.image_url);

const storyMetadata = (story) => {
  const canonicalUrl = publicStoryUrl(story);
  const title = escapeHtml(story.title);
  const description = escapeHtml(story.summary || story.title);
  const image = socialImageUrl(story);
  const imageMetadata = isManagedCloudinaryImage(story.image_url)
    ? `<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`
    : "";

  return `<title>${title} | Chinlung Today</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Chinlung Today">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
${imageMetadata}
<meta property="og:image:alt" content="${title}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${escapeHtml(image)}">`;
};

const removeDefaultMetadata = (html) => html
  .replace(/<title>[\s\S]*?<\/title>/gi, "")
  .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
  .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
  .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
  .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

app.get("/social-image/:section/:identifier", async (req, res, next) => {
  try {
    const config = sectionConfig[req.params.section];
    const identifier = String(req.params.identifier || "").replace(/\.jpg$/i, "").trim();
    if (!config || !identifier) return res.status(404).send("Story image not found.");

    const story = await getPublishedStory(identifier, config.contentType, config);
    if (!story) return res.status(404).send("Story image not found.");
    if (!isManagedCloudinaryImage(story.image_url)) return res.status(404).send("Story image is not managed by Chinlung Today.");

    const imageResponse = await fetch(transformedImageUrl(story.image_url));
    if (!imageResponse.ok) throw new Error(`Could not load social image (${imageResponse.status}).`);

    const image = Buffer.from(await imageResponse.arrayBuffer());
    res.set({
      "Cache-Control": "public, max-age=2592000, immutable",
      "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
      "Content-Length": String(image.length),
    });
    return res.send(image);
  } catch (error) {
    return next(error);
  }
});

app.get("/public/:section/:identifier", async (req, res, next) => {
  try {
    const config = sectionConfig[req.params.section];
    const identifier = String(req.params.identifier || "").trim();
    if (!config || !identifier) return res.status(404).send("Story not found.");

    const story = await getPublishedStory(identifier, config.contentType, config);
    if (!story) return res.status(404).send("Story not found.");

    const shellUrl = `${(process.env.FRONTEND_SHELL_URL || publicSiteUrl).replace(/\/$/, "")}/index.html`;
    const shellResponse = await fetch(shellUrl);
    if (!shellResponse.ok) throw new Error(`Could not load frontend shell (${shellResponse.status}).`);

    const shell = removeDefaultMetadata(await shellResponse.text());
    const html = shell.replace("</head>", `${storyMetadata(story)}\n</head>`);
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.type("html").send(html);
  } catch (error) {
    return next(error);
  }
});

app.get("/share/:kind/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const contentType = req.params.kind === "a" ? "article" : "news";
    if (!Number.isInteger(id) || id < 1) return res.status(404).send("Story not found.");

    const story = await getPublishedStory(id, contentType);
    if (!story) return res.status(404).send("Story not found.");

    const destination = publicStoryUrl(story);
    const title = escapeHtml(story.title);

    res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${storyMetadata(story)}
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
