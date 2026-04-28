import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useRef } from "react";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
    const {
        prompt, setPrompt,
        setReply,
        currThreadId, setPrevChats,
        setNewChat, sidebarOpen, setSidebarOpen,
        token, logout, apiBaseUrl,
        user
    } = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const requestIdRef = useRef(0);
    const abortRef = useRef(null);
    const CHAT_TIMEOUT_MS = 60000;

    const getReply = async () => {
        const userMessage = prompt.trim();
        if (!userMessage) return;
        if (!token) {
            setError("You must be logged in to chat.");
            return;
        }

        const requestId = ++requestIdRef.current;
        if (abortRef.current) abortRef.current.abort();

        setLoading(true);
        setNewChat(false);
        setError("");
        setReply(null);
        setPrompt("");

        setPrevChats((prev) => [
          ...prev,
          { role: "user", content: userMessage },
          { role: "assistant", content: "" },
        ]);

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                message: userMessage,
                threadId: currThreadId
            })
        };

        try {
            const controller = new AbortController();
            abortRef.current = controller;
            const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

            let response;
            try {
              response = await fetch(`${apiBaseUrl}/chat`, { ...options, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
            }
            if (requestId !== requestIdRef.current) return;

            const res = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    setError("Session expired. Please sign in again.");
                } else {
                    setError(res?.error || "Unable to send message.");
                }
                setPrevChats((prev) => {
                  if (!prev.length) return prev;
                  const next = [...prev];
                  const lastIdx = next.length - 1;
                  if (next[lastIdx]?.role === "assistant") {
                    next[lastIdx] = { ...next[lastIdx], content: res?.error || "Unable to send message." };
                    return next;
                  }
                  return prev;
                });
                return;
            }

            const assistantText = res?.reply || "";
            setReply(assistantText);
            setPrevChats((prev) => {
              if (!prev.length) return prev;
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (next[lastIdx]?.role === "assistant") {
                next[lastIdx] = { ...next[lastIdx], content: assistantText };
              } else {
                next.push({ role: "assistant", content: assistantText });
              }
              return next;
            });
        } catch(err) {
            if (requestId !== requestIdRef.current) return;
            if (err?.name === "AbortError") {
              setError("Request timed out. Please try again.");
              setPrevChats((prev) => {
                if (!prev.length) return prev;
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (next[lastIdx]?.role === "assistant") {
                  next[lastIdx] = { ...next[lastIdx], content: "Request timed out. Please try again." };
                }
                return next;
              });
            } else {
              console.log(err);
              setError("Network error. Please try again.");
              setPrevChats((prev) => {
                if (!prev.length) return prev;
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (next[lastIdx]?.role === "assistant") {
                  next[lastIdx] = { ...next[lastIdx], content: "Network error. Please try again." };
                }
                return next;
              });
            }
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }


    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    }

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    }

    return (
        <div className="chatWindow">
            <div className="navbar">
                <div className="navLeft">
                    <button className="hamburger" onClick={toggleSidebar}>
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <span>GPT-Clone <i className="fa-solid fa-chevron-down"></i></span>
                </div>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem dropDownInfo">
                        <i className="fa-solid fa-user"></i>
                        <span className="dropDownText">{user?.email || "Unknown account"}</span>
                    </div>
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem"><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
                    <div className="dropDownItem" onClick={logout}><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
                </div>
            }
            <Chat></Chat>

            {error && <div className="error-banner">{error}</div>}

            <ScaleLoader color="#fff" loading={loading} />
            
            <div className="chatInput">
                <div className="inputBox">
                    <input placeholder="Ask anything"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter'? getReply() : ''}
                    >
                           
                    </input>
                    <div id="submit" onClick={getReply}><i className="fa-solid fa-paper-plane"></i></div>
                </div>
                <p className="info">
                  GPT-Clone can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>
        </div>
    )
}

export default ChatWindow;
