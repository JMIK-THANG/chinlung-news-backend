import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/db.js";

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Add ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD to .env first.");
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
  console.error("ADMIN_EMAIL must be a valid email address, including the @ symbol.");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const result = await pool.query(
    `INSERT INTO admin_users (name, email, password_hash)
     VALUES ($1, LOWER($2), $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name,
                   password_hash = EXCLUDED.password_hash,
                   updated_at = NOW()
     RETURNING id, name, email`,
    [ADMIN_NAME, ADMIN_EMAIL.trim(), passwordHash],
  );

  console.log("Admin account is ready:", result.rows[0].email);
} catch (error) {
  console.error("Could not create admin:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
