import "./Sidebar.css";
import { useContext, useEffect, useCallback } from "react";
import { MyContext } from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";

function Sidebar() {
    const {
        allThreads, setAllThreads,
        currThreadId, setNewChat, setPrompt,
        setReply, setCurrThreadId, setPrevChats,
        sidebarOpen, setSidebarOpen,
        token, logout, apiBaseUrl
    } = useContext(MyContext);

    const getAllThreads = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${apiBaseUrl}/thread`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            if (!response.ok) {
                if (response.status === 401) logout();
                return;
            }
            const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
            //console.log(filteredData);
            setAllThreads(filteredData);
        } catch(err) {
            console.log(err);
        }
    }, [apiBaseUrl, logout, setAllThreads, token]);

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, getAllThreads, token])


    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    }

    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);

        try {
           const response = await fetch(`${apiBaseUrl}/thread/${newThreadId}`, {
                headers: { Authorization: `Bearer ${token}` }
           });
            const res = await response.json();
            if (!response.ok) {
                if (response.status === 401) logout();
                return;
            }
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch(err) {
            console.log(err);
        }
    }   

    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(`${apiBaseUrl}/thread/${threadId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            console.log(res);

            //updated threads re-render
            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

            if(threadId === currThreadId) {
                createNewChat();
            }

        } catch(err) {
            console.log(err);
        }
    }

    return (
        <>
            <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>
            <section className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button onClick={createNewChat}>
                <img src="src/assets/blacklogo.png" alt="gpt logo" className="logo"></img>
                <span><i className="fa-solid fa-pen-to-square"></i></span>
            </button>


            <ul className="history">
                {
                    allThreads?.map((thread, idx) => (
                        <li key={idx} 
                            onClick={() => changeThread(thread.threadId)}
                            className={thread.threadId === currThreadId ? "highlighted": " "}
                        >
                            {thread.title}
                            <i className="fa-solid fa-trash"
                                onClick={(e) => {
                                    e.stopPropagation(); //stop event bubbling
                                    deleteThread(thread.threadId);
                                }}
                            ></i>
                        </li>
                    ))
                }
            </ul>
 
            <div className="sign">
                <p>Made by Abhishek </p>
            </div>
            </section>
        </>
    )
}

export default Sidebar;
