import "dotenv/config";
import { Groq } from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in Backend/.env. Set GROQ_API_KEY before using Groq chat.");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const MAX_COMPLETION_TOKENS = 2048;
const MAX_PROMPT_LENGTH = 12000;

const trimMessage = (message) => {
  if (message.length <= MAX_PROMPT_LENGTH) return message;
  console.warn(`Truncating user message from ${message.length} to ${MAX_PROMPT_LENGTH} characters to fit model limits.`);
  return message.slice(0, MAX_PROMPT_LENGTH);
};

const getGroqChatResponse = async (message) => {
  const prompt = trimMessage(message);
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-oss-120b",
    temperature: 1,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    top_p: 1,
    stream: false,
    reasoning_effort: "medium",
  });

  const reply = completion?.choices?.[0]?.message?.content;
  if (!reply) {
    console.error("Groq response missing message content:", completion);
    throw new Error("Groq response missing content");
  }

  return reply;
};

export default getGroqChatResponse;
