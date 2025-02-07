import { Router } from "express";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
import { generateResult } from "../controllers/result_controller.js";

const resultRouter = Router();

resultRouter.post("/test", isUserAuthenticated, generateResult);

export { resultRouter };
