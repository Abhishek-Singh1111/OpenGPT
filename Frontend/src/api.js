const rawBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL;

const normalizedBase = (() => {
  const fallback = "http://localhost:8080/api";
  if (!rawBase) return fallback;
  const noTrailingSlash = rawBase.replace(/\/+$/, "");
  if (noTrailingSlash.endsWith("/api/auth")) {
    return noTrailingSlash.slice(0, -"/auth".length);
  }
  return noTrailingSlash.endsWith("/api") ? noTrailingSlash : `${noTrailingSlash}/api`;
})();

export const API_BASE_URL = normalizedBase;

export const authHeader = (token) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
