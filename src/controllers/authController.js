import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM admin_users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );
    const admin = result.rows[0];

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    next(error);
  }
}
