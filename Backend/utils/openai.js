import "dotenv/config";

const getOpenAIAPIResponse = async(message) => {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY in Backend/.env. Set OPENAI_API_KEY before using OpenAI chat.");
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: message
            }]
        })
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", options);
        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API returned an error:", response.status, data);
            throw new Error("OpenAI API request failed");
        }

        const reply = data?.choices?.[0]?.message?.content;
        if (!reply) {
            console.error("OpenAI response missing message content:", data);
            throw new Error("OpenAI response missing content");
        }

        return reply;
    } catch(err) {
        console.error("OpenAI helper error:", err);
        throw err;
    }
}

export default getOpenAIAPIResponse;