/**
 * Black Swan - Sentiment Analysis Service
 *
 * This service analyzes cryptocurrency-related tweets from the last 6 hours
 * every minute to determine overall market sentiment and mood using AI.
 *
 * Author: Muhammad Bilal Motiwala
 * Project: Black Swan
 * Version: 1.0.0
 *
 * Key Features:
 * - Real-time tweet collection from Firestore
 * - AI-powered sentiment analysis using OpenRouter
 * - Automated scheduling with cron jobs
 * - Comprehensive sentiment metrics and insights
 * - RESTful API for manual triggers and data access
 */

// Load environment variables from .env file
require("dotenv").config();

// Core dependencies for Express server and middleware
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

// Firebase Admin SDK for Firestore database access
const admin = require("firebase-admin");

// HTTP client for making API requests to OpenRouter
const axios = require("axios");

// Cron job scheduler for automated analysis
const cron = require("node-cron");

// Custom prompt management system for AI analysis
const SentimentPromptManager = require("./prompts/prompt-config");

/**
 * Firebase Admin SDK Initialization
 *
 * Initializes Firebase Admin SDK using service account credentials
 * to enable secure access to Firestore database for tweet collection
 * and sentiment analysis storage.
 */
try {
  // Load Firebase service account key from local file
  const serviceAccount = require("./serviceAccountKey.json");

  // Initialize Firebase Admin with service account credentials
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ [FIREBASE] Firebase Admin initialized successfully");
} catch (error) {
  console.error("❌ [FIREBASE] Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

// Get Firestore database instance for data operations
const db = admin.firestore();

/**
 * Service Configuration
 *
 * Centralized configuration object containing all service settings,
 * API endpoints, timing intervals, and collection names.
 */
const CONFIG = {
  // Server port (defaults to 8087 if not specified in environment)
  PORT: process.env.PORT || 8087,

  // OpenRouter API key for AI sentiment analysis (required)
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

  // OpenRouter API base URL for making requests
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",

  // How many hours back to look for tweets (6 hours as specified)
  TWEET_LOOKBACK_HOURS: 6,

  // Cron schedule for automated analysis (runs at 58 minutes past every hour)
  // Format: "minute hour day month weekday"
  // "58 * * * *" = Every hour at 58 minutes (00:58, 01:58, 02:58, etc.)
  ANALYSIS_INTERVAL: "58 * * * *",

  // Maximum number of tweets to analyze (null = no limit, process ALL tweets)
  MAX_TWEETS_TO_ANALYZE: null,

  // Firestore collection name for storing sentiment analysis results
  SENTIMENT_COLLECTION: "sentiment_analysis",
};

/**
 * Configuration Validation
 *
 * Ensures all required environment variables are present before starting the service.
 * This prevents runtime errors and provides clear feedback about missing configuration.
 */
if (!CONFIG.OPENROUTER_API_KEY) {
  console.error("❌ [CONFIG] OPENROUTER_API_KEY is required");
  process.exit(1);
}

/**
 * Tweet Collector Class
 *
 * Handles the collection and processing of tweets from Firestore database.
 * This class is responsible for:
 * - Fetching tweets from the last N hours
 * - Separating regular tweets from thread tweets
 * - Formatting tweet data for sentiment analysis
 * - Calculating engagement metrics
 *
 * Adapted from monitoring-service to collect tweets from the last 6 hours.
 */
class TweetCollector {
  /**
   * Collect recent tweets from Firestore database
   *
   * @param {number} lookbackHours - Number of hours to look back for tweets (default: 6)
   * @returns {Object} Object containing arrays of tweets and threads
   */
  async collectRecentTweets(lookbackHours = CONFIG.TWEET_LOOKBACK_HOURS) {
    try {
      // Calculate cutoff time for tweet collection (N hours ago)
      const cutoffTime = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - lookbackHours * 60 * 60 * 1000)
      );

      console.log(
        `📱 [TWEETS] Collecting tweets from last ${lookbackHours} hours...`
      );

      // Query Firestore for tweets collected within the lookback period
      // Orders by collection time (most recent first) for better processing
      const tweetsSnapshot = await db
        .collection("tweet_global")
        .where("collectedAt", ">=", cutoffTime)
        .orderBy("collectedAt", "desc")
        .get();

      // Initialize arrays to store processed tweets and threads
      const tweets = [];
      const threads = [];

      // Process each document from the query results
      tweetsSnapshot.forEach((doc) => {
        const data = doc.data();

        // Determine if this is a thread (multi-part tweet) or regular tweet
        if (data.threadTotalParts && data.threadTotalParts > 1) {
          // This is a thread document - contains combined text from multiple tweets
          threads.push({
            id: data.tweetId || doc.id,
            username: data.username || data.authorHandle,
            combinedText: data.combinedText || data.fullText || data.text,
            totalParts: data.threadTotalParts || data.totalParts || 1,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            collectedAt:
              data.collectedAt?.toDate?.()?.toISOString() || data.collectedAt,
            likes: data.likes || 0,
            retweets: data.retweets || 0,
            hashtags: data.hashtags || [],
            mentions: data.mentions || [],
          });
        } else {
          // This is a regular single tweet
          tweets.push({
            id: data.tweetId || doc.id,
            username: data.username || data.authorHandle,
            text: data.text || data.fullText,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            collectedAt:
              data.collectedAt?.toDate?.()?.toISOString() || data.collectedAt,
            likes: data.likes || 0,
            retweets: data.retweets || 0,
            replies: data.replies || 0,
            quotes: data.quotes || 0,
            views: data.views || 0,
            hashtags: data.hashtags || [],
            mentions: data.mentions || [],
            isThread: data.isThread || false,
            threadId: data.threadId || null,
            threadPosition: data.threadPosition || null,
          });
        }
      });

      console.log(
        `📱 [TWEETS] Collected ${tweets.length} tweets and ${threads.length} threads`
      );

      return { tweets, threads };
    } catch (error) {
      console.error("❌ [TWEETS] Error collecting tweets:", error);
      return { tweets: [], threads: [] };
    }
  }

  /**
   * Format tweets for AI prompt inclusion
   *
   * Processes raw tweet and thread data into a structured format suitable
   * for sentiment analysis prompts. Calculates aggregate engagement metrics
   * to provide context for the AI analysis.
   *
   * @param {Array} tweets - Array of regular tweet objects
   * @param {Array} threads - Array of thread tweet objects
   * @returns {Object} Formatted tweet collection with engagement metrics
   */
  formatTweetsForAnalysis(tweets, threads) {
    // Initialize tweet collection object with metadata
    const tweetCollection = {
      tweets: tweets, // All regular tweets from the lookback period
      threads: threads, // All thread tweets from the lookback period
      totalEngagement: 0, // Total engagement across all tweets
      totalLikes: 0, // Total likes across all tweets
      totalRetweets: 0, // Total retweets across all tweets
    };

    // Calculate engagement metrics for regular tweets
    tweetCollection.tweets.forEach((tweet) => {
      tweetCollection.totalLikes += tweet.likes || 0;
      tweetCollection.totalRetweets += tweet.retweets || 0;
      // Total engagement includes likes, retweets, and replies
      tweetCollection.totalEngagement +=
        (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0);
    });

    // Calculate engagement metrics for thread tweets
    threads.forEach((thread) => {
      tweetCollection.totalLikes += thread.likes || 0;
      tweetCollection.totalRetweets += thread.retweets || 0;
      // Thread engagement includes likes and retweets
      tweetCollection.totalEngagement +=
        (thread.likes || 0) + (thread.retweets || 0);
    });

    return tweetCollection;
  }
}

