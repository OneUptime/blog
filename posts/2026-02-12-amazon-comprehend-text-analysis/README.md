# How to Use Amazon Comprehend for Text Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Comprehend, NLP, Text Analysis

Description: A complete guide to using Amazon Comprehend for text analysis including sentiment detection, entity recognition, key phrases, language detection, and syntax analysis.

---

Amazon Comprehend is AWS's natural language processing service, and it's one of those tools that's surprisingly powerful for how easy it is to use. No ML expertise needed. You feed it text, and it gives you structured insights - sentiment, entities, key phrases, language, and syntax. It's been around for a while, but if you haven't tried it, you're missing out on a fast way to extract meaning from unstructured text at scale.

Unlike foundation models where you write prompts and parse responses, Comprehend gives you structured API responses with confidence scores. That makes it much easier to integrate into data pipelines and automation workflows.

## Getting Started

All you need is boto3 and an AWS account with Comprehend access. No model training, no configuration - just call the API.

```python
import boto3
import json

comprehend = boto3.client('comprehend', region_name='us-east-1')
```

## Language Detection

Before you analyze text, you often need to know what language it's in. Comprehend can detect over 100 languages.

```python
def detect_language(text):
    """Detect the dominant language of a text."""
    response = comprehend.detect_dominant_language(Text=text)

    languages = response['Languages']
    # Sort by confidence score
    languages.sort(key=lambda x: x['Score'], reverse=True)

    for lang in languages:
        print(f"Language: {lang['LanguageCode']} - Confidence: {lang['Score']:.2%}")

    return languages[0]['LanguageCode']

# Test with different languages
detect_language("The quick brown fox jumps over the lazy dog.")
detect_language("Le renard brun rapide saute par-dessus le chien paresseux.")
detect_language("El zorro marron rapido salta sobre el perro perezoso.")
```

## Sentiment Analysis

Sentiment analysis tells you whether a piece of text is positive, negative, neutral, or mixed. It returns confidence scores for each category.

```python
def analyze_sentiment(text, language='en'):
    """Analyze the sentiment of text and return structured results."""
    response = comprehend.detect_sentiment(
        Text=text,
        LanguageCode=language
    )

    sentiment = response['Sentiment']
    scores = response['SentimentScore']

    print(f"Overall: {sentiment}")
    print(f"  Positive:  {scores['Positive']:.2%}")
    print(f"  Negative:  {scores['Negative']:.2%}")
    print(f"  Neutral:   {scores['Neutral']:.2%}")
    print(f"  Mixed:     {scores['Mixed']:.2%}")

    return response

# Analyze customer feedback
analyze_sentiment("The product quality is excellent but shipping was painfully slow.")
analyze_sentiment("Absolutely love this service! Best experience I have had in years.")
analyze_sentiment("The item arrived damaged and customer support was unhelpful.")
```

