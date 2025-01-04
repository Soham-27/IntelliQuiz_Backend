import { Router } from "express";
import { generateQuiz } from "../controllers/quiz_generator";
const quizRouter = Router();

quizRouter.post("/generateQuiz", generateQuiz);

export { quizRouter};