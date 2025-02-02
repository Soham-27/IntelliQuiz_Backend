import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export const generateQuiz = async (req, res) => {
    try {
        console.log("hitting");
        const { topic, subTopic, numberOfQuestions } = req.body;

        const response = await axios.post(
            'https://intelliquiz-genai.onrender.com/generate-quiz',
            { topic, sub_topic: subTopic, num_questions: numberOfQuestions },
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log(response.data.questions);
        res.status(200).json(response.data);

        await prisma.question.createMany({
            data: response.data.questions.map(q => ({
                question: q.question,
                options: q.options,
                correctOption: q.correctIndex,
                topic,
                subTopic,
                difficulty: q.difficulty
            }))
        });

        console.log("Questions added to database");
    } catch (error) {
        console.error("Error in generating quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const startQuiz = async (req, res) => {
    try {
        const { topic, subTopic, difficulty } = req.body;

        const test = await prisma.test.create({
            data: { userId: req.user.id }
        });

        console.log("Test ID:", test.test_id);

        const question = await prisma.question.findFirst({
            where: { topic, subTopic, difficulty },
            orderBy: { id: "asc" }
        });

        if (!question) {
            return res.status(404).json({ error: "No question available for the specified criteria" });
        }

        await prisma.testQuestion.create({
            data: { testId: test.test_id, questionId: question.id }
        });

        console.log("Question added to test");

        res.status(200).json({ testId: test.test_id, questions: [question] });
    } catch (error) {
        console.error("Error in starting quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateAnswerAndGenerateNextQuestion = async (req, res) => {
    try {
        const { testId, questionId, selectedOption } = req.body;
        if (!testId || !questionId || selectedOption === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await prisma.testQuestion.updateMany({
            where: { testId, questionId },
            data: { selectedOption, submitStatus: true }
        });

        const question = await prisma.question.findUnique({ where: { id: questionId } });
        if (!question) return res.status(404).json({ error: "Question not found" });

        const isCorrect = selectedOption === question.correctOption ? 1 : 0;

        await prisma.testQuestion.updateMany({
            where: { testId, questionId },
            data: { isCorrect }
        });

        const nextDifficulty = generateNextDifficulty(question.difficulty, isCorrect);

        let newQuestion = await prisma.question.findFirst({
            where: { topic: question.topic, subTopic: question.subTopic, difficulty: nextDifficulty },
            orderBy: { id: "asc" }
        });

        if (!newQuestion) {
            const response = await axios.post(
                'https://intelliquiz-genai.onrender.com/generate-question',
                { topic: question.topic, sub_topic: question.subTopic, difficulty: nextDifficulty },
                { headers: { 'Content-Type': 'application/json' } }
            );

            newQuestion = await prisma.question.create({
                data: {
                    question: response.data.question.question,
                    options: response.data.question.options,
                    correctOption: response.data.question.correctIndex,
                    topic: question.topic,
                    subTopic: question.subTopic,
                    difficulty: response.data.question.difficulty
                }
            });
        }

        await prisma.testQuestion.create({
            data: { testId, questionId: newQuestion.id }
        });

        res.status(200).json({
            message: isCorrect ? "1" : "0",
            testId,
            newQuestion
        });
    } catch (error) {
        console.error("Error in updating answer and generating next question:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

function generateNextDifficulty(currentDifficulty, isCorrect) {
    return isCorrect ? Math.min(currentDifficulty + 1, 5) : Math.max(currentDifficulty - 1, 1);
}
