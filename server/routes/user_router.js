import { Router } from "express";
import {
  createUser,
  loginUser,
  signOutUser,
} from "../controllers/user_controller.js";
import { generateQuiz, startQuiz } from "../controllers/quiz_generator.js";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
const userRouter = Router();
userRouter.post("/register", createUser);
userRouter.post("/login", loginUser);
userRouter.delete("/signout", isUserAuthenticated, signOutUser);
export { userRouter };
