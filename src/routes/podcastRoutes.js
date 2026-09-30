import { Router } from "express";
import { createPodcast, deletePodcast, getAdminPodcasts, getPodcasts } from "../controllers/podcastController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.get("/", getPodcasts);
router.get("/admin/all", requireAdmin, getAdminPodcasts);
router.post("/", requireAdmin, createPodcast);
router.delete("/:id", requireAdmin, deletePodcast);

export default router;
