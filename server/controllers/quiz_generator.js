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


export const startQuiz=async(req,res)=>{
    try {

        // adding new test for user
        const {topic,subTopic,difficulty}=req.body;
        console.log(req.user);       
        //generate first question for the test

        const query = "INSERT INTO test (userId) VALUES ($1) RETURNING test_id";
        const params = [req.user.id];
        const result = await client.query(query, params);
        const testId = result.rows[0].test_id;
        console.log(testId);

        const questionQuery = "SELECT * FROM question WHERE topic=$1 AND subTopic=$2 AND difficulty=$3 ORDER BY RANDOM() LIMIT 1";
        const questionParams = [topic, subTopic, difficulty];
        const questionResult = await client.query(questionQuery, questionParams);
        const question = questionResult.rows[0];
        console.log(question);

        const testQuestionQuery = "INSERT INTO testquestion (testId, questionId) VALUES ($1, $2)";
        const testQuestionParams = [testId, question.id];
        await client.query(testQuestionQuery, testQuestionParams);
        console.log("Question added to test");

    } catch (error) {
        console.log("Error in starting quiz:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


