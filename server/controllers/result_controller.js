import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const generateResult = async (req, res) => {
  try {
    const { test_id } = req.body;
    const user_id = req.user.id;

    // ✅ Validate input
    if (!test_id) {
      return res.status(400).json({ error: "Test ID not provided!" });
    }

    // ✅ Fetch all test questions attempted by the user
    const testQuestions = await prisma.testQuestion.findMany({
      where: {
        testId: test_id,
        userId: user_id,
        submitStatus: true, // Only consider submitted answers
      },
      select: {
        isCorrect: true,
      },
    });

    if (!testQuestions.length) {
      return res
        .status(400)
        .json({ error: "No submitted answers found for this test." });
    }

    // ✅ Calculate test results.
    const totalQuestions = testQuestions.length;
    const correctAnswers = testQuestions.filter(
      (q) => q.isCorrect === 1
    ).length;
    const percentage = (correctAnswers / totalQuestions) * 100;
    const score = correctAnswers; // You can modify scoring logic if needed

    // ✅ Store test result in the database
    const result = await prisma.testResult.create({
      data: {
        testId: test_id,
        userId: user_id,
        score: score,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        percentage: percentage,
      },
    });

    await prisma.test.update({
      where: {
        id: test_id,
      },
      data: {
        isCompleted: true,
      },
    });

    // ✅ Return the result
    res.status(200).json({
      message: "Test result generated successfully",
      result: result,
    });
  } catch (error) {
    console.error("Error in generating result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
