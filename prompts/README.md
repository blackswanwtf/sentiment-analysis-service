# Sentiment Analysis Prompt Management System

This directory contains versioned prompts for the crypto sentiment analysis service, making them easy to version control, edit, and manage.

## File Structure

```
prompts/
├── sentiment-analysis-v1.md    # Current prompt template
├── prompt-config.js            # Prompt management system
└── README.md                   # This file
```

## Usage

### Using Different Prompt Versions

```javascript
// Use current version (default)
const prompt = promptManager.getFilledPrompt(templateData);

// Use specific version
const prompt = promptManager.getFilledPrompt(
  templateData,
  "sentiment-analysis",
  "v1"
);
```

### Creating New Prompt Versions

1. **Copy existing version**: `cp sentiment-analysis-v1.md sentiment-analysis-v2.md`
2. **Edit the new version**: Modify the template as needed
3. **Update default version**:
   ```javascript
   promptManager.setDefaultVersion("v2");
   ```

### Template Variables

The prompt template uses `{{variable_name}}` syntax for placeholders:

- `{{timestamp}}` - Current analysis timestamp
- `{{total_tweets}}` - Number of tweets analyzed
- `{{total_threads}}` - Number of threads analyzed
- `{{tweet_collection_summary}}` - Summary statistics
- `{{tweets_section}}` - Formatted individual tweets
- `{{threads_section}}` - Formatted thread conversations

## Prompt Evolution

### Version 1 (v1) - Initial Release

- Basic sentiment analysis structure
- 5-level sentiment classification (extremely bearish to extremely bullish)
- Fear/greed indicators
- Key themes identification
- Volume analysis metrics

### Future Versions

- Enhanced emotion detection
- Market-specific sentiment indicators
- Influencer tweet weighting
- Cross-platform sentiment correlation

## Benefits

✅ **Version Control**: Easy to track prompt changes over time  
✅ **Easy Editing**: Edit prompts in markdown without touching code  
✅ **Testing**: Test different prompt versions without code changes  
✅ **Rollback**: Quickly revert to previous prompt versions  
✅ **Team Collaboration**: Non-developers can edit prompts  
✅ **A/B Testing**: Compare different prompt approaches

## Best Practices

1. **Clear Instructions**: Provide specific guidance on sentiment classification
2. **Structured Output**: Always require JSON format for consistent parsing
3. **Context Awareness**: Include relevant market context and timeframes
4. **Confidence Scoring**: Ask for analysis confidence levels
5. **Theme Identification**: Request key topic extraction from tweets
6. **Engagement Weighting**: Consider tweet engagement in sentiment assessment
