import { Router } from "express";

const router = Router();
const attempts = new Map();
const windowMs = 15 * 60 * 1000;

router.post("/", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const now = Date.now();
  for (const [ip, entry] of attempts) if (now - entry.start >= windowMs) attempts.delete(ip);
  const ip = req.ip;
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (entry.count >= 5) return res.status(429).json({ message: "Please wait a few minutes before sending another message." });
  entry.count += 1;
  attempts.set(ip, entry);

  const { name, email, subject, message, website } = req.body || {};
  if (website) return res.status(400).json({ message: "Unable to send this message." });
  if ([name, email, subject, message].some(value => typeof value !== "string" || !value.trim())) {
    return res.status(400).json({ message: "Please complete every field." });
  }
  if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 10000 ||
      /[\r\n]/.test(name + email + subject) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Please check your email address and message length." });
  }
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(503).json({ message: "The contact form is temporarily unavailable. Please email salaimazawn@gmail.com directly." });

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
      sender: { name: "Chinlung Today", email: process.env.CONTACT_FROM_EMAIL || "salaimazawn@gmail.com" },
      to: [{ email: "salaimazawn@gmail.com" }],
      replyTo: { name: name.trim(), email: email.trim() },
      subject: `[Chinlung Today] ${subject.trim()}`,
      textContent: `From: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`,
      }),
    });
    if (!response.ok) throw new Error("Email provider rejected the request");
    return res.json({ message: "Your message has been sent. Thank you for getting in touch." });
  } catch {
    console.error("Contact email delivery failed.");
    return res.status(502).json({ message: "We could not send your message. Please try again or email salaimazawn@gmail.com directly." });
  }
});

export default router;
