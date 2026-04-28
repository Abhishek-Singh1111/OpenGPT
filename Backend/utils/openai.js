import "dotenv/config";

const getOpenAIAPIResponse = async(message) => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY in Backend/.env. Set OPENAI_API_KEY before using OpenAI chat.");
    }

    const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const OPENAI_MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS) || 512;
    const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 25000;

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{
                role: "user",
                content: message
            }],
            max_tokens: OPENAI_MAX_TOKENS,
            temperature: 0.7
        })
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
        let response;
        try {
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            ...options,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error("OpenAI API returned an error:", response.status, data);
            throw new Error(`OpenAI API request failed (HTTP ${response.status})`);
        }

        const reply = data?.choices?.[0]?.message?.content;
        if (!reply) {
            console.error("OpenAI response missing message content:", data);
            throw new Error("OpenAI response missing content");
        }

        return reply;
    } catch(err) {
        if (err?.name === "AbortError") {
          throw new Error("OpenAI API request timed out");
        }
        console.error("OpenAI helper error:", err);
        throw err;
    }
}

export default getOpenAIAPIResponse;
