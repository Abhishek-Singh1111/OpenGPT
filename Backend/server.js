import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI;
// Add this line temporarily to see what Render is actually seeing
console.log("Checking URI:", MONGODB_URI ? "Found" : "Not Found");
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
    app.listen(PORT,'0.0.0.0', () => {
        console.log(`server running on ${PORT}`);
    });
};

startServer();


