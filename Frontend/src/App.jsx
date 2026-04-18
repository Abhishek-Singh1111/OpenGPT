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
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
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

  const logout = () => {
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
      <MyContext.Provider value={providerValues}>
          <Sidebar />
          <ChatWindow />
        </MyContext.Provider>
    </div>
  )
}

export default App
