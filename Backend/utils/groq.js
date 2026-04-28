import "dotenv/config";
import { Groq } from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in Backend/.env. Set GROQ_API_KEY before using Groq chat.");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS) || 256;
const MAX_PROMPT_LENGTH = 12000;
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 20000;

const withTimeout = async (promise, timeoutMs, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const trimMessage = (message) => {
  if (message.length <= MAX_PROMPT_LENGTH) return message;
  console.warn(`Truncating user message from ${message.length} to ${MAX_PROMPT_LENGTH} characters to fit model limits.`);
  return message.slice(0, MAX_PROMPT_LENGTH);
};

const getGroqChatResponse = async (message) => {
  const prompt = trimMessage(message);
  const completion = await withTimeout(
    groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: GROQ_MODEL,
      temperature: 0.6,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      top_p: 1,
      stream: false,
    }),
    GROQ_TIMEOUT_MS,
    "Groq request"
  );

  const reply = completion?.choices?.[0]?.message?.content;
  if (!reply) {
    console.error("Groq response missing message content:", completion);
    throw new Error("Groq response missing content");
  }

  return reply;
};

export default getGroqChatResponse;
