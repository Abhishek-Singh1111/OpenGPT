import Session from "../models/Session.js";
import User from "../models/User.js";
import { hashSessionToken } from "../utils/session.js";
import mongoose from "mongoose";

const BEARER_PREFIX = "Bearer ";

let josePromise;
const loadJose = async () => {
  if (!josePromise) josePromise = import("jose");
  return josePromise;
};

const jwksCache = new Map();
const getAuth0Jwks = async (domain) => {
  const normalized = String(domain || "").trim();
  if (!normalized) throw new Error("Missing AUTH0_DOMAIN");
  if (jwksCache.has(normalized)) return jwksCache.get(normalized);

  const { createRemoteJWKSet } = await loadJose();
  const jwks = createRemoteJWKSet(new URL(`https://${normalized}/.well-known/jwks.json`));
  jwksCache.set(normalized, jwks);
  return jwks;
};

const verifyAuth0Jwt = async (token) => {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  const issuer = process.env.AUTH0_ISSUER || (domain ? `https://${domain}/` : undefined);

  if (!domain || !issuer || !audience) {
    const missing = [
      !domain ? "AUTH0_DOMAIN" : null,
      !audience ? "AUTH0_AUDIENCE" : null,
      !issuer ? "AUTH0_ISSUER" : null,
    ].filter(Boolean);
    throw new Error(`Missing Auth0 config: ${missing.join(", ")}`);
  }

  const { jwtVerify } = await loadJose();
  const jwks = await getAuth0Jwks(domain);
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  return payload;
};

const isProbablyJwt = (token) => token.split(".").length === 3;

export const requireAuth = async (req, res, next) => {
  try {
    const rawHeader = req.get("authorization") || req.get("Authorization") || "";
    if (!rawHeader.startsWith(BEARER_PREFIX)) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = rawHeader.slice(BEARER_PREFIX.length).trim();
    if (!token) return res.status(401).json({ error: "Missing session token" });

    // Auth0 JWT path (recommended for production)
    if (isProbablyJwt(token) && process.env.AUTH0_DOMAIN) {
      let payload;
      try {
        payload = await verifyAuth0Jwt(token);
      } catch (err) {
        console.error("JWT verification failed:", err?.message || err);
        const isConfigError = String(err?.message || "").startsWith("Missing Auth0 config:");
        const isMissingJose =
          err?.code === "ERR_MODULE_NOT_FOUND" ||
          /Cannot find package ['"]jose['"]/.test(String(err?.message || ""));
        const statusCode = isConfigError || isMissingJose ? 500 : 401;
        return res.status(statusCode).json({
          error: isConfigError || isMissingJose
            ? "Auth server misconfigured"
            : "Invalid or expired token",
        });
      }

      const auth0Sub = String(payload?.sub || "").trim();
      if (!auth0Sub) return res.status(401).json({ error: "Invalid token subject" });

      const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : undefined;
      const name =
        (typeof payload?.name === "string" && payload.name.trim()) ||
        (typeof payload?.nickname === "string" && payload.nickname.trim()) ||
        "User";

      let user = await User.findOne({ auth0Sub });
      if (!user) {
        try {
          user = await User.create({
            auth0Sub,
            name,
            ...(email ? { email } : {}),
          });
        } catch (err) {
          // If a local account already exists with the same email, link it to this Auth0 identity.
          if (err?.code === 11000 && email) {
            const existing = await User.findOne({ email });
            if (existing) {
              await User.updateOne(
                { _id: existing._id },
                { $set: { auth0Sub, name } }
              );
              user = await User.findById(existing._id);
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      } else {
        const updates = {};
        if (email && user.email !== email) updates.email = email;
        if (name && user.name !== name) updates.name = name;
        if (Object.keys(updates).length) {
          await User.updateOne({ _id: user._id }, { $set: updates }).catch(() => {});
        }
      }

      req.auth = {
        userId: String(user._id),
        auth0Sub,
      };

      req.user = {
        id: String(user._id),
        name: user.name,
        email: user.email,
      };

      if (!mongoose.Types.ObjectId.isValid(req.auth.userId)) {
        return res.status(401).json({ error: "Invalid authenticated user" });
      }

      return next();
    }

    // Local session-token path (for dev / non-Auth0 auth)
    const tokenHash = hashSessionToken(token);
    const now = new Date();

    const session = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: now },
    }).lean();

    if (!session) return res.status(401).json({ error: "Invalid or expired session" });

    const user = await User.findById(session.userId).select("_id name email").lean();
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ error: "Invalid session" });
    }

    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } }).catch(() => {});

    req.auth = {
      sessionId: String(session._id),
      userId: String(user._id),
      tokenHash,
    };

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
    };

    if (!mongoose.Types.ObjectId.isValid(req.auth.userId)) {
      return res.status(401).json({ error: "Invalid authenticated user" });
    }

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
