import { Router } from "express";
import { uploadNewsImage, uploadPodcastVideo } from "../controllers/uploadController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.post("/image", requireAdmin, uploadNewsImage);
router.post("/video", requireAdmin, uploadPodcastVideo);

export default router;
