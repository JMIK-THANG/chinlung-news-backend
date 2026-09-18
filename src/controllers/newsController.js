import pool from "../db.js";
import cloudinary, { cloudinaryIsConfigured } from "../config/cloudinary.js";

const allowedCategories = [
  "Chin News",
  "Myanmar News",
  "International News",
  "Sports",
  "Business",
  "Articles",
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
      imagePublicId = null,
      imageAlt = null,
      status = "published",
      isTopStory = false,
      isEditorPick = false,
      contentType = "news",
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
    if (!["news", "article"].includes(contentType)) return res.status(400).json({ message: "Publication type must be news or article." });

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

      const editorPick = contentType === "news" && Boolean(isEditorPick);
      if (editorPick) {
        await client.query("SELECT pg_advisory_xact_lock(20260917)");
        const countResult = await client.query("SELECT COUNT(*)::int AS total FROM news_articles WHERE is_editor_pick = TRUE");
        if (countResult.rows[0].total >= 4) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Editor’s Picks already has the maximum of 4 stories. Remove one first." });
        }
      }

      const result = await client.query(
        `INSERT INTO news_articles (
          slug, title, summary, content, category, author,
          image_url, image_public_id, image_alt, status, is_top_story, is_editor_pick, published_at, content_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          slug,
          title,
          summary,
          content,
          category,
          author,
          imageUrl,
          imagePublicId,
          imageAlt,
          status,
          isTopStory,
          editorPick,
          publishedAt,
          contentType,
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
    const contentType = req.query.type || "news";
    const values = [];
    let where = "WHERE status = 'published'";

    if (["news", "article"].includes(contentType)) {
      values.push(contentType);
      where += ` AND content_type = $${values.length}`;
    }

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

export async function getAdminNews(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const search = String(req.query.search || "").trim();
    const sort = String(req.query.sort || "newest");
    const orderBy = {
      newest: "created_at DESC",
      oldest: "created_at ASC",
      az: "LOWER(title) ASC",
      za: "LOWER(title) DESC",
    }[sort] || "created_at DESC";
    const values = [];
    let where = "";

    if (search) {
      values.push(`%${search}%`);
      where = `WHERE title ILIKE $${values.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM news_articles ${where}`,
      values,
    );
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT * FROM news_articles
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    res.json({
      articles: result.rows,
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.max(1, Math.ceil(countResult.rows[0].total / limit)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminNewsById(req, res, next) {
  try {
    const result = await pool.query("SELECT * FROM news_articles WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "News article not found." });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function updateEditorPick(req, res, next) {
  const id = Number(req.params.id);
  const isEditorPick = req.body.isEditorPick;

  if (!Number.isInteger(id) || typeof isEditorPick !== "boolean") {
    return res.status(400).json({ message: "A valid article and selection are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      "SELECT id, status, content_type, is_editor_pick FROM news_articles WHERE id = $1 FOR UPDATE",
      [id],
    );
    const article = existingResult.rows[0];

    if (!article) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "News article not found." });
    }
    if (isEditorPick && (article.status !== "published" || article.content_type !== "news")) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only published news can be added to Editor’s Picks." });
    }

    if (isEditorPick && !article.is_editor_pick) {
      await client.query("SELECT pg_advisory_xact_lock(20260917)");
      const countResult = await client.query(
        "SELECT COUNT(*)::int AS total FROM news_articles WHERE is_editor_pick = TRUE",
      );
      if (countResult.rows[0].total >= 4) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "Editor’s Picks already has the maximum of 4 stories. Remove one first." });
      }
    }

    const result = await client.query(
      `UPDATE news_articles
       SET is_editor_pick = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [isEditorPick, id],
    );
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
}

export async function updateNews(req, res, next) {
  try {
    const id = Number(req.params.id);
    const {
      title, summary, content, category, author, imageUrl = null,
      imagePublicId = null, imageAlt = null, status = "published", isTopStory = false, isEditorPick = false, contentType = "news",
    } = req.body;

    if (!Number.isInteger(id) || !title || !summary || !content || !category || !author) {
      return res.status(400).json({ message: "A valid article and all required fields are needed." });
    }
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: `Category must be one of: ${allowedCategories.join(", ")}` });
    }
    if (!["published", "draft"].includes(status)) {
      return res.status(400).json({ message: "Status must be published or draft." });
    }
    if (!["news", "article"].includes(contentType)) return res.status(400).json({ message: "Publication type must be news or article." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query(
        "SELECT published_at, image_public_id, is_editor_pick FROM news_articles WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!existingResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "News article not found." });
      }

      if (isTopStory) {
        await client.query("UPDATE news_articles SET is_top_story = FALSE WHERE is_top_story = TRUE AND id <> $1", [id]);
      }
      const editorPick = contentType === "news" && Boolean(isEditorPick);
      if (editorPick && !existingResult.rows[0].is_editor_pick) {
        await client.query("SELECT pg_advisory_xact_lock(20260917)");
        const countResult = await client.query("SELECT COUNT(*)::int AS total FROM news_articles WHERE is_editor_pick = TRUE");
        if (countResult.rows[0].total >= 4) {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "Editor’s Picks already has the maximum of 4 stories. Remove one first." });
        }
      }
      const publishedAt = status === "published"
        ? existingResult.rows[0].published_at || new Date()
        : null;
      const result = await client.query(
        `UPDATE news_articles SET
          title = $1, summary = $2, content = $3, category = $4,
          author = $5, image_url = $6, image_public_id = $7,
          image_alt = $8, status = $9, is_top_story = $10, is_editor_pick = $11, published_at = $12, content_type = $13,
          updated_at = NOW()
        WHERE id = $14 RETURNING *`,
        [title, summary, content, category, author, imageUrl, imagePublicId, imageAlt, status, isTopStory, editorPick, publishedAt, contentType, id],
      );
      await client.query("COMMIT");
      const previousImageId = existingResult.rows[0].image_public_id;
      if (previousImageId && previousImageId !== imagePublicId && cloudinaryIsConfigured()) {
        cloudinary.uploader.destroy(previousImageId).catch((error) => console.error("Old image cleanup failed:", error.message));
      }
      res.json(result.rows[0]);
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

export async function deleteNews(req, res, next) {
  try {
    const result = await pool.query(
      "DELETE FROM news_articles WHERE id = $1 RETURNING id, image_public_id",
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ message: "News article not found." });
    if (result.rows[0].image_public_id && cloudinaryIsConfigured()) {
      cloudinary.uploader.destroy(result.rows[0].image_public_id)
        .catch((error) => console.error("Deleted image cleanup failed:", error.message));
    }
    res.json({ message: "News article deleted." });
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

export async function getRelatedNews(req, res, next) {
  try {
    const currentResult = await pool.query(
      "SELECT id, category FROM news_articles WHERE slug = $1 AND status = 'published'",
      [req.params.slug],
    );
    const currentArticle = currentResult.rows[0];

    if (!currentArticle) {
      return res.status(404).json({ message: "News article not found." });
    }

    const result = await pool.query(
      `SELECT * FROM news_articles
       WHERE status = 'published' AND id <> $1
       ORDER BY
         CASE WHEN category = $2 THEN 0 ELSE 1 END,
         published_at DESC NULLS LAST
       LIMIT 3`,
      [currentArticle.id, currentArticle.category],
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}
