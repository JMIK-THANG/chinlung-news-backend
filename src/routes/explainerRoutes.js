import { Router } from "express";
import { deleteExplainer, getAdminExplainers, getExplainerBySlug, getFeaturedExplainer, saveExplainer } from "../controllers/explainerController.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();
router.get("/featured", getFeaturedExplainer);
router.get("/admin/all", requireAdmin, getAdminExplainers);
router.get("/:slug", getExplainerBySlug);
router.post("/", requireAdmin, saveExplainer);
router.put("/:id", requireAdmin, saveExplainer);
router.delete("/:id", requireAdmin, deleteExplainer);
export default router;
