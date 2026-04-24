import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";
import getGroqChatResponse from "../utils/groq.js";
import { requireAuth } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

router.use(requireAuth);
router.use((req, res, next) => {
    const userId = req?.auth?.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ error: "Invalid authenticated user" });
    }
    req.auth.userObjectId = new mongoose.Types.ObjectId(userId);
    return next();
});

//Get all threads
router.get("/thread", async(req, res) => {
    try {
        const threads = await Thread.find({ userId: req.auth.userObjectId })
          .select("threadId title updatedAt")
          .sort({updatedAt: -1});
        //descending order of updatedAt...most recent data on top
        res.json(threads);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch threads"});
    }
});

router.get("/thread/:threadId", async(req, res) => {
    const {threadId} = req.params;

    try {
        const thread = await Thread.findOne({ threadId, userId: req.auth.userObjectId });

        if(!thread) {
            return res.status(404).json({error: "Thread not found"});
        }

        res.json(thread.messages);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch chat"});
    }
});

router.delete("/thread/:threadId", async (req, res) => {
    const {threadId} = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({ threadId, userId: req.auth.userObjectId });

        if(!deletedThread) {
            return res.status(404).json({error: "Thread not found"});
        }

        res.status(200).json({success : "Thread deleted successfully"});

    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to delete thread"});
    }
});

router.post("/chat", async(req, res) => {
    const {threadId, message} = req.body;

    if(typeof threadId !== "string" || !threadId.trim() || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({error: "missing required fields"});
    }

    const normalizedThreadId = threadId.trim();
    const normalizedMessage = message.trim();

    try {
        let thread = await Thread.findOne({ threadId: normalizedThreadId, userId: req.auth.userObjectId });

        if(!thread) {
            thread = new Thread({
                userId: req.auth.userObjectId,
                threadId: normalizedThreadId,
                title: normalizedMessage.slice(0, 120),
                messages: [{role: "user", content: normalizedMessage}]
            });
        } else {
            thread.messages.push({role: "user", content: normalizedMessage});
        }

        const useGroq = String(process.env.USE_GROQ).toLowerCase() === "true"
          || (!process.env.OPENAI_API_KEY && !!process.env.GROQ_API_KEY);

        const assistantReply = useGroq
          ? await getGroqChatResponse(normalizedMessage)
          : await getOpenAIAPIResponse(normalizedMessage);

        if (!assistantReply) {
            console.error("Assistant provider returned no reply for message:", normalizedMessage);
            return res.status(502).json({error: "assistant response unavailable"});
        }

        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt = new Date();

        await thread.save();
        res.json({reply: assistantReply});
    } catch(err) {
        console.error(err);
        res.status(500).json({error: "something went wrong"});
    }
});




export default router;
