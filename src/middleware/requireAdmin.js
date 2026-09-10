import jwt from "jsonwebtoken";

export default function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Admin login is required." });
  }

  try {
    const admin = jwt.verify(token, process.env.JWT_SECRET);

    if (!admin.isAdmin) {
      return res.status(403).json({ message: "Admin access is required." });
    }

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ message: "Your admin session is invalid or expired." });
  }
}
