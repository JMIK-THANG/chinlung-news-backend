import "dotenv/config";
import cors from "cors";
import express from "express";
import pool from "./db.js";
import newsRoutes from "./routes/newsRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5177",
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
// A modestly larger limit allows the prototype admin to submit a compressed
// image selected from the computer as a data URL.
app.use(express.json({ limit: "4mb" }));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "API and database are working." });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(port, () => {
  console.log(`Chinlung Today API running at http://localhost:${port}`);
});
