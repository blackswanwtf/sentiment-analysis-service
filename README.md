# Black Swan - Sentiment Analysis Service

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/sentiment-analysis-service)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**Author:** Muhammad Bilal Motiwala  
**Project:** Black Swan  
**Version:** 1.0.0

## 📋 Overview

The Sentiment Analysis Service analyzes cryptocurrency-related tweets from the last 6 hours every hour to determine overall market sentiment and mood. This service provides real-time insights into crypto market sentiment using advanced AI models through OpenRouter.

### 🎯 Key Features

- **Real-time Tweet Collection**: Automatically collects tweets from Firestore database
- **AI-Powered Analysis**: Uses GPT-4 Mini via OpenRouter for sophisticated sentiment analysis
- **Automated Scheduling**: Runs analysis every hour at 58 minutes using cron jobs
- **Comprehensive Metrics**: Provides sentiment intensity, overall mood, and key events
- **RESTful API**: Full API for manual triggers and data access
- **Historical Data**: Stores and retrieves analysis history
- **Thread Support**: Handles both regular tweets and Twitter threads
- **Engagement Analysis**: Considers likes, retweets, and replies in sentiment calculation

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firestore     │    │  Sentiment       │    │   OpenRouter    │
│   Database      │───▶│  Analysis        │───▶│   AI Service    │
│   (Tweets)      │    │  Service         │    │   (GPT-4 Mini)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Firestore      │
                       │   (Results)      │
                       └──────────────────┘
```

### Core Components

1. **TweetCollector**: Fetches and processes tweets from Firestore
2. **SentimentAnalysisEngine**: Handles AI-powered sentiment analysis
3. **SentimentStorageManager**: Manages data persistence and retrieval
4. **SentimentAnalysisService**: Orchestrates the complete workflow
5. **Express API Server**: Provides REST endpoints for interaction

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Firebase Project** with Firestore enabled
- **OpenRouter API Key** (get from [OpenRouter](https://openrouter.ai/keys))

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sentiment-analysis-service
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenRouter API key
   ```

4. **Configure Firebase**

   - Download your Firebase service account key
   - Place it as `serviceAccountKey.json` in the root directory
   - Ensure proper file permissions: `chmod 600 serviceAccountKey.json`

5. **Start the service**
   ```bash
   npm start
   ```

The service will start on port 8087 (or your configured PORT) and begin automated sentiment analysis.

## ⚙️ Configuration

### Environment Variables

| Variable                | Required | Default              | Description                             |
| ----------------------- | -------- | -------------------- | --------------------------------------- |
| `OPENROUTER_API_KEY`    | ✅       | -                    | OpenRouter API key for AI analysis      |
| `PORT`                  | ❌       | 8087                 | Server port                             |
| `TWEET_LOOKBACK_HOURS`  | ❌       | 6                    | Hours to look back for tweets           |
| `ANALYSIS_INTERVAL`     | ❌       | "58 \* \* \* \*"     | Cron schedule for analysis              |
| `MAX_TWEETS_TO_ANALYZE` | ❌       | null                 | Max tweets to process (null = no limit) |
| `SENTIMENT_COLLECTION`  | ❌       | "sentiment_analysis" | Firestore collection name               |

### Firebase Setup

1. **Create a Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one

2. **Enable Firestore**

   - Navigate to Firestore Database
   - Create database in production mode
   - Note your project ID

3. **Generate Service Account Key**

   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename to `serviceAccountKey.json`
   - Place in service root directory

4. **Set up Firestore Collections**
   - Ensure `tweet_global` collection exists with tweet data
   - The service will create `sentiment_analysis` collection automatically

## 📚 API Documentation

### Base URL

```
http://localhost:8087
```

### Endpoints

#### 1. Service Information

```http
GET /
```

**Response:**

```json
{
  "service": "Crypto Sentiment Analysis Service",
  "version": "1.0.0",
  "status": "running",
  "description": "AI-powered crypto market sentiment analysis from tweets",
  "author": "Muhammad Bilal Motiwala",
  "project": "Black Swan",
  "endpoints": {
    "/analyze": "POST - Trigger sentiment analysis",
    "/history": "GET - Get recent analysis history",
    "/status": "GET - Service status and metrics"
  }
}
```

