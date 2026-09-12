import { Router } from "express";
import { uploadNewsImage } from "../controllers/uploadController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

router.post("/image", requireAdmin, uploadNewsImage);

export default router;
