import "dotenv/config";
import { readFile } from "node:fs/promises";
import pool from "../src/db.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

try {
  const schema = await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  console.log("Database tables are ready.");
} catch (error) {
  console.error("Could not initialize database:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