#### 2. Trigger Analysis

```http
POST /analyze
```

**Description:** Manually trigger sentiment analysis

**Response:**

```json
{
  "success": true,
  "message": "Sentiment analysis completed successfully",
  "result": {
    "analysisId": "abc123...",
    "timestamp": "2024-01-15T10:30:00Z",
    "sentiment": "bullish",
    "sentimentIntensity": "moderate",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 3. Analysis History

```http
GET /history?limit=10
```

**Parameters:**

- `limit` (optional): Number of analyses to retrieve (default: 10)

**Response:**

```json
{
  "success": true,
  "count": 5,
  "analyses": [
    {
      "id": "analysis_id_1",
      "timestamp": "2024-01-15T10:30:00Z",
      "analysisTime": "2024-01-15T10:30:00Z",
      "inputData": {
        "tweetsAnalyzed": 150,
        "threadsAnalyzed": 25,
        "totalEngagement": 5000,
        "lookbackHours": 6
      },
      "sentiment": {
        "overall_sentiment": "bullish",
        "sentiment_intensity": "moderate",
        "analysis": "Market shows positive sentiment...",
        "summary": "Crypto market sentiment is bullish with moderate intensity",
        "key_events": [
          "Bitcoin price surge discussion",
          "Ethereum upgrade optimism",
          "DeFi protocol launches"
        ],
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "serviceVersion": "1.0.0",
      "model": "openai/gpt-4o-mini",
      "provider": "openrouter"
    }
  ]
}
```

#### 4. Service Status

```http
GET /status
```

**Response:**

```json
{
  "service": "Crypto Sentiment Analysis Service",
  "status": "operational",
  "isRunning": false,
  "configuration": {
    "lookbackHours": 6,
    "maxTweets": "No limit - process ALL tweets from 6 hours",
    "analysisInterval": "58 * * * *",
    "frequency": "Every hour at 58 minutes"
  },
  "uptime": 3600
}
```

## 🔄 How It Works

### Analysis Workflow

1. **Tweet Collection** (Every hour at 58 minutes)

   - Queries Firestore `tweet_global` collection
   - Filters tweets from last 6 hours
   - Separates regular tweets from threads
   - Calculates engagement metrics

2. **Data Processing**

   - Formats tweets for AI analysis
   - Builds comprehensive prompts
   - Includes engagement statistics
   - Handles both tweets and threads

3. **AI Analysis**

   - Sends formatted data to OpenRouter
   - Uses GPT-4 Mini for cost-effective analysis
   - Analyzes sentiment, intensity, and key events
   - Returns structured JSON response

4. **Result Storage**
   - Saves analysis to Firestore
   - Includes metadata and timestamps
   - Stores input data summary
   - Maintains analysis history

### Sentiment Categories

**Overall Sentiment:**

- `extremely_bullish` - Very positive market sentiment
- `bullish` - Positive market sentiment
- `neutral` - Mixed or neutral sentiment
- `bearish` - Negative market sentiment
- `extremely_bearish` - Very negative market sentiment

**Sentiment Intensity:**

- `low` - Mild expressions and sentiment
- `moderate` - Noticeable patterns and sentiment
- `high` - Strong expressions and sentiment
- `extreme` - Highly emotional and intense sentiment

## 🛠️ Development

### Project Structure

```
sentiment-analysis-service/
├── index.js                 # Main service file
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
├── serviceAccountKey.json # Firebase service account (not in repo)
├── prompts/               # AI prompt templates
│   ├── prompt-config.js   # Prompt management system
│   ├── sentiment-analysis-v1.md # Main analysis prompt
│   └── README.md          # Prompt documentation
└── README.md              # This file
```

### Available Scripts

```bash
# Start the service
npm start

# Start in development mode with auto-reload
npm run dev

# Install dependencies
npm install
```

### Adding New Features

1. **Modify Analysis Logic**: Edit `SentimentAnalysisEngine` class
2. **Update Prompts**: Modify files in `prompts/` directory
3. **Add API Endpoints**: Extend Express routes in `index.js`
4. **Change Scheduling**: Update `CONFIG.ANALYSIS_INTERVAL`

## 🔒 Security Best Practices

### Environment Security

- Never commit `.env` files to version control
- Use environment variables in production
- Rotate API keys regularly
- Monitor API usage and costs

### Firebase Security

- Use least-privilege service account keys
- Set proper Firestore security rules
- Monitor database access logs
- Backup service account keys securely

### API Security

- Rate limiting is enabled (100 requests/15 minutes per IP)
- CORS is configured for cross-origin requests
- Helmet provides security headers
- Input validation on all endpoints

## 📊 Monitoring and Logging

### Log Levels

- `✅` Success operations
- `❌` Error conditions
- `⚠️` Warning messages
- `📱` Tweet collection
- `🧠` AI analysis
- `💾` Data storage
- `⏰` Cron scheduling
- `🚀` Server operations

### Key Metrics to Monitor

- Analysis completion rate
- API response times
- Error frequency
- Tweet collection volume
- AI analysis costs
- Database storage usage

## 🚨 Troubleshooting

### Common Issues

**1. Firebase Connection Errors**

```
❌ [FIREBASE] Failed to initialize Firebase Admin
```

- Check `serviceAccountKey.json` exists and is valid
- Verify Firebase project ID matches
- Ensure Firestore is enabled

**2. OpenRouter API Errors**

```
❌ [SENTIMENT] Analysis failed: 401 Unauthorized
```

- Verify `OPENROUTER_API_KEY` is correct
- Check API key has sufficient credits
- Ensure API key is not expired

**3. No Tweets Found**

```
⚠️ [SERVICE] No tweets found for analysis
```

- Check `tweet_global` collection has recent data
- Verify `collectedAt` timestamps are recent
- Adjust `TWEET_LOOKBACK_HOURS` if needed

**4. Memory Issues**

```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

- Increase Node.js memory limit: `node --max-old-space-size=4096 index.js`
- Consider reducing `MAX_TWEETS_TO_ANALYZE` limit
- Monitor tweet volume and adjust accordingly

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development npm start
```

## 🔄 Deployment

### Production Deployment

1. **Environment Setup**

   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export OPENROUTER_API_KEY=your_production_key
   export PORT=8087
   ```

2. **Process Management**

   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start index.js --name sentiment-analysis
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8087;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **SSL Certificate**
   ```bash
   # Using Let's Encrypt
   sudo certbot --nginx -d your-domain.com
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 8087

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t sentiment-analysis-service .
docker run -p 8087:8087 --env-file .env sentiment-analysis-service
```

## 📈 Performance Optimization

### Scaling Considerations

- **Horizontal Scaling**: Run multiple instances behind load balancer
- **Database Optimization**: Use Firestore indexes for better query performance
- **Caching**: Implement Redis for frequently accessed data
- **Rate Limiting**: Adjust limits based on usage patterns

### Cost Optimization

- **AI Model Selection**: GPT-4 Mini provides good balance of cost/quality
- **Tweet Filtering**: Implement smart filtering to reduce analysis volume
- **Batch Processing**: Group multiple analyses for efficiency
- **Monitoring**: Track API usage and costs regularly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

### Code Style

- Use meaningful variable names
- Add comprehensive comments
- Follow existing code structure
- Test all changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- **Author**: Muhammad Bilal Motiwala
- **Project**: Black Swan
- **Issues**: Create an issue in the repository
- **Documentation**: Check this README and inline code comments

## 🔮 Future Enhancements

- [ ] Multi-language sentiment analysis
- [ ] Real-time WebSocket updates
- [ ] Advanced sentiment visualization
- [ ] Machine learning model training
- [ ] Integration with more social platforms
- [ ] Sentiment trend analysis
- [ ] Alert system for extreme sentiment
- [ ] API authentication and authorization

---

**Made with ❤️ by Muhammad Bilal Motiwala for the Black Swan project**
