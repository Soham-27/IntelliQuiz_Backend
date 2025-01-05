import { Router } from "express";
import { generateQuiz, startQuiz, updateAnswerAndGenerateNextQuestion} from "../controllers/quiz_generator.js";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
const quizRouter = Router();

quizRouter.post("/generateQuiz", generateQuiz);
quizRouter.post("/startquiz",isUserAuthenticated,startQuiz)
quizRouter.patch("/update_generate_next",isUserAuthenticated,updateAnswerAndGenerateNextQuestion)

export { quizRouter};