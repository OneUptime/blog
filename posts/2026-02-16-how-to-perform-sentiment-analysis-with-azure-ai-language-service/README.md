# How to Perform Sentiment Analysis with Azure AI Language Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AI Language, Sentiment Analysis, NLP, Text Analytics, Cognitive Services

Description: Analyze text sentiment using Azure AI Language Service to understand customer opinions, feedback, and reviews at scale with practical Python examples.

---

Understanding what your customers think about your product is critical for any business. Sentiment analysis automates this by classifying text as positive, negative, neutral, or mixed, and by identifying specific opinions about particular aspects of your product or service. Azure AI Language Service (the evolution of Azure Text Analytics) provides production-ready sentiment analysis that works across dozens of languages and handles everything from product reviews to social media posts. In this post, I will walk through setting it up and using it for real-world scenarios.

## What Azure AI Language Sentiment Analysis Provides

The sentiment analysis feature gives you three levels of insight:

- **Document-level sentiment**: An overall positive, negative, neutral, or mixed classification for the entire text, with confidence scores for each label.
- **Sentence-level sentiment**: Each sentence in the text gets its own sentiment classification. A review might be positive overall but contain a negative sentence about one specific aspect.
- **Opinion mining (aspect-based sentiment)**: Identifies specific entities (aspects) mentioned in the text and the opinions expressed about them. For example, in "The battery life is excellent but the screen is dim," it would identify "battery life" as positive and "screen" as negative.

## Step 1: Create a Language Service Resource

In the Azure Portal:

1. Search for "Language service" in the marketplace.
2. Click "Create."
3. Select your subscription, resource group, and region.
4. Choose the Free F0 tier (5,000 text records per month) or Standard S for production.
5. Review and create.

Copy the endpoint and API key.

## Step 2: Install the SDK

```bash
# Install the Azure AI Language SDK
pip install azure-ai-textanalytics
```

## Step 3: Basic Sentiment Analysis

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

# Configure the client
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = TextAnalyticsClient(endpoint, AzureKeyCredential(key))

def analyze_sentiment(texts):
    """
    Analyze the sentiment of one or more text documents.
    Returns document-level and sentence-level sentiment for each input.
    """
    # The API accepts up to 10 documents per call (or 25 with recent versions)
    results = client.analyze_sentiment(texts)

    for i, result in enumerate(results):
        if result.is_error:
            print(f"Document {i}: Error - {result.error.message}")
            continue

        print(f"\nDocument {i}: \"{texts[i][:50]}...\"")
        print(f"  Overall sentiment: {result.sentiment}")
        print(f"  Confidence scores: "
              f"positive={result.confidence_scores.positive:.2f}, "
              f"neutral={result.confidence_scores.neutral:.2f}, "
              f"negative={result.confidence_scores.negative:.2f}")

        # Sentence-level breakdown
        for j, sentence in enumerate(result.sentences):
            print(f"  Sentence {j + 1}: [{sentence.sentiment}] \"{sentence.text}\"")

    return results


# Analyze some sample texts
texts = [
    "The new dashboard is amazing! It loads much faster than the old version and the charts are beautiful.",
    "I have been trying to reset my password for three days and support has not responded.",
    "The product works as expected. Nothing special but gets the job done.",
    "Love the API integration but the documentation could use some improvement."
]

