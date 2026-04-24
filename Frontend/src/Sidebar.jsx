import "./Sidebar.css";
import { useContext, useEffect, useRef } from "react";
import { MyContext } from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";
import logo from "./assets/blacklogo.png"; 
function Sidebar() {
    const {
        allThreads, setAllThreads,
        currThreadId, setNewChat, setPrompt,
        setReply, setCurrThreadId, setPrevChats,
        sidebarOpen, setSidebarOpen,
        token, logout, apiBaseUrl,
        user
    } = useContext(MyContext);

    const authKeyRef = useRef("");
    authKeyRef.current = user?.id || token || "";

    useEffect(() => {
        if (!token) {
            setAllThreads([]);
            return;
        }

        const controller = new AbortController();
        const requestAuthKey = authKeyRef.current;

        (async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/thread`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal
                });
                const res = await response.json();
                if (controller.signal.aborted) return;
                if (requestAuthKey !== authKeyRef.current) return;

                if (!response.ok) {
                    if (response.status === 401) logout();
                    setAllThreads([]);
                    return;
                }
                const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
                setAllThreads(filteredData);
            } catch(err) {
                if (controller.signal.aborted) return;
                console.log(err);
                setAllThreads([]);
            }
        })();

        return () => controller.abort();
    }, [apiBaseUrl, currThreadId, logout, setAllThreads, token])


    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    }

    const activeThreadRequest = useRef(0);

    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);
        const requestId = ++activeThreadRequest.current;
        const requestAuthKey = authKeyRef.current;

        try {
           const response = await fetch(`${apiBaseUrl}/thread/${newThreadId}`, {
                headers: { Authorization: `Bearer ${token}` }
           });
            const res = await response.json();
            if (requestId !== activeThreadRequest.current) return;
            if (requestAuthKey !== authKeyRef.current) return;
            if (!response.ok) {
                if (response.status === 401) logout();
                setPrevChats([]);
                return;
            }
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch(err) {
            console.log(err);
            setPrevChats([]);
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

            if (!response.ok) {
                if (response.status === 401) logout();
                return;
            }

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
              <img src={logo} alt="gpt logo" className="logo" />
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
