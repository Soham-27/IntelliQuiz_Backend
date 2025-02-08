import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export const generateQuiz = async (req, res) => {
  try {
    console.log("hitting");
    console.log(req.user.id);
    const { topic, subTopic, numberOfQuestions } = req.body;

    const response = await axios.post(
      `${process.env.FAST_API}/generate-quiz`,
      { topic, sub_topic: subTopic, num_questions: numberOfQuestions },
      { headers: { "Content-Type": "application/json" } }
    );
    const userId = req.user.id;
    console.log(response.data.questions);
    const test = await prisma.test.create({
      data: { userId },
    });
    console.log("test is generated", test.id);
    for (const q of response.data.questions) {
      await prisma.question.create({
        data: {
          question: q.question,
          options: q.options,
          correctOption: q.correctIndex,
          topic: topic,
          subTopic: subTopic,
          difficulty: q.difficulty,
          testId: test.id,
          Question_type: "custom",
          explanation: q.explanation,
        },
      });
      console.log("Question to database");
    }

    const questions = await prisma.question.findMany({
      where: {
        testId: test.id,
        Question_type: "custom",
      },
    });
    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error in generating quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const generateyoutubeQuiz = async (req, res) => {
  try {
    const { youtube_url, numberOfQuestions } = req.body;
    console.log(youtube_url);
    console.log(numberOfQuestions);
    const user_id = req.user.id;
    const response = await axios.post(
      `${process.env.FAST_API}/process-youtube`,
      { video_url: youtube_url, num_questions: parseInt(numberOfQuestions) },
      { headers: { "Content-Type": "application/json" } }
    );
    console.log(response.data);
    const test = await prisma.test.create({
      data: { userId: user_id },
    });
    console.log("test is generated", test.id);
    for (const q of response.data.question) {
      await prisma.question.create({
        data: {
          question: q.question,
          options: q.options,
          correctOption: q.correctIndex,
          topic: q.topic,
          difficulty: q.difficulty,
          testId: test.id,
          Question_type: "youtube",
        },
      });
      console.log("Question to database");
    }
    const questions = await prisma.question.findMany({
      where: {
        testId: test.id,
        Question_type: "youtube",
      },
    });
    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error in generating quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const startQuiz = async (req, res) => {
  try {
    const { test_id, difficulty } = req.body;
    const userId = req.user.id; // Fixed variable name

    // ✅ Find a question matching criteria
    const question = await prisma.question.findFirst({
      where: { testId: test_id, difficulty: difficulty },
      orderBy: { id: "asc" },
    });
    console.log(question);
    if (!question) {
      return res
        .status(404)
        .json({ error: "No question available for the specified criteria" });
    }

    // ✅ Ensure `userId` is included when creating a `TestQuestion`
    await prisma.testQuestion.create({
      data: {
        testId: test_id,
        questionId: question.id,
        userId: userId, // Required as per your model
      },
    });

    console.log("Question added to test");

    res.status(200).json({ testId: test_id, questions: [question] });
  } catch (error) {
    console.error("Error in starting quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { testId, questionId, selectedOption, time_taken } = req.body;

    // ✅ Check for missing required fields
    if (!testId || !questionId || selectedOption === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Fetch the correct answer and explanation for the given question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { correctOption: true, explanation: true },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // ✅ Determine if the answer is correct (1) or incorrect (0)
    const isCorrect = selectedOption === question.correctOption ? 1 : 0;

    // ✅ Find the TestQuestion entry
    const testQuestion = await prisma.testQuestion.findFirst({
      where: {
        testId: testId,
        questionId: questionId,
      },
      select: { id: true }, // Get the unique ID
    });

    if (!testQuestion) {
      return res.status(404).json({ error: "Test question not found" });
    }

    // ✅ Update the TestQuestion entry using the unique ID
    await prisma.testQuestion.update({
      where: { id: testQuestion.id }, // Use the unique ID here
      data: {
        selectedOption: selectedOption,
        isCorrect: isCorrect,
        timetaken: time_taken,
        submitStatus: true,
      },
    });

    console.log(`Answer submitted. Correct: ${isCorrect}`);

    // ✅ Respond with result and explanation
    res
      .status(200)
      .json({ result: isCorrect, explanation: question.explanation });
  } catch (error) {
    console.error("Error in submitting answer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getNextQuestion = async (req, res) => {
  try {
    // Extract query parameters and userId
    const { difficulty, isCorrect, time_taken, testId } = req.query;
    const userId = req.user.id; // from authentication middleware

    // Step 0: Retrieve a representative question for the test to know its type, topic, and subTopic.
    const initialQuestion = await prisma.question.findFirst({
      where: { testId: parseInt(testId, 10) },
    });

    if (!initialQuestion) {
      return res
        .status(404)
        .json({ error: "No questions found for this test" });
    }

    const questionType = initialQuestion.Question_type; // e.g., "custom" or "other"
    const topic = initialQuestion.topic;
    const sub_topic = initialQuestion.subTopic;

    let nextQuestion;
    console.log(questionType);
    if (questionType === "custom") {
      // -------------------------------
      console.log(questionType);
      // Custom test: Use the predictive API
      // -------------------------------
      // Step 1: Call FastAPI to get the next difficulty level.
      const fastApiResponse = await axios.post(
        `${process.env.FAST_API}/predict`,
        {
          Current: parseInt(difficulty, 10),
          Time_Taken: parseFloat(time_taken),
          Score: parseInt(isCorrect, 10),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const next_difficulty = fastApiResponse.data.next;
      console.log("Next difficulty from FastAPI:", next_difficulty);

      // Step 2: Try to fetch the next question matching the predicted difficulty, topic, and subTopic,
      // and exclude questions that have already been asked in this test.
      nextQuestion = await prisma.question.findFirst({
        where: {
          topic: topic,
          subTopic: sub_topic,
          difficulty: next_difficulty,
          NOT: {
            testQuestions: {
              some: {
                testId: parseInt(testId, 10),
              },
            },
          },
        },
        orderBy: { id: "asc" },
      });

      // If no question is found, call the FastAPI endpoint to generate a new question.
      if (!nextQuestion) {
        const response = await axios.post(
          `${process.env.FAST_API}/generate-question`,
          { topic: topic, sub_topic: sub_topic, difficulty: next_difficulty },
          { headers: { "Content-Type": "application/json" } }
        );

        const newQuestionData = response.data.question;
        console.log("Generated Question:", newQuestionData);

        nextQuestion = await prisma.question.create({
          data: {
            question: newQuestionData.question,
            options: newQuestionData.options,
            correctOption: newQuestionData.correctIndex,
            topic: topic,
            subTopic: sub_topic,
            difficulty: newQuestionData.difficulty,
            Question_type: "custom", // mark it as custom
            testId: parseInt(testId, 10),
          },
        });

        console.log("New question stored in DB:", nextQuestion);
      }
    } else {
      // -------------------------------
      // Non-custom test: Get a random question (without difficulty logic)
      // -------------------------------
      // Retrieve all questions for this test that haven't been used yet.
      const availableQuestions = await prisma.question.findMany({
        where: {
          testId: parseInt(testId, 10),
          NOT: {
            testQuestions: {
              some: { testId: parseInt(testId, 10) },
            },
          },
        },
      });

      if (availableQuestions.length === 0) {
        return res.status(404).json({ error: "No more questions available" });
      }

      // Pick a random question from the available pool.
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      nextQuestion = availableQuestions[randomIndex];
    }

    // Save the next question as a record in TestQuestion.
    await prisma.testQuestion.create({
      data: {
        testId: parseInt(testId, 10),
        userId: userId,
        questionId: nextQuestion.id,
      },
    });

    res.status(200).json({
      message: "Next question retrieved successfully",
      test_id: testId,
      newQuestion: nextQuestion,
    });
  } catch (error) {
    console.error("Error in getting next question:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

function generateNextDifficulty(currentDifficulty, isCorrect) {
  return isCorrect
    ? Math.min(currentDifficulty + 1, 5)
    : Math.max(currentDiffciculty - 1, 1);
}
