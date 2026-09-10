import { Router } from "express";
import {
  createNews,
  getNews,
  getNewsBySlug,
} from "../controllers/newsController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.get("/", getNews);
router.get("/:slug", getNewsBySlug);
router.post("/", requireAdmin, createNews);

export default router;
