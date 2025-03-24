import axios from "axios";
import FormData from "form-data";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const processPDF = async (req, res) => {
  try {
    // Validate request
    console.log("User object:", req.user);
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized: User ID not found" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }
    if (!req.body.topics || !req.body.num_questions) {
      return res.status(400).json({
        success: false,
        error: "Topics and number of questions are required",
      });
    }

    console.log("Processing file:", req.file.originalname);

    // Create form data for FastAPI
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype, // FIX: Set content type
    });
    formData.append("topics", req.body.topics);
    formData.append("num_questions", req.body.num_questions);
    console.log(req.body.topics);
    console.log(req.body.num_questions);

    // Make request to FastAPI
    const response = await axios.post(
      `${process.env.FAST_API}/process_and_generate/`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    console.log(userId);
    console.log(response.data.questions);
    const test = await prisma.test.create({
      data: { userId },
    });
    const test_id = test.id;
    console.log(test_id);
    console.log("test is generated", test.id);
    for (const q of response.data.questions) {
      const cleanTopic = q.topic.replace(/[\[\]"]/g, "");
      await prisma.question.create({
        data: {
          question: q.question,
          options: q.options,
          correctOption: q.correctIndex,
          topic: cleanTopic,
          difficulty: q.difficulty,
          testId: test_id,
          Question_type: "pdf",
          explanation: q.explanation,
        },
      });
      console.log("Question to database");
      console.log(q);
    }
    const questions = await prisma.question.findMany({
      where: {
        testId: test.id,
        Question_type: "pdf",
      },
    });
    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error in processPDF:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process PDF",
      details: error.response?.data || error.message,
    });
  }
};
