import "./Chat.css";
import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

const BR_TAG = /<br\s*\/?>/gi;

const isTableSeparatorRow = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
    return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(trimmed);
};

const parseTableRow = (line) =>
    line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());

const convertGfmTablesToBullets = (text) => {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const output = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const isPotentialHeader =
            line.trim().startsWith("|") &&
            line.trim().endsWith("|") &&
            lines[i + 1] &&
            isTableSeparatorRow(lines[i + 1]);

        if (!isPotentialHeader) {
            output.push(line);
            continue;
        }

        const headers = parseTableRow(line);
        i += 2; // skip header + separator

        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
            rows.push(parseTableRow(lines[i]));
            i++;
        }
        i--; // compensate for loop increment

        for (const row of rows) {
            if (headers.length === 2) {
                const label = row[0] || "";
                const value = row[1] || "";
                if (label || value) output.push(`- **${label || "Item"}:** ${value}`);
                continue;
            }

            const label = row[0] || "Item";
            const restHeaders = headers.slice(1);
            const restValues = row.slice(1);
            const details = restHeaders
                .map((h, idx) => {
                    const cell = restValues[idx] || "";
                    return cell ? `**${h || `col${idx + 2}`}:** ${cell}` : "";
                })
                .filter(Boolean)
                .join("\n");

            output.push(`- **${label}:**\n${details || ""}`.trimEnd());
        }

        output.push(""); // spacing after table
    }

    return output.join("\n");
};

const normalizeAssistantMarkdown = (text) => {
    const raw = String(text || "");
    const withBreaks = raw.replace(BR_TAG, "\n");
    return convertGfmTablesToBullets(withBreaks);
};

function Chat() {
    const {newChat, prevChats, reply} = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);

    useEffect(() => {
        if(reply === null) {
            setLatestReply(null); //prevchat load
            return;
        }

        if(!prevChats?.length) return;

        const content = reply.split(" "); //individual words
        const totalWords = content.length;
        const maxTypingMs = 1200;
        const stepMs = Math.max(10, Math.floor(maxTypingMs / Math.max(1, totalWords)));

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(content.slice(0, idx + 1).join(" "));

            idx++;
            if(idx >= totalWords) clearInterval(interval);
        }, stepMs);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    return (
        <>
            {newChat && <h1>Start a New Chat!</h1>}
            <div className="chats">
                {
                    prevChats?.map((chat, idx) => {
                        const isLast = idx === prevChats.length - 1;
                        const contentToRender =
                          chat.role === "assistant" && isLast && latestReply !== null ? latestReply : chat.content;

                        return (
                          <div className={chat.role === "user" ? "userDiv" : "gptDiv"} key={idx}>
                            {chat.role === "user" ? (
                              <p className="userMessage">{contentToRender}</p>
                            ) : (
                              <div className="assistantMessage">
                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                  {normalizeAssistantMarkdown(contentToRender || "...")}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                    })
                }

            </div>
        </>
    )
}

export default Chat;
