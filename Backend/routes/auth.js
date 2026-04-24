import express from "express";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createSessionToken, getSessionExpiryDate, hashSessionToken } from "../utils/session.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const toUserPayload = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
});

const createUserSession = async (userId) => {
  const rawToken = createSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = getSessionExpiryDate(process.env.SESSION_TTL_DAYS);

  await Session.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
};

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await User.create({ name, email, passwordHash });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: "Email already in use" });
      }
      throw err;
    }

    const token = await createUserSession(user._id);
    return res.status(201).json({ token, user: toUserPayload(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Failed to register" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email" });
    if (!password) return res.status(400).json({ error: "Password is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = await createUserSession(user._id);
    return res.status(200).json({ token, user: toUserPayload(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to login" });
  }
});

router.get("/me", requireAuth, async (req, res) => res.json({ user: req.user }));

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await Session.deleteOne({ _id: req.auth.sessionId });
    return res.status(204).send();
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;
