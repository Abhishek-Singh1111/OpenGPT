import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect } from "react";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
    const {
        prompt, setPrompt,
        reply, setReply,
        currThreadId, setPrevChats,
        setNewChat, sidebarOpen, setSidebarOpen,
        token, logout, apiBaseUrl,
        user
    } = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");

    const getReply = async () => {
        if (!prompt.trim()) return;
        if (!token) {
            setError("You must be logged in to chat.");
            return;
        }
        setLoading(true);
        setNewChat(false);
        setError("");

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                message: prompt,
                threadId: currThreadId
            })
        };

        try {
            const response = await fetch(`${apiBaseUrl}/chat`, options);
            const res = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    setError("Session expired. Please sign in again.");
                } else {
                    setError(res?.error || "Unable to send message.");
                }
                return;
            }
            setReply(res.reply);
        } catch(err) {
            console.log(err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    //Append new chat to prevChats
    useEffect(() => {
        if(prompt && reply) {
            setPrevChats(prevChats => (
                [...prevChats, {
                    role: "user",
                    content: prompt
                },{
                    role: "assistant",
                    content: reply
                }]
            ));
        }

        setPrompt("");
    }, [reply]);


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
                    <span>OpenGPT <i className="fa-solid fa-chevron-down"></i></span>
                </div>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem">
                        <i className="fa-solid fa-user"></i>{" "}
                        {user?.email || "Unknown account"}
                    </div>
                    <div className="dropDownItem">
                        <i className="fa-solid fa-globe"></i>{" "}
                        {apiBaseUrl}
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
                  OpenGPT can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>
        </div>
    )
}

export default ChatWindow;
