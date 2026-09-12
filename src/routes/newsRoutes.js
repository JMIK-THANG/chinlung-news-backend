import { Router } from "express";
import {
  createNews,
  deleteNews,
  getAdminNews,
  getNews,
  getNewsBySlug,
  updateNews,
} from "../controllers/newsController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.get("/", getNews);
router.get("/admin/all", requireAdmin, getAdminNews);
router.get("/:slug", getNewsBySlug);
router.post("/", requireAdmin, createNews);
router.put("/:id", requireAdmin, updateNews);
router.delete("/:id", requireAdmin, deleteNews);

export default router;