/**
 * Sentiment Analysis Engine
 *
 * Handles AI-powered sentiment analysis using OpenRouter's API.
 * This class is responsible for:
 * - Building comprehensive prompts from tweet data
 * - Making API calls to OpenRouter for sentiment analysis
 * - Parsing and validating AI responses
 * - Extracting sentiment metrics and insights
 *
 * Uses OpenRouter to analyze tweet sentiment and market mood.
 */
class SentimentAnalysisEngine {
  /**
   * Initialize the sentiment analysis engine
   * Sets up the prompt manager for handling AI prompts
   */
  constructor() {
    this.promptManager = new SentimentPromptManager();
  }

  /**
   * Perform sentiment analysis on tweet data using AI
   *
   * @param {Object} tweetData - Formatted tweet collection with engagement metrics
   * @returns {Object} Sentiment analysis results with overall sentiment and intensity
   */
  async analyzeSentiment(tweetData) {
    try {
      console.log("🧠 [SENTIMENT] Running AI sentiment analysis...");

      // Build the comprehensive prompt from tweet data
      const prompt = this.buildSentimentPrompt(tweetData);

      // Make API request to OpenRouter for sentiment analysis
      const response = await axios.post(
        `${CONFIG.OPENROUTER_BASE_URL}/chat/completions`,
        {
          // Use GPT-4 Mini model for cost-effective analysis
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert cryptocurrency market sentiment analyst specializing in social media sentiment analysis. You analyze tweets and social media posts to determine market sentiment, mood, and emotional indicators that could influence crypto market behavior. Focus on genuine sentiment rather than just keyword analysis.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 10000, // Allow for comprehensive analysis
          temperature: 0.3, // Low temperature for consistent, analytical responses
        },
        {
          headers: {
            Authorization: `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "X-Title": "Crypto Sentiment Analysis - Market Mood Detection",
          },
          timeout: 60000, // 60 second timeout for API requests
        }
      );

      // Extract the AI response content
      const content = response.data.choices[0].message.content.trim();

      // Parse the JSON response from the AI
      let result;
      try {
        // First try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          // Fallback: try to parse the entire content as JSON
          result = JSON.parse(content);
        }
      } catch (parseError) {
        console.error("❌ [SENTIMENT] JSON parsing failed:", parseError);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      // Validate that all required fields are present in the response
      if (
        !result.overall_sentiment ||
        !result.sentiment_intensity ||
        !result.analysis ||
        !result.summary
      ) {
        throw new Error("AI response missing required fields");
      }

      // Ensure timestamp is present for record keeping
      if (!result.createdAt) {
        result.createdAt = new Date().toISOString();
      }

      // Log successful analysis results
      console.log("✅ [SENTIMENT] Sentiment analysis completed successfully");
      console.log(`📊 [RESULT] Overall Sentiment: ${result.overall_sentiment}`);
      console.log(
        `📊 [RESULT] Sentiment Intensity: ${result.sentiment_intensity}`
      );

      return result;
    } catch (error) {
      console.error("❌ [SENTIMENT] Analysis failed:", error);
      throw error;
    }
  }

  /**
   * Build comprehensive sentiment analysis prompt from tweet data
   *
   * Creates a detailed prompt that includes all tweets, threads, and engagement
   * metrics formatted for AI analysis. The prompt provides context and structure
   * for the AI to perform accurate sentiment analysis.
   *
   * @param {Object} tweetData - Formatted tweet collection with engagement metrics
   * @returns {string} Complete prompt ready for AI analysis
   */
  buildSentimentPrompt(tweetData) {
    const { tweets, threads } = tweetData;

    // Format individual tweets for the prompt
    const tweetsSection = tweets
      .map((tweet, index) => {
        return `**Tweet ${index + 1}** (@${tweet.username})
Text: "${tweet.text}"
Engagement: ${tweet.likes || 0} likes, ${tweet.retweets || 0} retweets, ${
          tweet.replies || 0
        } replies
Posted: ${tweet.createdAt}
Hashtags: ${(tweet.hashtags || []).join(", ") || "None"}

---`;
      })
      .join("\n");

    // Format thread tweets for the prompt
    const threadsSection = threads
      .map((thread, index) => {
        return `**Thread ${index + 1}** (@${thread.username})
Combined Text: "${thread.combinedText}"
Parts: ${thread.totalParts}
Engagement: ${thread.likes || 0} likes, ${thread.retweets || 0} retweets
Posted: ${thread.createdAt}
Hashtags: ${(thread.hashtags || []).join(", ") || "None"}

---`;
      })
      .join("\n");

    // Calculate aggregate statistics for context
    const totalEngagement = tweetData.totalEngagement || 0;
    const avgLikes =
      tweets.length > 0 ? Math.round(tweetData.totalLikes / tweets.length) : 0;
    const avgRetweets =
      tweets.length > 0
        ? Math.round(tweetData.totalRetweets / tweets.length)
        : 0;

    // Create summary statistics section
    const tweetCollectionSummary = `
- **Total Tweets**: ${tweets.length}
- **Total Threads**: ${threads.length}
- **Total Engagement**: ${totalEngagement}
- **Average Likes per Tweet**: ${avgLikes}
- **Average Retweets per Tweet**: ${avgRetweets}
- **High Engagement Tweets**: ${
      tweets.filter((t) => (t.likes || 0) > avgLikes * 2).length
    }
`;

    // Prepare template data for prompt generation
    const templateData = {
      timestamp: new Date().toISOString(),
      total_tweets: tweets.length,
      total_threads: threads.length,
      tweet_collection_summary: tweetCollectionSummary,
      tweets_section: tweetsSection || "No tweets available for analysis.",
      threads_section: threadsSection || "No threads available for analysis.",
    };

    // Use prompt manager to generate the final prompt
    return this.promptManager.getFilledPrompt(templateData);
  }
}

/**
 * Firestore Storage Manager
 *
 * Handles all database operations for sentiment analysis results.
 * This class is responsible for:
 * - Saving sentiment analysis results to Firestore
 * - Retrieving historical analysis data
 * - Managing data structure and metadata
 * - Providing query capabilities for analysis history
 *
 * Handles saving sentiment analysis results.
 */
class SentimentStorageManager {
  /**
   * Save sentiment analysis results to Firestore
   *
   * @param {Object} tweetData - Original tweet data used for analysis
   * @param {Object} sentimentResult - AI-generated sentiment analysis results
   * @returns {Object} Save result with analysis ID and metadata
   */
  async saveSentimentAnalysis(tweetData, sentimentResult) {
    try {
      // Create comprehensive analysis document for storage
      const analysisDoc = {
        // Server timestamp for accurate ordering
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysisTime: new Date().toISOString(),

        // Summary of input data used for analysis
        inputData: {
          tweetsAnalyzed: tweetData.tweets.length,
          threadsAnalyzed: tweetData.threads.length,
          totalEngagement: tweetData.totalEngagement,
          lookbackHours: CONFIG.TWEET_LOOKBACK_HOURS,
        },

        // Complete sentiment analysis results from AI
        sentiment: sentimentResult,

        // Service and model metadata for tracking
        serviceVersion: "1.0.0",
        model: "openai/gpt-4o-mini",
        provider: "openrouter",
      };

      // Save to Firestore collection
      const docRef = await db
        .collection(CONFIG.SENTIMENT_COLLECTION)
        .add(analysisDoc);

      console.log(
        `💾 [STORAGE] Sentiment analysis saved with ID: ${docRef.id}`
      );

      // Return summary of saved analysis
      return {
        analysisId: docRef.id,
        timestamp: analysisDoc.analysisTime,
        sentiment: sentimentResult.overall_sentiment,
        sentimentIntensity: sentimentResult.sentiment_intensity,
        createdAt: sentimentResult.createdAt,
      };
    } catch (error) {
      console.error("❌ [STORAGE] Failed to save analysis:", error);
      throw error;
    }
  }

  /**
   * Retrieve recent sentiment analysis results from Firestore
   *
   * @param {number} limit - Maximum number of analyses to retrieve (default: 10)
   * @returns {Array} Array of analysis documents with metadata
   */
  async getRecentAnalysis(limit = 10) {
    try {
      // Query Firestore for recent analyses, ordered by timestamp
      const snapshot = await db
        .collection(CONFIG.SENTIMENT_COLLECTION)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      // Process query results into array format
      const analyses = [];
      snapshot.forEach((doc) => {
        analyses.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return analyses;
    } catch (error) {
      console.error("❌ [STORAGE] Failed to retrieve analyses:", error);
      throw error;
    }
  }
}

/**
 * Main Sentiment Analysis Service
 *
 * Orchestrates the complete sentiment analysis workflow by coordinating
 * tweet collection, AI analysis, and result storage. This is the main
 * service class that handles the end-to-end sentiment analysis process.
 *
 * Key responsibilities:
 * - Coordinate the analysis workflow
 * - Prevent concurrent analysis runs
 * - Handle error management and logging
 * - Provide analysis history access
 */
class SentimentAnalysisService {
  /**
   * Initialize the sentiment analysis service
   * Creates instances of all required components and sets up state tracking
   */
  constructor() {
    this.tweetCollector = new TweetCollector();
    this.sentimentEngine = new SentimentAnalysisEngine();
    this.storageManager = new SentimentStorageManager();
    this.isRunning = false; // Prevents concurrent analysis runs
  }

  /**
   * Perform complete sentiment analysis workflow
   *
   * Executes the full analysis pipeline:
   * 1. Collect recent tweets from Firestore
   * 2. Format tweets for AI analysis
   * 3. Run AI sentiment analysis
   * 4. Save results to Firestore
   *
   * @returns {Object|null} Analysis result or null if no tweets found
   */
  async performSentimentAnalysis() {
    // Prevent concurrent analysis runs to avoid resource conflicts
    if (this.isRunning) {
      console.log("⚠️  [SERVICE] Analysis already running, skipping...");
      return null;
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      console.log("🚀 [SERVICE] Starting sentiment analysis cycle...");

      // Step 1: Collect recent tweets from Firestore
      console.log("📱 [STEP 1] Collecting recent tweets...");
      const tweetData = await this.tweetCollector.collectRecentTweets();

      // Check if we have any tweets to analyze
      if (tweetData.tweets.length === 0 && tweetData.threads.length === 0) {
        console.log("⚠️  [SERVICE] No tweets found for analysis");
        return null;
      }

      // Step 2: Format tweets for AI analysis
      console.log("🔧 [STEP 2] Formatting tweets for analysis...");
      const formattedData = this.tweetCollector.formatTweetsForAnalysis(
        tweetData.tweets,
        tweetData.threads
      );

      // Step 3: Perform AI-powered sentiment analysis
      console.log("🧠 [STEP 3] Analyzing sentiment with AI...");
      const sentimentResult = await this.sentimentEngine.analyzeSentiment(
        formattedData
      );

      // Step 4: Save analysis results to Firestore
      console.log("💾 [STEP 4] Saving analysis results...");
      const saveResult = await this.storageManager.saveSentimentAnalysis(
        formattedData,
        sentimentResult
      );

      // Log completion metrics
      const duration = Date.now() - startTime;
      console.log("✅ [SERVICE] Sentiment analysis completed successfully");
      console.log(`📊 [RESULT] Analysis ID: ${saveResult.analysisId}`);
      console.log(`📊 [RESULT] Overall Sentiment: ${saveResult.sentiment}`);
      console.log(
        `📊 [RESULT] Sentiment Intensity: ${saveResult.sentimentIntensity}`
      );
      console.log(`⏱️  [TIMING] Analysis completed in ${duration}ms`);

      return saveResult;
    } catch (error) {
      console.error("❌ [SERVICE] Sentiment analysis failed:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get historical sentiment analysis results
   *
   * @param {number} limit - Maximum number of analyses to retrieve (default: 10)
   * @returns {Array} Array of historical analysis results
   */
  async getAnalysisHistory(limit = 10) {
    return await this.storageManager.getRecentAnalysis(limit);
  }
}

// Initialize the main sentiment analysis service
const sentimentService = new SentimentAnalysisService();

/**
 * Express Server Setup
 *
 * Configures the REST API server with security middleware,
 * rate limiting, and API routes for sentiment analysis operations.
 */
const app = express();

// Security and performance middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-origin resource sharing
app.use(compression()); // Response compression
app.use(express.json({ limit: "10mb" })); // JSON body parsing with size limit

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Maximum 100 requests per IP per window
});
app.use(limiter);

/**
 * API Routes
 *
 * Defines REST API endpoints for sentiment analysis operations,
 * service status, and historical data access.
 */

// Root endpoint - Service information and available endpoints
app.get("/", (req, res) => {
  res.json({
    service: "Crypto Sentiment Analysis Service",
    version: "1.0.0",
    status: "running",
    description: "AI-powered crypto market sentiment analysis from tweets",
    author: "Muhammad Bilal Motiwala",
    project: "Black Swan",
    endpoints: {
      "/analyze": "POST - Trigger sentiment analysis",
      "/history": "GET - Get recent analysis history",
      "/status": "GET - Service status and metrics",
    },
  });
});

// Manual sentiment analysis trigger endpoint
app.post("/analyze", async (req, res) => {
  try {
    // Trigger the complete sentiment analysis workflow
    const result = await sentimentService.performSentimentAnalysis();

    // Handle case where no tweets were found for analysis
    if (!result) {
      return res.json({
        success: true,
        message: "No tweets found or analysis skipped",
        result: null,
      });
    }

    // Return successful analysis results
    res.json({
      success: true,
      message: "Sentiment analysis completed successfully",
      result,
    });
  } catch (error) {
    console.error("❌ [API] Analysis request failed:", error);
    res.status(500).json({
      success: false,
      message: "Analysis failed",
      error: error.message,
    });
  }
});

// Historical analysis data endpoint
app.get("/history", async (req, res) => {
  try {
    // Parse limit from query parameters (default: 10)
    const limit = parseInt(req.query.limit) || 10;
    const history = await sentimentService.getAnalysisHistory(limit);

    res.json({
      success: true,
      count: history.length,
      analyses: history,
    });
  } catch (error) {
    console.error("❌ [API] History request failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve history",
      error: error.message,
    });
  }
});

// Service status and configuration endpoint
app.get("/status", (req, res) => {
  res.json({
    service: "Crypto Sentiment Analysis Service",
    status: "operational",
    isRunning: sentimentService.isRunning,
    configuration: {
      lookbackHours: CONFIG.TWEET_LOOKBACK_HOURS,
      maxTweets: "No limit - process ALL tweets from 6 hours",
      analysisInterval: CONFIG.ANALYSIS_INTERVAL,
      frequency: "Every hour at 58 minutes",
    },
    uptime: process.uptime(),
  });
});

/**
 * Automated Analysis Scheduling
 *
 * Sets up a cron job to automatically run sentiment analysis
 * at regular intervals (every hour at 58 minutes).
 */
console.log(`⏰ [CRON] Scheduling sentiment analysis every hour at 58 minutes`);
cron.schedule(CONFIG.ANALYSIS_INTERVAL, async () => {
  console.log("⏰ [CRON] Triggered scheduled sentiment analysis");
  try {
    await sentimentService.performSentimentAnalysis();
  } catch (error) {
    console.error("❌ [CRON] Scheduled analysis failed:", error);
  }
});

/**
 * Server Startup
 *
 * Starts the Express server and logs configuration information.
 */
const server = app.listen(CONFIG.PORT, () => {
  console.log("🚀 [SERVER] Crypto Sentiment Analysis Service started");
  console.log(`📍 [SERVER] Running on port ${CONFIG.PORT}`);
  console.log(`⏰ [CONFIG] Analysis every hour at 58 minutes`);
  console.log(
    `📊 [CONFIG] Analyzing last ${CONFIG.TWEET_LOOKBACK_HOURS} hours of tweets`
  );
  console.log(`🔧 [CONFIG] Processing ALL tweets from 6 hours (no limit)`);
});

/**
 * Graceful Shutdown Handling
 *
 * Ensures the server shuts down cleanly when receiving termination signals.
 * This prevents data corruption and allows for proper cleanup.
 */
process.on("SIGINT", () => {
  console.log("🛑 [SERVER] Received SIGINT, shutting down gracefully");
  server.close(() => {
    console.log("✅ [SERVER] Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 [SERVER] Received SIGTERM, shutting down gracefully");
  server.close(() => {
    console.log("✅ [SERVER] Server closed");
    process.exit(0);
  });
});

// Export service and app for testing and external use
module.exports = { sentimentService, app };
