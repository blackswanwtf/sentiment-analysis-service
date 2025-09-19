# Crypto Market Tweet Sentiment Analysis

## Context

- **Timestamp**: {{timestamp}}
- **Analysis Period**: Last 6 hours
- **Total Tweets**: {{total_tweets}}
- **Total Threads**: {{total_threads}}

## Inputs

### Tweet Collection Summary

{{tweet_collection_summary}}

### Tweets

{{tweets_section}}

### Threads

{{threads_section}}

## Task

Determine overall market sentiment and intensity from the last 6 hours. Be concise, neutral, and evidence‑based.

Rules

- Focus on dominant tone, key themes, and intensity; avoid predictions.
- Include 2–5 key events/themes driving sentiment.
- Set "createdAt" to now.

Respond with EXACT JSON:

```json
{
  "analysis": "Comprehensive analysis of overall market sentiment based on the 6-hour tweet collection.",
  "summary": "2-3 sentence summary of current crypto market sentiment and key mood indicators",
  "key_events": [
    "Major sentiment-driving event or theme 1",
    "Major sentiment-driving event or theme 2",
    "Major sentiment-driving event or theme 3"
  ],
  "overall_sentiment": "extremely_bullish/bullish/neutral/bearish/extremely_bearish",
  "sentiment_intensity": "low/moderate/high/extreme",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

Guidance

- Low: mild expressions; Moderate: noticeable patterns; High: strong expressions; Extreme: highly emotional.
- Consider context and sarcasm; assess genuine sentiment, not keywords.
