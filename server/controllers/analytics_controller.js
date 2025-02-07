import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const generateAnalytics = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user is populated from auth middleware

    // Fetch test results along with the associated test and its questions
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

    res.json(formattedResults);
  } catch (error) {
    console.error("Error in generating analytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user is populated by authentication middleware

    // 1. Get total quizzes, average percentage, and highest percentage using aggregate
    const aggregateMetrics = await prisma.testResult.aggregate({
      where: { userId },
      _avg: {
        percentage: true, // Changed from score to percentage
      },
      _max: {
        percentage: true,
      },
      _count: {
        id: true,
      },
    });

    // If the user hasn't taken any tests, aggregateMetrics._count.id will be 0.
    // For avgPercentage, Prisma returns null when there are no records.
    const totalQuizzes = aggregateMetrics._count.id || 0;
    const avgPercentage = aggregateMetrics._avg.percentage || 0;
    const highestPercentage = aggregateMetrics._max.percentage || 0;

    // 2. Calculate the start of the current week (assuming Monday as the start)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    // Calculate difference: if it's Sunday (0), go back 6 days; otherwise, subtract (dayOfWeek - 1)
    const diff = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startOfWeek = new Date(now.setDate(diff));
    // Reset hours/minutes/seconds/milliseconds to the start of the day
    startOfWeek.setHours(0, 0, 0, 0);

    // 3. Count the quizzes taken in the current week
    const quizzesThisWeek = await prisma.testResult.count({
      where: {
        userId,
        createdAt: {
          gte: startOfWeek,
        },
      },
    });

    // 4. Format and return the analytics data, ensuring defaults are used when necessary
    const analytics = {
      totalQuizzes,
      avgPercentage,
      highestPercentage,
      quizzesThisWeek,
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error in getUserAnalytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getQuestionsByTestId = async (req, res) => {
  try {
    // Get the test ID from request parameters
    const { testId } = req.params;

    // Fetch all test questions for this test where submitStatus is true,
    // including topic and subTopic along with other question fields.
    const testQuestions = await prisma.testQuestion.findMany({
      where: {
        testId: parseInt(testId, 10),
        submitStatus: true,
      },
      include: {
        question: {
          select: {
            question: true,
            options: true,
            correctOption: true,
            topic: true, // Added topic
            subTopic: true,
            Question_type: true, // Added subTopic
          },
        },
      },
    });
    console.log(testQuestions);
    // Format the result to include the question text, options, correct option, and selected option
    const formattedQuestions = testQuestions.map((tq) => ({
      testQuestionId: tq.id,
      questionId: tq.questionId,
      question: tq.question.question,
      options: tq.question.options,
      topic: tq.question.topic,
      subTopic: tq.question.subTopic,
      correctOption: tq.question.correctOption,
      selectedOption: tq.selectedOption,
      timetaken: tq.timetaken,
      isCorrect: tq.isCorrect,
      questionType: tq.question.Question_type,
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error("Error fetching submitted questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
