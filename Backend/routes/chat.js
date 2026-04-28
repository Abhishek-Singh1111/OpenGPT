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
        const now = new Date();
        await Thread.updateOne(
          { threadId: normalizedThreadId, userId: req.auth.userObjectId },
          {
            $setOnInsert: {
              title: normalizedMessage.slice(0, 120),
              createdAt: now,
            },
            $set: { updatedAt: now },
            $push: { messages: { role: "user", content: normalizedMessage, timestamp: now } },
          },
          { upsert: true }
        );

        const useGroq = String(process.env.USE_GROQ).toLowerCase() === "true"
          || (!process.env.OPENAI_API_KEY && !!process.env.GROQ_API_KEY);

        let assistantReply;
        try {
          assistantReply = useGroq
            ? await getGroqChatResponse(normalizedMessage)
            : await getOpenAIAPIResponse(normalizedMessage);
        } catch (err) {
          const msg = String(err?.message || "");
          const isTimeout = /timed\s*out/i.test(msg) || err?.name === "AbortError";
          return res.status(isTimeout ? 504 : 502).json({
            error: isTimeout
              ? "Assistant timed out. Please try a shorter prompt or retry."
              : "Assistant provider error. Please try again.",
          });
        }

        if (!assistantReply) {
            console.error("Assistant provider returned no reply for message:", normalizedMessage);
            return res.status(502).json({error: "assistant response unavailable"});
        }

        const replyTimestamp = new Date();
        await Thread.updateOne(
          { threadId: normalizedThreadId, userId: req.auth.userObjectId },
          {
            $set: { updatedAt: replyTimestamp },
            $push: { messages: { role: "assistant", content: assistantReply, timestamp: replyTimestamp } },
          }
        );
        res.json({reply: assistantReply});
    } catch(err) {
        console.error(err);
        res.status(500).json({error: "something went wrong"});
    }
});




export default router;
