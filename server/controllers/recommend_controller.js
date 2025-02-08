import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getrecommdations = async (req, res) => {
  try {
    const { user_id } = req.user.id;
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        test: {
          include: {
            Question: {
              select: {
                topic: true,
                subTopic: true,
                Question_type: true,
              },
            },
          },
        },
      },
    });

    // For each test result, we add representative fields from the first question of the test.
    const formattedResults = results.map((result) => {
      // Pick the first question as a representative of test type, topic, and subtopic.
      const representativeQuestion =
        result.test.Question && result.test.Question.length > 0
          ? result.test.Question[0]
          : null;

      return {
        // All fields from TestResult
        id: result.id,
        testId: result.testId,
        userId: result.userId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        percentage: result.percentage,
        createdAt: result.createdAt,

        // Representative test fields from one question
        testType: representativeQuestion
          ? representativeQuestion.Question_type
          : null,
        topic: representativeQuestion ? representativeQuestion.topic : null,
        subTopic: representativeQuestion
          ? representativeQuestion.subTopic
          : null,
      };
    });

    console.log(formattedResults);
  } catch (error) {
    console.error("Error in generating result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
