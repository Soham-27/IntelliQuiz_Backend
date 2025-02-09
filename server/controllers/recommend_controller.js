import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import axios from "axios";

const prisma = new PrismaClient();
const YOUTUBE_API_KEY = "AIzaSyClC8b-vqfWqncF60PpBTNSBe-QX0o-Vd0";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const groq = new Groq({
  apiKey: "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",
});
function cleanStudyData(data) {
  function formatTopic(topic) {
    return topic
      .split(" - ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" - ");
  }

  return JSON.stringify(
    {
      strength: (data.strength || []).map(formatTopic),
      weak_area: (data["weak area"] || []).map(formatTopic),
      study_resources: (data["study resources"] || []).map((item) => ({
        topic: formatTopic(item.topic),
        resources: item.resources || [],
      })),
      weak_plan: data.weak_plan || [],
    },
    null,
    2
  );
}

async function fetchYouTubeVideos(query) {
  try {
    const response = await axios.get(YOUTUBE_SEARCH_URL, {
      params: {
        key: YOUTUBE_API_KEY,
        q: `${query} tutorial`,
        part: "snippet",
        maxResults: 3,
        type: "video",
      },
    });

    return response.data.items.map(
      (video) =>
        `- [${video.snippet.title}](https://www.youtube.com/watch?v=${video.id.videoId})`
    );
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return ["- No videos found."];
  }
}

async function analyzeTest(data) {
  const weakTopics = data
    .filter((test) => test.percentage < 50)
    .map((test) => `${test.topic} - ${test.subTopic}`);

  const youtubeLinks = {};
  for (const topic of weakTopics) {
    youtubeLinks[topic] = await fetchYouTubeVideos(topic);
  }

  const formattedLinks = Object.entries(youtubeLinks)
    .map(([topic, links]) => `**${topic}**:\n${links.join("\n")}`)
    .join("\n\n");

  const completion = await groq.chat.completions.create({
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You are a personalized AI tutor. Analyze the user's test results and generate analysis for user`,
      },
      {
        role: "user",
        content: `Test data: ${JSON.stringify(data, null, 2)}\n\n
        YouTube links: ${formattedLinks}
        generate analysis based on given Test data and provide followiing as follows
        1.genrate 2-3 strengths and weakneses dont refer tto the scores
        2.provide study resources for each topic also provide you tube links
        3.provide you tube like which provided above
        4.generate weekly plan like from monday to sunday for each day
        5.all data that you generate should be correct
        

        Format the response as a valid JSON array with this exact structure:
        "{
            "strength":["strengths be here"],
            "weak area":["weak areas here"],
            "study resources":[
            {
                "topic":"topic resources",
            }
            ]
            "weak_plan::[
            {
              "day":"like monday",
              "to do":"tasks for learning"
            }]
        } "
        Return ONLY the JSON object with no additional text or formatting.
        `,
      },
    ],
    model: "llama-3.3-70b-versatile",
  });

  return completion.choices[0]?.message?.content || "No analysis available.";
}
export const getrecommdations = async (req, res) => {
  try {
    const { userId } = req.user.id;
    const results = await prisma.testResult.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      take: 2,
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
        // All fields from TestResultx`
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
    const analysis = await analyzeTest(formattedResults);
    console.log(analysis);
    res.json(JSON.parse(analysis));
  } catch (error) {
    console.error("Error in generating result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