For a deeper dive into sentiment analysis use cases, see our guide on [Amazon Comprehend for sentiment analysis](https://oneuptime.com/blog/post/amazon-comprehend-sentiment-analysis/view).

## Entity Recognition

Entity recognition identifies and classifies named entities in your text - people, organizations, locations, dates, quantities, and more.

```python
def extract_entities(text, language='en'):
    """Extract named entities from text."""
    response = comprehend.detect_entities(
        Text=text,
        LanguageCode=language
    )

    entities = response['Entities']

    # Group entities by type
    by_type = {}
    for entity in entities:
        entity_type = entity['Type']
        if entity_type not in by_type:
            by_type[entity_type] = []
        by_type[entity_type].append({
            'text': entity['Text'],
            'score': entity['Score']
        })

    for entity_type, items in by_type.items():
        print(f"\n{entity_type}:")
        for item in items:
            print(f"  - {item['text']} ({item['score']:.2%})")

    return entities

# Extract entities from a news article
extract_entities("""
Amazon announced a $4 billion investment in Anthropic on September 25, 2023.
The deal was led by CEO Andy Jassy and covers AI research in San Francisco.
The partnership aims to develop next-generation foundation models by 2025.
""")
```

## Key Phrase Extraction

Key phrases give you the main topics and concepts in a document without reading the whole thing.

```python
def extract_key_phrases(text, language='en'):
    """Extract key phrases that represent the main topics."""
    response = comprehend.detect_key_phrases(
        Text=text,
        LanguageCode=language
    )

    phrases = response['KeyPhrases']
    # Sort by confidence
    phrases.sort(key=lambda x: x['Score'], reverse=True)

    print("Key Phrases:")
    for phrase in phrases:
        print(f"  - {phrase['Text']} ({phrase['Score']:.2%})")

    return phrases

extract_key_phrases("""
Machine learning models require careful preprocessing of training data.
Feature engineering, data normalization, and handling missing values are
critical steps that significantly impact model performance. Cross-validation
helps prevent overfitting while hyperparameter tuning optimizes the model
for the specific dataset.
""")
```

## Syntax Analysis

Syntax analysis breaks text down into its grammatical components - parts of speech, tokens, and their relationships.

```python
def analyze_syntax(text, language='en'):
    """Perform syntax analysis to get parts of speech."""
    response = comprehend.detect_syntax(
        Text=text,
        LanguageCode=language
    )

    tokens = response['SyntaxTokens']

    for token in tokens:
        pos = token['PartOfSpeech']
        print(f"  {token['Text']:20s} -> {pos['Tag']:10s} ({pos['Score']:.2%})")

    return tokens

analyze_syntax("The startup launched an innovative product in the European market.")
```

## Batch Processing

For high-volume text analysis, use the batch APIs to process up to 25 documents in a single call.

```python
def batch_sentiment(texts, language='en'):
    """Analyze sentiment for a batch of texts (up to 25)."""
    # Comprehend batch limit is 25 documents
    results = []

    for i in range(0, len(texts), 25):
        batch = texts[i:i+25]
        response = comprehend.batch_detect_sentiment(
            TextList=batch,
            LanguageCode=language
        )

        for item in response['ResultList']:
            results.append({
                'index': i + item['Index'],
                'sentiment': item['Sentiment'],
                'scores': item['SentimentScore']
            })

        # Handle any errors
        for error in response['ErrorList']:
            print(f"Error on item {i + error['Index']}: {error['ErrorMessage']}")

    return results

# Analyze a batch of customer reviews
reviews = [
    "Great product, fast delivery!",
    "Terrible experience, would not recommend.",
    "It's okay, nothing special.",
    "Love the quality but hate the price.",
    "Perfect in every way!"
]

results = batch_sentiment(reviews)
for r in results:
    print(f"Review {r['index']}: {r['sentiment']}")
```

## Asynchronous Jobs for Large Datasets

When you have thousands or millions of documents, use asynchronous analysis jobs. These read from and write to S3.

```python
def start_sentiment_job(input_s3_uri, output_s3_uri, role_arn):
    """Start an asynchronous sentiment analysis job."""
    response = comprehend.start_sentiment_detection_job(
        InputDataConfig={
            'S3Uri': input_s3_uri,
            'InputFormat': 'ONE_DOC_PER_LINE'  # Each line is a document
        },
        OutputDataConfig={
            'S3Uri': output_s3_uri
        },
        DataAccessRoleArn=role_arn,
        LanguageCode='en',
        JobName='customer-review-sentiment-analysis'
    )

    job_id = response['JobId']
    print(f"Job started: {job_id}")
    return job_id

def check_job_status(job_id):
    """Check the status of an async Comprehend job."""
    response = comprehend.describe_sentiment_detection_job(JobId=job_id)
    status = response['SentimentDetectionJobProperties']['JobStatus']
    print(f"Status: {status}")
    return status
```

## Building a Text Analysis Pipeline

Let's combine all these features into a comprehensive analysis function.

```python
def full_analysis(text, language=None):
    """Run a complete text analysis pipeline."""

    # Auto-detect language if not provided
    if not language:
        language = detect_language(text)
        print(f"Detected language: {language}\n")

    results = {
        'language': language,
        'sentiment': None,
        'entities': [],
        'key_phrases': [],
    }

    # Sentiment
    print("--- Sentiment ---")
    sentiment_response = comprehend.detect_sentiment(Text=text, LanguageCode=language)
    results['sentiment'] = {
        'label': sentiment_response['Sentiment'],
        'scores': sentiment_response['SentimentScore']
    }
    print(f"Overall: {results['sentiment']['label']}\n")

    # Entities
    print("--- Entities ---")
    entity_response = comprehend.detect_entities(Text=text, LanguageCode=language)
    results['entities'] = entity_response['Entities']
    for e in results['entities']:
        print(f"  [{e['Type']}] {e['Text']}")
    print()

    # Key Phrases
    print("--- Key Phrases ---")
    phrases_response = comprehend.detect_key_phrases(Text=text, LanguageCode=language)
    results['key_phrases'] = phrases_response['KeyPhrases']
    for p in sorted(results['key_phrases'], key=lambda x: x['Score'], reverse=True)[:10]:
        print(f"  - {p['Text']}")

    return results

# Run full analysis on a piece of text
analysis = full_analysis("""
Google announced a major update to its Cloud Platform at the annual
Cloud Next conference in San Francisco last Tuesday. CEO Sundar Pichai
revealed new AI-powered services that will reduce compute costs by 30%
for enterprise customers. The stock rose 4.2% following the announcement,
reaching a new all-time high of $175 per share.
""")
```

## Practical Use Cases

Comprehend works great for automated content moderation, customer feedback analysis, document classification, and extracting structured data from unstructured text. If you need to go beyond the built-in capabilities with custom categories, check out [Amazon Comprehend custom classification](https://oneuptime.com/blog/post/amazon-comprehend-custom-classification/view).

For monitoring the health and performance of your text analysis pipelines, having proper observability across your AWS services is key. See our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view) for a solid setup.

Amazon Comprehend won't replace foundation models for complex reasoning tasks, but for structured text analysis at scale, it's hard to beat on simplicity and cost.
