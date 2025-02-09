import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import axios from "axios";

const prisma = new PrismaClient();
const YOUTUBE_API_KEY = "AIzaSyA1Mv_KvParabXhO_ZhWFxcirK5oeKUsEk";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const groq = new Groq({
  apiKey: "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",
});

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

    // Return an array of formatted strings instead of markdown links
    return response.data.items.map(
      (video) => `https://www.youtube.com/watch?v=${video.id.videoId}`
    );
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return ["No videos found"];
  }
}

async function analyzeTest(data) {
  const weakTopics = data
    .filter((test) => test.percentage < 50)
    .map((test) => `${test.topic} - ${test.subTopic}`);

  // Create an object to store YouTube links for each topic
  const youtubeResources = [];
  for (const topic of weakTopics) {
    const links = await fetchYouTubeVideos(topic);
    youtubeResources.push({
      topic: topic,
      links: links,
    });
  }

  console.log(youtubeResources);

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
        YouTube resources: ${JSON.stringify(youtubeResources)}\n\n
        Generate analysis based on given Test data and provide following as follows:
        1. Generate 2-3 strengths and weaknesses (don't refer to the scores)
        2. Provide study resources for each topic
        3. Generate weekly plan from Monday to Sunday
        4. All data should be accurate
        
        Format the response as a valid JSON object with this exact structure:
        {
          "strength": ["strength1", "strength2", "strength3"],
          "weak_area": ["weakness1", "weakness2", "weakness3"],
          "study_resources": [
            {
              "topic": "topic name",
              "resources": ["resource1", "resource2"]
            }
          ],
          "youtube_resources": ${youtubeResources},
          "weekly_plan": [
            {
              "day": "Monday",
              "tasks": ["task1", "task2"]
            }
          ]
        }
        
        Return ONLY the JSON object with no additional text or formatting.`,
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

    const formattedResults = results.map((result) => {
      const representativeQuestion =
        result.test.Question && result.test.Question.length > 0
          ? result.test.Question[0]
          : null;

      return {
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        percentage: result.percentage,
        createdAt: result.createdAt,
        testType: representativeQuestion?.Question_type || null,
        topic: representativeQuestion?.topic || null,
        subTopic: representativeQuestion?.subTopic || null,
      };
    });

    const analysis = await analyzeTest(formattedResults);

    // Parse and validate the JSON before sending
    const parsedAnalysis = JSON.parse(analysis);
    res.json(parsedAnalysis);
  } catch (error) {
    console.error("Error in generating result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
