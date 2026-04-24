import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useEffect, useState } from "react";
import { v1 as uuidv1 } from "uuid";
import Auth from "./Auth.jsx";
import { API_BASE_URL } from "./api.js";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]); //stores all chats of curr threads
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    // Prevent cross-account UI data leaks if auth integration swaps users/tokens underneath.
    setAllThreads([]);
    setPrevChats([]);
    setReply(null);
    setPrompt("");
    setNewChat(true);
    setCurrThreadId(uuidv1());
    setSidebarOpen(false);
  }, [user?.id]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          const err = new Error("Auth check failed");
          err.status = response.status;
          throw err;
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.user) setUser(data.user);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 401) clearAuthState();
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("authUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("authUser");
    }
  }, [user]);

  const handleAuthSuccess = ({ token: newToken, user: loggedInUser }) => {
    setToken(newToken);
    setUser(loggedInUser);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    setAllThreads([]);
    setReply(null);
    setPrompt("");
    setNewChat(true);
  };

  const clearAuthState = () => {
    setToken(null);
    setUser(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    setAllThreads([]);
    setReply(null);
    setPrompt("");
    setNewChat(true);
    setSidebarOpen(false);
  };

  const logout = () => {
    const currentToken = token;
    if (currentToken) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }

    clearAuthState();
  };

  const providerValues = {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads,
    sidebarOpen, setSidebarOpen,
    token, setToken,
    user, setUser,
    logout,
    apiBaseUrl: API_BASE_URL
  }; 

  if (!token) {
    return (
      <div className="app">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="app">
      <MyContext.Provider value={providerValues} key={user?.id || token}>
          <Sidebar />
          <ChatWindow />
        </MyContext.Provider>
    </div>
  )
}

export default App
