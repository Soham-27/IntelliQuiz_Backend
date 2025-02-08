import { Router } from "express";
import multer from "multer";
import { processPDF } from "../controllers/pdf_controller.js";
import { isUserAuthenticated } from "../middleware/user_middleware.js";

const pdfrouter = Router();

// Configure multer (memory storage)
const storage = multer.memoryStorage(); // Store files in memory instead of disk

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Handle file upload errors properly
pdfrouter.post(
  "/process-pdf",
  isUserAuthenticated, // ✅ This ensures `req.user` is set
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  processPDF
);

export default pdfrouter;
