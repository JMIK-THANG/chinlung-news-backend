import cloudinary, { cloudinaryIsConfigured } from "../config/cloudinary.js";
import pool from "../db.js";

const selectEpisode = `SELECT id, title, description, presenter, video_url, video_public_id,
  thumbnail_url, thumbnail_public_id, status, published_at, created_at, updated_at
  FROM podcast_episodes`;

export async function getPodcasts(_req, res, next) {
  try {
    res.set("Cache-Control", "no-store");
    const result = await pool.query(`${selectEpisode} WHERE status = 'published' ORDER BY published_at DESC NULLS LAST, created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getAdminPodcasts(_req, res, next) {
  try {
    const result = await pool.query(`${selectEpisode} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createPodcast(req, res, next) {
  try {
    const { title, description, presenter = "Chinlung Today", videoUrl, videoPublicId = null, thumbnailUrl = null, thumbnailPublicId = null, status = "published" } = req.body;
    if (!title?.trim() || !description?.trim() || !videoUrl?.trim()) return res.status(400).json({ message: "Title, description, and video are required." });
    if (!["draft", "published"].includes(status)) return res.status(400).json({ message: "Status must be draft or published." });
    const result = await pool.query(
      `INSERT INTO podcast_episodes (title, description, presenter, video_url, video_public_id, thumbnail_url, thumbnail_public_id, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title.trim(), description.trim(), presenter.trim() || "Chinlung Today", videoUrl, videoPublicId, thumbnailUrl, thumbnailPublicId, status, status === "published" ? new Date() : null],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function deletePodcast(req, res, next) {
  try {
    const result = await pool.query("DELETE FROM podcast_episodes WHERE id = $1 RETURNING video_public_id, thumbnail_public_id", [req.params.id]);
    const episode = result.rows[0];
    if (!episode) return res.status(404).json({ message: "Podcast episode not found." });
    if (cloudinaryIsConfigured()) {
      if (episode.video_public_id) cloudinary.uploader.destroy(episode.video_public_id, { resource_type: "video" }).catch(() => {});
      if (episode.thumbnail_public_id) cloudinary.uploader.destroy(episode.thumbnail_public_id).catch(() => {});
    }
    res.json({ message: "Podcast episode deleted." });
  } catch (error) {
    next(error);
  }
}
