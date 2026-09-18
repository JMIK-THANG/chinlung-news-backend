import { Router } from "express";
import {
  createNews,
  deleteNews,
  getAdminNews,
  getAdminNewsById,
  getNews,
  getNewsBySlug,
  getRelatedNews,
  updateNews,
  updateEditorPick,
} from "../controllers/newsController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.get("/", getNews);
router.get("/admin/all", requireAdmin, getAdminNews);
router.get("/admin/:id", requireAdmin, getAdminNewsById);
router.get("/:slug/related", getRelatedNews);
router.get("/:slug", getNewsBySlug);
router.patch("/:id/editor-pick", requireAdmin, updateEditorPick);
router.post("/", requireAdmin, createNews);
router.put("/:id", requireAdmin, updateNews);
router.delete("/:id", requireAdmin, deleteNews);

export default router;
