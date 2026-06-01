# Validation Summary: How to Perform Sentiment Analysis with Azure AI Language Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Language Service
- Azure AI Language Sentiment Analysis and Opinion Mining
- Azure AI Text Analytics SDK for Python
- Python
- pandas

## Sources Consulted
- Azure AI Language sentiment analysis and opinion mining how-to: https://learn.microsoft.com/en-us/azure/ai-services/language-service/sentiment-opinion-mining/how-to/call-api
- Azure AI Language service limits: https://learn.microsoft.com/en-us/azure/ai-services/language-service/concepts/data-limits
- Azure AI Language sentiment analysis and opinion mining quickstart: https://learn.microsoft.com/en-us/azure/ai-services/language-service/sentiment-opinion-mining/quickstart
- Azure AI Text Analytics Python SDK `TextAnalyticsClient` reference: https://learn.microsoft.com/en-us/python/api/azure-ai-textanalytics/azure.ai.textanalytics.textanalyticsclient
- Azure AI Text Analytics Python SDK `SentenceSentiment` reference: https://learn.microsoft.com/en-us/python/api/azure-ai-textanalytics/azure.ai.textanalytics.sentencesentiment
- Azure AI Language sentiment analysis language support: https://learn.microsoft.com/en-us/azure/ai-services/language-service/sentiment-opinion-mining/language-support
- Azure AI Language pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/language-service/

## Issues Found
- The basic sentiment analysis example said the API accepts up to 10 documents per call "or 25 with recent versions." Microsoft documentation lists 10 documents per request for synchronous Sentiment Analysis and Opinion Mining, while 25 applies to asynchronous requests. Updated the comment to say the synchronous API accepts up to 10 documents per call.
- The multi-language section said sentiment analysis automatically detects language and printed `result.detected_language`. The Python SDK defaults sentiment analysis to English when no language is supplied, and `AnalyzeSentimentResult` does not expose `detected_language`. Updated the section to specify per-document language codes and print the supplied language.

## Review Notes
- The examples use API keys directly for clarity. Microsoft recommends managed identity or secure key storage for production workloads.
- The post's synchronous examples correctly stay within the 5,120-character per-document limit and the 10-document Sentiment Analysis request limit after the fixes.
