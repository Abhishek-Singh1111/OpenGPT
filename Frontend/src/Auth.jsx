import { useState } from "react";
import "./Auth.css";
import { API_BASE_URL } from "./api";

const initialMode = "login";
const LOCAL_USERS_KEY = "opengpt_local_auth_users_v1";
const AUTH_TIMEOUT_MS = 20000;
const AUTH_LOGO_SRC = `${import.meta.env.BASE_URL}blacklogo.png`;

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();
  return { isJson, data };
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const readLocalUsers = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const toSession = (user) => {
  const tokenPayload = `${user.email}:${Date.now()}`;
  return {
    token: `local-${btoa(tokenPayload)}`,
    user: { id: user.id, name: user.name, email: user.email },
  };
};

const _registerLocalUser = ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const users = readLocalUsers();
  const exists = users.some((u) => normalizeEmail(u.email) === normalizedEmail);
  if (exists) {
    throw new Error("Email already in use");
  }

  const newUser = {
    id: `local-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    password,
  };

  users.push(newUser);
  writeLocalUsers(users);
  return toSession(newUser);
};

const _loginLocalUser = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const users = readLocalUsers();
  const user = users.find((u) => normalizeEmail(u.email) === normalizedEmail);

  if (!user || user.password !== password) {
    throw new Error("Invalid credentials");
  }

  return toSession(user);
};

function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setModeSafe = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const isLogin = mode === "login";
  const isRegister = mode === "register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "login" : "register";
      const payload = isLogin ? { email, password } : { name, email, password };
      const authUrl = `${API_BASE_URL}/auth/${endpoint}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const { isJson, data } = await parseResponse(response);
      if (response.ok) {
        const parsed = isJson ? data : {};
        onAuthSuccess({ token: parsed.token, user: parsed.user });
        setName("");
        setEmail("");
        setPassword("");
        return;
      }

      const textBody = typeof data === "string" ? data : "";
      const msg = isJson ? data?.error : textBody.slice(0, 180);
      setError(msg || `Authentication failed (HTTP ${response.status})`);
    } catch (err) {
      console.error(err);
      if (err?.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit} data-mode={mode}>
        <div className="auth-header">
          <div className="auth-logo" aria-hidden="true">
            <img className="auth-logo-img" src={AUTH_LOGO_SRC} alt="GPT logo" />
          </div>
          <h2>{isLogin ? "Sign in" : "Sign up"}</h2>
          <p className="auth-subtitle">
            {isLogin
              ? "Sign in to continue chatting."
              : "Register to save your conversations securely."}
          </p>
        </div>

        {isRegister && (
          <label>
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}

        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Sign in" : "Sign up"}
        </button>

        <p className="auth-toggle">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setModeSafe(isLogin ? "register" : "login")}
            className="linkish"
            disabled={loading}
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default Auth;
