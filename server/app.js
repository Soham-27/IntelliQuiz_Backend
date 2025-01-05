import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { userRouter } from "./routes/user_router.js";
import { quizRouter } from "./routes/quizroutes.js";
import { connectToDatabase } from "./models/db.js"; // Import the connection function
import cors from 'cors';
import cron from "node-cron"; 

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware for parsing requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use user routes
app.use('/user', userRouter); 
app.use('/hello/quiz', quizRouter);

// Basic route
app.get("/", (req, res) => {
    res.json("Hello from the server!");
});


const corsOptions = {
    origin: [
        "http://localhost:3000",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

cron.schedule('* * * * *', () => {
    // This runs your cron job function every hour starting from 10:30 PM IST
    console.log("cron job is running ")
});
// Connect to the database before starting the server
connectToDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});
