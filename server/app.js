import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { userRouter } from "./routes/user_router.js";
import { quizRouter } from "./routes/quizroutes.js";
import { connectToDatabase } from "./models/db.js";
import cors from "cors";
import cron from "node-cron";

// Load environment variables
dotenv.config("./.env");

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware should be one of the first middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Other middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/user", userRouter);
app.use("/hello/quiz", quizRouter);

// Basic route
app.get("/", (req, res) => {
  res.json("Hello from the server!");
});

// Cron job
cron.schedule("* * * * *", () => {
  console.log("cron job is running ");
});

// Connect to database and start server
connectToDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
