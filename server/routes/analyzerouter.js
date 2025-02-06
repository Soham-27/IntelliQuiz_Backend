import { Router } from "express";
import { isUserAuthenticated } from "../middleware/user_middleware.js";
import {
  generateAnalytics,
  getQuestionsByTestId,
  getUserAnalytics,
} from "../controllers/analytics_controller.js";

const analyticsRouter = Router();

analyticsRouter.get(
  "/generateAnalytics",
  isUserAuthenticated,
  generateAnalytics
);

analyticsRouter.get("/generateScores", isUserAuthenticated, getUserAnalytics);
analyticsRouter.get("/test/:testId", isUserAuthenticated, getQuestionsByTestId);
export { analyticsRouter };
