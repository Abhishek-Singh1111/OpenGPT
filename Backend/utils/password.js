import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_OPTIONS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
};

export const hashPassword = async (password) => {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const salt = crypto.randomBytes(SALT_BYTES);
  const derivedKey = await scryptAsync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${Buffer.from(derivedKey).toString("hex")}`;
};

export const verifyPassword = async (password, stored) => {
  if (typeof stored !== "string" || !stored.startsWith("scrypt$")) return false;

  const parts = stored.split("$");
  if (parts.length !== 3) return false;

  const saltHex = parts[1];
  const keyHex = parts[2];
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");

  const derivedKey = await scryptAsync(password, salt, storedKey.length, SCRYPT_OPTIONS);
  return crypto.timingSafeEqual(Buffer.from(derivedKey), storedKey);
};

