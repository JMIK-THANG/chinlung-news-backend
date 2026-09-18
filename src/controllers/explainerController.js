import pool from "../db.js";

function makeSlug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const selectExplainer = `SELECT e.*, n.slug AS source_article_slug, n.title AS source_article_title
  FROM explainers e LEFT JOIN news_articles n ON n.id = e.source_article_id`;

export async function getFeaturedExplainer(_req, res, next) {
  try {
    const result = await pool.query(`${selectExplainer} WHERE e.is_featured = TRUE ORDER BY e.updated_at DESC LIMIT 1`);
    if (!result.rows[0]) return res.status(404).json({ message: "No featured explainer has been published." });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
}

export async function getExplainerBySlug(req, res, next) {
  try {
    const result = await pool.query(`${selectExplainer} WHERE e.slug = $1 LIMIT 1`, [req.params.slug]);
    if (!result.rows[0]) return res.status(404).json({ message: "Explainer not found." });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
}

export async function getAdminExplainers(_req, res, next) {
  try {
    const result = await pool.query(`${selectExplainer} ORDER BY e.updated_at DESC`);
    res.json(result.rows);
  } catch (error) { next(error); }
}

function validate(body) {
  const required = ["question", "category", "introduction", "takeaway", "whatHappened", "whyItMatters", "whatToWatch"];
  return required.every((field) => String(body[field] || "").trim());
}

export async function saveExplainer(req, res, next) {
  try {
    if (!validate(req.body)) return res.status(400).json({ message: "Please complete every required explainer field." });
    const {
      id, question, category, introduction, takeaway,
      whatHappened, whyItMatters, whatToWatch, sections = [], sources = [],
      sourceArticleId = null, isFeatured = true,
    } = req.body;
    const readingText = [introduction, takeaway, whatHappened, whyItMatters, whatToWatch, ...sections.flatMap((section) => section.paragraphs || [])].join(" ");
    const wordCount = readingText.trim().split(/\s+/).filter(Boolean).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 220))} min read`;
    const slug = `${makeSlug(question)}-${id || Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (isFeatured) await client.query("UPDATE explainers SET is_featured = FALSE WHERE is_featured = TRUE AND id <> $1", [id || 0]);
      const values = [slug, sourceArticleId || null, question, category, readTime, introduction, takeaway, whatHappened, whyItMatters, whatToWatch, JSON.stringify(sections), JSON.stringify(sources), Boolean(isFeatured)];
      const result = id
        ? await client.query(`UPDATE explainers SET slug=$1, source_article_id=$2, question=$3, category=$4, read_time=$5, introduction=$6, takeaway=$7, what_happened=$8, why_it_matters=$9, what_to_watch=$10, sections=$11, sources=$12, is_featured=$13, updated_at=NOW() WHERE id=$14 RETURNING *`, [...values, id])
        : await client.query(`INSERT INTO explainers (slug, source_article_id, question, category, read_time, introduction, takeaway, what_happened, why_it_matters, what_to_watch, sections, sources, is_featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, values);
      if (!result.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Explainer not found." }); }
      await client.query("COMMIT");
      res.status(id ? 200 : 201).json(result.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) { next(error); }
}

export async function deleteExplainer(req, res, next) {
  try {
    const result = await pool.query("DELETE FROM explainers WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Explainer not found." });
    res.json({ message: "Explainer deleted." });
  } catch (error) { next(error); }
}
