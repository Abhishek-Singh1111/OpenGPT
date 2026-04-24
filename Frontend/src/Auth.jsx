import { useState } from "react";
import "./Auth.css";
import { API_BASE_URL } from "./api";

const initialMode = "login";
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");
const LOCAL_USERS_KEY = "opengpt_local_auth_users_v1";

const getAuthUrls = (endpoint) => {
  const candidates = [
    `${API_BASE_URL}/auth/${endpoint}`,
    `${API_BASE_URL}/${endpoint}`,
    `${API_ORIGIN}/api/auth/${endpoint}`,
    `${API_ORIGIN}/auth/${endpoint}`,
    `${API_ORIGIN}/api/${endpoint}`,
  ];

  return [...new Set(candidates)];
};

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

const registerLocalUser = ({ name, email, password }) => {
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

const loginLocalUser = ({ email, password }) => {
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

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "login" : "register";
      const payload = mode === "login" ? { email, password } : { name, email, password };
      const authUrls = getAuthUrls(endpoint);

      for (const authUrl of authUrls) {
        let response;
        try {
          response = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          continue;
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
        const looksLikeMissingRoute =
          response.status === 404 || /Cannot\s+POST/i.test(textBody);

        if (!looksLikeMissingRoute) {
          const msg = isJson ? data?.error : textBody.slice(0, 120);
          setError(msg || `Authentication failed (HTTP ${response.status})`);
          return;
        }
      }

      throw new Error(
        `Backend authentication is not available at ${API_BASE_URL}. ` +
          "Make sure your backend is running with /api/auth routes and VITE_API_URL points to it."
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <i className="fa-solid fa-robot"></i>
        </div>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Sign in to continue chatting."
            : "Register to save your conversations securely."}
        </p>

        {mode === "register" && (
          <label>
            <span>Name</span>
            <input
              type="text"
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
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <p className="auth-toggle">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button type="button" onClick={toggleMode} className="linkish">
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default Auth;