results = analyze_sentiment(texts)
```

## Step 4: Opinion Mining (Aspect-Based Sentiment)

Opinion mining goes deeper than document and sentence sentiment. It identifies specific aspects that people are talking about and their opinions on each one.

```python
def analyze_opinions(texts):
    """
    Perform opinion mining to extract aspect-level sentiment.
    Identifies what people are talking about and how they feel about each aspect.
    """
    results = client.analyze_sentiment(
        texts,
        show_opinion_mining=True  # Enable opinion mining
    )

    for i, result in enumerate(results):
        if result.is_error:
            print(f"Document {i}: Error - {result.error.message}")
            continue

        print(f"\nDocument {i}: \"{texts[i][:80]}...\"")
        print(f"  Overall: {result.sentiment}")

        for sentence in result.sentences:
            # Check for mined opinions in this sentence
            if sentence.mined_opinions:
                for opinion in sentence.mined_opinions:
                    # The target is the aspect being discussed
                    target = opinion.target
                    print(f"\n  Aspect: \"{target.text}\" ({target.sentiment})")

                    # Assessments are the opinions about the aspect
                    for assessment in opinion.assessments:
                        print(f"    Opinion: \"{assessment.text}\" "
                              f"({assessment.sentiment}, "
                              f"confidence: {assessment.confidence_scores.positive:.2f}/"
                              f"{assessment.confidence_scores.negative:.2f})")

    return results


# Analyze product reviews with opinion mining
reviews = [
    "The battery life is incredible, easily lasts two days. But the camera quality "
    "is disappointing, especially in low light conditions.",
    "Fast shipping and great packaging. The product itself feels cheap though, "
    "and the instruction manual is confusing.",
    "Customer service was helpful and resolved my issue quickly. The hold time was "
    "long but the agent was knowledgeable and patient."
]

opinions = analyze_opinions(reviews)
```

## Step 5: Batch Processing at Scale

For processing large volumes of text (like analyzing all customer reviews from the past month), use batching to stay efficient.

```python
def batch_sentiment_analysis(all_texts, batch_size=10):
    """
    Process a large number of texts in batches.
    The API accepts up to 10 documents per call.
    Returns a consolidated list of results.
    """
    all_results = []

    for i in range(0, len(all_texts), batch_size):
        batch = all_texts[i:i + batch_size]

        try:
            results = client.analyze_sentiment(batch, show_opinion_mining=True)
            all_results.extend(results)
            print(f"Processed batch {i // batch_size + 1} "
                  f"({len(all_results)}/{len(all_texts)} documents)")
        except Exception as e:
            print(f"Error in batch {i // batch_size + 1}: {e}")
            # Add error placeholders for this batch
            all_results.extend([None] * len(batch))

    return all_results


# Process a large dataset
import csv

def analyze_reviews_from_csv(csv_path, text_column="review_text"):
    """
    Read reviews from a CSV file and analyze sentiment for each.
    Writes results back to a new CSV.
    """
    import pandas as pd

    df = pd.read_csv(csv_path)
    texts = df[text_column].tolist()

    # Clean texts (remove NaN values and very long texts)
    cleaned = []
    for t in texts:
        if pd.isna(t):
            cleaned.append("")
        elif len(t) > 5120:  # API limit is 5120 characters
            cleaned.append(t[:5120])
        else:
            cleaned.append(str(t))

    # Run batch analysis
    results = batch_sentiment_analysis(cleaned)

    # Add sentiment columns to the dataframe
    sentiments = []
    positive_scores = []
    negative_scores = []

    for result in results:
        if result and not result.is_error:
            sentiments.append(result.sentiment)
            positive_scores.append(result.confidence_scores.positive)
            negative_scores.append(result.confidence_scores.negative)
        else:
            sentiments.append("error")
            positive_scores.append(0.0)
            negative_scores.append(0.0)

    df["sentiment"] = sentiments
    df["positive_score"] = positive_scores
    df["negative_score"] = negative_scores

    # Save the results
    output_path = csv_path.replace(".csv", "_with_sentiment.csv")
    df.to_csv(output_path, index=False)
    print(f"\nResults saved to {output_path}")

    # Print summary statistics
    print(f"\nSentiment distribution:")
    print(df["sentiment"].value_counts().to_string())

    return df
