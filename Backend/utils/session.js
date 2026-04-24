import crypto from "crypto";

export const createSessionToken = () => crypto.randomBytes(32).toString("hex");

export const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getSessionExpiryDate = (ttlDays) => {
  const days = Number(ttlDays);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
};

