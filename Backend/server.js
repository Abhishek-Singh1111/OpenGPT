import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in Backend/.env. Set MONGODB_URI to your MongoDB connection string.");
    process.exit(1);
}

app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected with Database!");
    } catch (err) {
        console.error("Failed to connect with Db", err);
        process.exit(1);
    }
};

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`server running on ${PORT}`);
    });
};

startServer();


// app.post("/test", async (req, res) => {
//     const options = {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
//         },
//         body: JSON.stringify({
//             model: "gpt-4o-mini",
//             messages: [{
//                 role: "user",
//                 content: req.body.message
//             }]
//         })
//     };

//     try {
//         const response = await fetch("https://api.openai.com/v1/chat/completions", options);
//         const data = await response.json();
//         //console.log(data.choices[0].message.content); //reply
//         res.send(data.choices[0].message.content);
//     } catch(err) {
//         console.log(err);
//     }
// });