```

## Step 6: Build a Sentiment Dashboard

Aggregate sentiment data over time to spot trends.

```python
def generate_sentiment_summary(results, texts):
    """
    Generate a summary report from sentiment analysis results.
    Useful for dashboards and executive reports.
    """
    summary = {
        "total": len(results),
        "positive": 0,
        "negative": 0,
        "neutral": 0,
        "mixed": 0,
        "errors": 0,
        "avg_positive_score": 0.0,
        "avg_negative_score": 0.0,
        "top_negative_issues": [],
        "top_positive_aspects": []
    }

    positive_scores = []
    negative_scores = []
    negative_aspects = {}
    positive_aspects = {}

    for result in results:
        if result is None or result.is_error:
            summary["errors"] += 1
            continue

        summary[result.sentiment] += 1
        positive_scores.append(result.confidence_scores.positive)
        negative_scores.append(result.confidence_scores.negative)

        # Collect opinion mining data
        for sentence in result.sentences:
            if sentence.mined_opinions:
                for opinion in sentence.mined_opinions:
                    target_text = opinion.target.text.lower()
                    target_sentiment = opinion.target.sentiment

                    if target_sentiment == "negative":
                        negative_aspects[target_text] = negative_aspects.get(target_text, 0) + 1
                    elif target_sentiment == "positive":
                        positive_aspects[target_text] = positive_aspects.get(target_text, 0) + 1

    if positive_scores:
        summary["avg_positive_score"] = sum(positive_scores) / len(positive_scores)
    if negative_scores:
        summary["avg_negative_score"] = sum(negative_scores) / len(negative_scores)

    # Sort aspects by frequency
    summary["top_negative_issues"] = sorted(
        negative_aspects.items(), key=lambda x: x[1], reverse=True
    )[:10]
    summary["top_positive_aspects"] = sorted(
        positive_aspects.items(), key=lambda x: x[1], reverse=True
    )[:10]

    return summary


# Generate and display the summary
summary = generate_sentiment_summary(results, texts)
print(f"Total documents: {summary['total']}")
print(f"Positive: {summary['positive']} ({summary['positive']/summary['total']:.1%})")
print(f"Negative: {summary['negative']} ({summary['negative']/summary['total']:.1%})")
print(f"Neutral: {summary['neutral']} ({summary['neutral']/summary['total']:.1%})")
print(f"\nTop negative issues: {summary['top_negative_issues']}")
print(f"Top positive aspects: {summary['top_positive_aspects']}")
```

## Multi-Language Support

Azure AI Language supports sentiment analysis in over 20 languages. The service automatically detects the language, or you can specify it explicitly.

```python
# Analyze text in different languages
multilingual_texts = [
    "Ce produit est fantastique! Je le recommande vivement.",        # French
    "El servicio al cliente fue terrible, espere mas de una hora.",   # Spanish
    "Das Essen war ausgezeichnet und der Service freundlich.",        # German
]

# Language detection is automatic
results = client.analyze_sentiment(multilingual_texts)
for i, result in enumerate(results):
    if not result.is_error:
        print(f"Text: {multilingual_texts[i][:50]}...")
        print(f"Detected language: {result.detected_language}")
        print(f"Sentiment: {result.sentiment}\n")
```

## Best Practices

**Preprocess your text.** Remove HTML tags, excessive whitespace, and irrelevant boilerplate before analysis. The cleaner the input, the more accurate the results.

**Use opinion mining for actionable insights.** Document-level sentiment tells you if people are happy or unhappy. Opinion mining tells you why. The latter is far more actionable for product teams.

**Set confidence thresholds.** Do not treat every result as equally reliable. If the positive and negative confidence scores are both around 0.4-0.5, the model is uncertain. Flag these for human review rather than making automated decisions based on them.

**Combine with other signals.** Sentiment analysis works best as one input among many. Combine it with star ratings, support ticket volume, churn data, and NPS scores for a complete picture.

## Wrapping Up

Azure AI Language sentiment analysis turns unstructured text into structured insight. The combination of document-level sentiment, sentence-level breakdown, and opinion mining gives you both the big picture and the details. Start with basic sentiment analysis to classify your text, then enable opinion mining to understand what specifically people like and dislike. For production systems, build automated pipelines that process feedback continuously and surface trends in a dashboard. The goal is not just to know that customers are unhappy but to know exactly what to fix.
