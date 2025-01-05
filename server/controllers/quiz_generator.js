import { client } from "../models/db.js";
import axios from "axios";


export const generateQuiz = async (req, res) => {
    try {
        const { topic, subTopic, numberOfQuestions } = req.body;

        // Ensure the API URL is correct
        const response = await axios.post(
            'https://intelliquiz-genai.onrender.com/generate-quiz',  // Fix typo here
            { topic: topic, sub_topic: subTopic, num_questions: numberOfQuestions },
            {
                headers: {
                    'Content-Type': 'application/json',  // Ensure the correct content type
                }
            }
        );

        console.log(response.data.questions);
        res.status(200).json(response.data); // Return the response data as JSON

        for (let i = 0; i < response.data.questions.length; i++) {
            const question = response.data.questions[i];
            const query = "INSERT INTO Question (question, options, correctOption, topic, subTopic,difficulty) VALUES ($1, $2, $3, $4, $5, $6)";
            const params = [question.question,question.options, question.correctIndex, topic, subTopic,question.difficulty];
            await client.query(query, params);
            console.log("Question added to database");
        }
    } catch (error) {
        console.log("Error in generating quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const startQuiz = async (req, res) => {
    try {
        // Adding new test for the user
        const { topic, subTopic, difficulty } = req.body;
        console.log(req.user);

        // Create a new test
        const query = "INSERT INTO test (userId) VALUES ($1) RETURNING test_id";
        const params = [req.user.id];
        const result = await client.query(query, params);
        const testId = result.rows[0].test_id;
        console.log("Test ID:", testId);

        // Fetch a random question
        const questionQuery = `
            SELECT * 
            FROM question 
            WHERE topic=$1 AND subTopic=$2 AND difficulty=$3 
            ORDER BY RANDOM() 
            LIMIT 1
        `;
        const questionParams = [topic, subTopic, difficulty];
        const questionResult = await client.query(questionQuery, questionParams);

        if (questionResult.rows.length === 0) {
            return res.status(404).json({ error: "No question available for the specified criteria" });
        }

        const question = questionResult.rows[0];
        console.log("Fetched Question:", question);

        // Associate the question with the test
        const testQuestionQuery = "INSERT INTO testquestion (testId, questionId) VALUES ($1, $2)";
        const testQuestionParams = [testId, question.id];
        await client.query(testQuestionQuery, testQuestionParams);
        console.log("Question added to test");

        // Fetch the added question details from testquestion and question tables
        const fetchQuestionQuery = `
            SELECT tq.testId, q.*
            FROM testquestion tq
            JOIN question q ON tq.questionId = q.id
            WHERE tq.testId = $1
        `;
        const fetchQuestionParams = [testId];
        const addedQuestionResult = await client.query(fetchQuestionQuery, fetchQuestionParams);

        // Send the test ID and fetched question(s) back to the client
        res.status(200).json({ testId, questions: addedQuestionResult.rows });

    } catch (error) {
        console.error("Error in starting quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};





export const updateAnswerAndGenerateNextQuestion = async (req, res) => {
    try {
        const { testId, questionId, selectedOption } = req.body;

        if (!testId || !questionId || selectedOption === undefined) {
            return res.status(400).json({ error: "Missing required fields: testId, questionId, or selectedOption" });
        }

        // Store the selected option in the TestQuestion table
        const updateQuery = `
            UPDATE TestQuestion
            SET selectedOption = $1, submitStatus = TRUE
            WHERE testId = $2 AND questionId = $3
        `;
        const updateParams = [selectedOption, testId, questionId];
        await client.query(updateQuery, updateParams);
        console.log("Selected option updated in TestQuestion");

        // Fetch the correct option for the question
        const correctOptionQuery = "SELECT * FROM Question WHERE id = $1";
        const correctOptionParams = [questionId];
        const questionResult = await client.query(correctOptionQuery, correctOptionParams);

        if (questionResult.rows.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        const correctOption = questionResult.rows[0].correctoption;
        const isCorrect = selectedOption === correctOption ? 1 : 0;
        const resultMessage = isCorrect ? "Your answer is correct!" : "Your answer is incorrect.";
        console.log(resultMessage);

        // Update the isCorrect field in TestQuestion
        const correctnessUpdateQuery = `
            UPDATE TestQuestion
            SET isCorrect = $1
            WHERE testId = $2 AND questionId = $3
        `;
        const correctnessUpdateParams = [isCorrect, testId, questionId];
        await client.query(correctnessUpdateQuery, correctnessUpdateParams);
        console.log("Correctness updated in TestQuestion");

        // Determine next difficulty
        const currentDifficulty = questionResult.rows[0].difficulty;
        const nextDifficulty = generateNextDifficulty(currentDifficulty, isCorrect);
        console.log(`Next Difficulty: ${nextDifficulty}`);

        // Fetch a new question with the same topic, subtopic, and given difficulty
        let newQuestionResult = await client.query(
            `
            SELECT * 
            FROM Question 
            WHERE topic = $1 AND subTopic = $2 AND difficulty = $3 
            ORDER BY RANDOM() 
            LIMIT 1
            `,
            [questionResult.rows[0].topic, questionResult.rows[0].subtopic, nextDifficulty]
        );

        if (newQuestionResult.rows.length === 0) {
            // Generate question via API if none found
            const response = await axios.post(
                'https://intelliquiz-genai.onrender.com/generate-question',
                {
                    topic: questionResult.rows[0].topic,
                    sub_topic: questionResult.rows[0].subtopic,
                    difficulty: nextDifficulty,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const generatedQuestion = response.data.question;

            // Insert the generated question into the database
            const insertQuestionQuery = `
                INSERT INTO Question (question, options, correctOption, topic, subTopic, difficulty)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const insertQuestionParams = [
                generatedQuestion.question,
                generatedQuestion.options,
                generatedQuestion.correctIndex,
                questionResult.rows[0].topic,
                questionResult.rows[0].subtopic,
                generatedQuestion.difficulty,
            ];
            const insertedQuestionResult = await client.query(insertQuestionQuery, insertQuestionParams);

            newQuestionResult = { rows: [insertedQuestionResult.rows[0]] };
            console.log("Generated question added to the database");
        }

        const newQuestion = newQuestionResult.rows[0];

        // Add the new question to the TestQuestion table
        const addTestQuestionQuery = `
            INSERT INTO TestQuestion (testId, questionId)
            VALUES ($1, $2)
        `;
        const addTestQuestionParams = [testId, newQuestion.id];
        await client.query(addTestQuestionQuery, addTestQuestionParams);

        console.log("New question added to TestQuestion");

        // Send the response back to the client
        res.status(200).json({
            message: resultMessage,
            testId,
            newQuestion,
        });
    } catch (error) {
        console.error("Error in updating answer and generating next question:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};




function generateNextDifficulty(currentDifficulty, isCorrect) {
    // Simulated logic for ML model behavior
    if (isCorrect) {
        return Math.min(currentDifficulty + 1, 5); // Increase difficulty, max level 5
    } else {
        return Math.max(currentDifficulty - 1, 1); // Decrease difficulty, min level 1
    }
}