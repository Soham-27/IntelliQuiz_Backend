import { Router } from "express";
import {
  generateQuiz,
  getNextQuestion,
  startQuiz,
  submitAnswer,
} from "../controllers/quiz_generator.js";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
const quizRouter = Router();

quizRouter.post("/generateQuiz", isUserAuthenticated, generateQuiz);
quizRouter.post("/startquiz", isUserAuthenticated, startQuiz);
quizRouter.get("/nextquestion/", isUserAuthenticated, getNextQuestion);
quizRouter.post("/submit", isUserAuthenticated, submitAnswer);

export { quizRouter };
