import pool from "../db.js";

const allowedCategories = [
  "Chin News",
  "Myanmar News",
  "International News",
  "Sports",
  "Business",
];

function makeSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createNews(req, res, next) {
  try {
    const {
      title,
      summary,
      content,
      category,
      author,
      imageUrl = null,
      imageAlt = null,
      status = "published",
      isTopStory = false,
    } = req.body;

    if (!title || !summary || !content || !category || !author) {
      return res.status(400).json({
        message: "Title, summary, content, category, and author are required.",
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: `Category must be one of: ${allowedCategories.join(", ")}`,
      });
    }

    const slug = `${makeSlug(title)}-${Date.now()}`;
    const publishedAt = status === "published" ? new Date() : null;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (isTopStory) {
        await client.query(
          "UPDATE news_articles SET is_top_story = FALSE WHERE is_top_story = TRUE",
        );
      }

      const result = await client.query(
        `INSERT INTO news_articles (
          slug, title, summary, content, category, author,
          image_url, image_alt, status, is_top_story, published_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          slug,
          title,
          summary,
          content,
          category,
          author,
          imageUrl,
          imageAlt,
          status,
          isTopStory,
          publishedAt,
        ],
      );

      await client.query("COMMIT");
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

export async function getNews(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const category = req.query.category;
    const values = [];
    let where = "WHERE status = 'published'";

    if (category) {
      values.push(category);
      where += ` AND category = $${values.length}`;
    }

    values.push(limit);
    const result = await pool.query(
      `SELECT * FROM news_articles
       ${where}
       ORDER BY published_at DESC
       LIMIT $${values.length}`,
      values,
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getNewsBySlug(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE news_articles
       SET views = views + 1, updated_at = NOW()
       WHERE slug = $1 AND status = 'published'
       RETURNING *`,
      [req.params.slug],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "News article not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}
