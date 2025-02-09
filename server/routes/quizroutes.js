import { Router } from "express";
import {
  generateQuiz,
  generateyoutubeQuiz,
  getNextQuestion,
  getNotSubmittedQuestions,
  getNotSubmittedTestsraut,
  reportQuestion,
  startQuiz,
  submitAnswer,
} from "../controllers/quiz_generator.js";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
const quizRouter = Router();

quizRouter.post("/generateQuiz", isUserAuthenticated, generateQuiz);
quizRouter.post("/startquiz", isUserAuthenticated, startQuiz);
quizRouter.get("/nextquestion/", isUserAuthenticated, getNextQuestion);
quizRouter.post("/submit", isUserAuthenticated, submitAnswer);
quizRouter.post(
  "/generateYouTubeQuiz",
  isUserAuthenticated,
  generateyoutubeQuiz
);
quizRouter.get("/getnot", isUserAuthenticated, getNotSubmittedTestsraut);
quizRouter.post(
  "/getQuestionForTestIds",
  isUserAuthenticated,
  getNotSubmittedQuestions
);
quizRouter.put("/report/:q_id", isUserAuthenticated, reportQuestion);
//quizRouter.post("/broadcast", isUserAuthenticated, getBroadcastedQuestion);
export { quizRouter };
