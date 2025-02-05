import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export const generateQuiz = async (req, res) => {
  try {
    console.log("hitting");
    console.log(req.user.id);
    const { topic, subTopic, numberOfQuestions } = req.body;

    const response = await axios.post(
      "http://127.0.0.1:8000/generate-quiz",
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

    // ✅ Fetch the correct answer for the given question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { correctOption: true },
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

    // ✅ Respond with 1 for correct answer, 0 for incorrect
    res.status(200).json({ result: isCorrect });
  } catch (error) {
    console.error("Error in submitting answer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getNextQuestion = async (req, res) => {
  try {
    // console.log(req);
    const { difficulty, isCorrect, time_taken, testId } = req.query;
    const userId = req.user.id; // Get the user ID from authentication middleware // Get topic & subTopic from request body
    console.log(difficulty);
    console.log(isCorrect);
    console.log(time_taken);
    console.log(testId);

    // ✅ Step 1: Call FastAPI to get the   next difficulty level
    const fastApiResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      {
        Current: parseInt(difficulty),
        Time_Taken: parseFloat(time_taken),
        Score: parseInt(isCorrect),
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log(fastApiResponse.data.next);
    const next_diffculty = fastApiResponse.data.next;
    const question = await prisma.question.findFirst({
      where: {
        testId: parseInt(testId),
      },
    });

    const topic = question.topic;
    const sub_topic = question.subTopic;
    // // ✅ Step 2: Fetch the next question from the data
    let nextQuestion = await prisma.question.findFirst({
      where: {
        topic: topic,
        subTopic: sub_topic,
        difficulty: next_diffculty,
        // Exclude questions that have already been asked in TestQuestion for this user & test
        NOT: {
          testQuestions: {
            some: {
              testId: parseInt(testId),
            },
          },
        },
      },
      orderBy: { id: "asc" }, // You can modify ordering as needed
    });

    if (!nextQuestion) {
      const response = await axios.post(
        "http://127.0.0.1:8000/generate-question",
        { topic: topic, sub_topic: sub_topic, difficulty: next_diffculty },
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
          Question_type: "custom",
          testId: parseInt(testId),
        },
      });

      console.log("New question stored in DB:", nextQuestion);
    }

    await prisma.testQuestion.create({
      data: {
        testId: parseInt(testId),
        userId: userId,
        questionId: nextQuestion.id,
      },
    });

    res.status(200).json({
      message: "next question here it is !!",
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
