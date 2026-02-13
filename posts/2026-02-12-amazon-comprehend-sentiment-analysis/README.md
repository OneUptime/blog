# How to Use Amazon Comprehend for Sentiment Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Comprehend, Sentiment Analysis, NLP

Description: Build sentiment analysis pipelines with Amazon Comprehend to analyze customer feedback, social media, reviews, and support tickets at scale.

---

Understanding how your customers feel about your product, service, or brand is worth its weight in gold. Manually reading through thousands of reviews, support tickets, and social media posts isn't realistic. Amazon Comprehend's sentiment analysis takes care of this at scale - feed it text, and it tells you whether the sentiment is positive, negative, neutral, or mixed, complete with confidence scores.

The best part is there's nothing to train. Comprehend's sentiment models work out of the box across dozens of languages. You call an API, you get results. Let's look at how to build real sentiment analysis pipelines with it.

## Basic Sentiment Detection

The simplest call takes a piece of text and returns a sentiment label with confidence scores for all four categories.

```python
import boto3
import json

comprehend = boto3.client('comprehend', region_name='us-east-1')

def get_sentiment(text, language='en'):
    """Get sentiment analysis for a single piece of text."""
    response = comprehend.detect_sentiment(
        Text=text,
        LanguageCode=language
    )

    return {
        'sentiment': response['Sentiment'],
        'positive': response['SentimentScore']['Positive'],
        'negative': response['SentimentScore']['Negative'],
        'neutral': response['SentimentScore']['Neutral'],
        'mixed': response['SentimentScore']['Mixed']
    }

# Test with various sentiments
examples = [
    "This is the best product I've ever purchased. Amazing quality!",
    "Horrible experience. The item broke after one day of use.",
    "The package arrived on Thursday.",
    "I love the design but the battery life is disappointing."
]

for text in examples:
    result = get_sentiment(text)
    print(f"Text: {text[:60]}...")
    print(f"  Sentiment: {result['sentiment']}")
    print(f"  Positive: {result['positive']:.2%}, Negative: {result['negative']:.2%}")
    print()
```

## Batch Sentiment Analysis

Processing one review at a time is slow when you have thousands. The batch API handles up to 25 documents per call.

```python
def batch_sentiment_analysis(texts, language='en'):
    """Analyze sentiment for a list of texts in batches of 25."""
    all_results = []

    for i in range(0, len(texts), 25):
        batch = texts[i:i+25]

        response = comprehend.batch_detect_sentiment(
            TextList=batch,
            LanguageCode=language
        )

        # Process successful results
        for item in response['ResultList']:
            all_results.append({
                'index': i + item['Index'],
                'text': batch[item['Index']],
                'sentiment': item['Sentiment'],
                'scores': item['SentimentScore']
            })

        # Log any errors
        for error in response['ErrorList']:
            print(f"Error at index {i + error['Index']}: {error['ErrorMessage']}")

    return all_results

# Process a batch of customer reviews
reviews = [
    "Fast shipping and great quality. Will buy again!",
    "The color was different from the picture. Disappointed.",
    "Decent product for the price. Nothing extraordinary.",
    "Customer service was incredibly helpful when I had an issue.",
    "Complete waste of money. Returning immediately.",
    "Works as described. Solid purchase.",
    "I can't believe how good this is for the price!",
    "Arrived late and damaged. Very frustrated."
]

results = batch_sentiment_analysis(reviews)
```

## Analyzing Customer Feedback Trends

Raw sentiment scores are useful, but trends over time are where the real insights live. Here's how to aggregate and analyze sentiment data.

```python
from datetime import datetime, timedelta
from collections import defaultdict

def analyze_sentiment_trends(feedback_items):
    """Analyze sentiment trends across time periods.

    Args:
        feedback_items: List of dicts with 'text', 'date' keys
    """
    # Analyze sentiment for all items
    texts = [item['text'] for item in feedback_items]
    sentiments = batch_sentiment_analysis(texts)

    # Group by week
    weekly_data = defaultdict(lambda: {'positive': 0, 'negative': 0, 'neutral': 0, 'mixed': 0, 'total': 0})

    for i, result in enumerate(sentiments):
        date = feedback_items[i]['date']
        # Get the week start (Monday)
        week_start = date - timedelta(days=date.weekday())
        week_key = week_start.strftime('%Y-%m-%d')

        weekly_data[week_key][result['sentiment'].lower()] += 1
        weekly_data[week_key]['total'] += 1

    # Calculate percentages
    print("Weekly Sentiment Breakdown:")
    print(f"{'Week':>12s} | {'Pos%':>6s} | {'Neg%':>6s} | {'Neu%':>6s} | {'Total':>5s}")
    print("-" * 50)

    for week in sorted(weekly_data.keys()):
        data = weekly_data[week]
        total = data['total']
        print(
            f"{week:>12s} | "
            f"{data['positive']/total:>5.1%} | "
            f"{data['negative']/total:>5.1%} | "
            f"{data['neutral']/total:>5.1%} | "
            f"{total:>5d}"
        )

    return dict(weekly_data)
```

## Real-Time Sentiment Monitoring

For applications like live chat monitoring or social media tracking, you want real-time sentiment analysis. Here's a pattern using a message queue.

```python
import time

class SentimentMonitor:
    """Monitor text streams for sentiment in real-time."""

    def __init__(self, alert_threshold=0.8):
        self.comprehend = boto3.client('comprehend', region_name='us-east-1')
        self.alert_threshold = alert_threshold
        self.buffer = []
        self.stats = {'positive': 0, 'negative': 0, 'neutral': 0, 'mixed': 0}

    def process_message(self, message, source='unknown'):
        """Analyze a single message and trigger alerts if needed."""
        result = self.comprehend.detect_sentiment(
            Text=message[:5000],  # Comprehend has a 5000 byte limit
            LanguageCode='en'
        )

        sentiment = result['Sentiment']
        scores = result['SentimentScore']

        # Update running stats
        self.stats[sentiment.lower()] += 1

        # Alert on strongly negative sentiment
        if scores['Negative'] > self.alert_threshold:
            self.trigger_alert(message, scores, source)

        return {
            'sentiment': sentiment,
            'scores': scores,
            'source': source
        }

    def trigger_alert(self, message, scores, source):
        """Handle a high-negativity alert."""
        print(f"[ALERT] High negative sentiment detected!")
        print(f"  Source: {source}")
        print(f"  Message: {message[:100]}...")
        print(f"  Negative score: {scores['Negative']:.2%}")
        # In production, send to SNS, Slack, PagerDuty, etc.

    def get_summary(self):
        """Get a summary of sentiment distribution."""
        total = sum(self.stats.values())
        if total == 0:
            return "No messages processed yet"

        summary = f"Total: {total} messages\n"
        for sentiment, count in self.stats.items():
            summary += f"  {sentiment}: {count} ({count/total:.1%})\n"
        return summary

# Usage
monitor = SentimentMonitor(alert_threshold=0.85)

incoming_messages = [
    ("I absolutely love your new feature!", "twitter"),
    ("This update broke everything. I'm switching to a competitor.", "support"),
    ("When will the next version be released?", "forum"),
    ("Your product ruined my entire project. Unacceptable.", "email"),
]

for message, source in incoming_messages:
    result = monitor.process_message(message, source)
    print(f"[{source}] {result['sentiment']}")

print(f"\n{monitor.get_summary()}")
```

## Targeted Sentiment Analysis

Standard sentiment analysis gives you the overall sentiment of a document. Targeted sentiment goes further - it identifies sentiment for specific entities mentioned in the text.

```python
def targeted_sentiment(text, language='en'):
    """Analyze sentiment targeted at specific entities in the text."""
    response = comprehend.detect_targeted_sentiment(
        Text=text,
        LanguageCode=language
    )

    entities = response['Entities']

    for entity in entities:
        for mention in entity['Mentions']:
            print(f"Entity: {mention['Text']}")
            print(f"  Type: {mention['Type']}")
            sentiment = mention['MentionSentiment']
            print(f"  Sentiment: {sentiment['Sentiment']}")
            print(f"  Scores: Pos={sentiment['SentimentScore']['Positive']:.2%}, "
                  f"Neg={sentiment['SentimentScore']['Negative']:.2%}")
            print()

    return entities

# Analyze sentiment per entity
targeted_sentiment(
    "The laptop screen is gorgeous but the keyboard feels cheap. "
    "The battery easily lasts 10 hours which is impressive."
)
```

## Async Jobs for Large Datasets

When you're analyzing millions of documents, use asynchronous jobs that read from and write to S3.

```python
def run_bulk_sentiment_job(input_s3, output_s3, role_arn):
    """Run a large-scale sentiment analysis job."""
    response = comprehend.start_sentiment_detection_job(
        InputDataConfig={
            'S3Uri': input_s3,
            'InputFormat': 'ONE_DOC_PER_LINE'
        },
        OutputDataConfig={
            'S3Uri': output_s3
        },
        DataAccessRoleArn=role_arn,
        LanguageCode='en',
        JobName=f'sentiment-job-{int(time.time())}'
    )

    job_id = response['JobId']
    print(f"Started job: {job_id}")

    # Poll until complete
    while True:
        status_response = comprehend.describe_sentiment_detection_job(JobId=job_id)
        status = status_response['SentimentDetectionJobProperties']['JobStatus']
        print(f"Status: {status}")

        if status in ['COMPLETED', 'FAILED', 'STOPPED']:
            break
        time.sleep(60)

    return status_response
```

## Building a Sentiment Dashboard

Combine all these pieces to build a data pipeline that feeds a dashboard.

```python
def generate_sentiment_report(results):
    """Generate a structured report from sentiment analysis results."""
    total = len(results)
    distribution = defaultdict(int)
    negative_items = []

    for r in results:
        distribution[r['sentiment']] += 1
        if r['sentiment'] == 'NEGATIVE' and r['scores']['Negative'] > 0.9:
            negative_items.append(r)

    report = {
        'total_analyzed': total,
        'distribution': {
            'positive': distribution['POSITIVE'],
            'negative': distribution['NEGATIVE'],
            'neutral': distribution['NEUTRAL'],
            'mixed': distribution['MIXED']
        },
        'positive_rate': distribution['POSITIVE'] / total if total > 0 else 0,
        'negative_rate': distribution['NEGATIVE'] / total if total > 0 else 0,
        'critical_negative_count': len(negative_items),
        'net_sentiment_score': (
            (distribution['POSITIVE'] - distribution['NEGATIVE']) / total
            if total > 0 else 0
        )
    }

    print(f"Sentiment Report ({total} items)")
    print(f"  Net Sentiment Score: {report['net_sentiment_score']:.2f}")
    print(f"  Positive Rate: {report['positive_rate']:.1%}")
    print(f"  Negative Rate: {report['negative_rate']:.1%}")
    print(f"  Critical Negatives: {report['critical_negative_count']}")

    return report
```

## Tips for Better Results

Keep input text under 5,000 bytes - Comprehend truncates anything longer. For long documents, consider breaking them into paragraphs and analyzing each one separately to get more granular sentiment data.

Pre-process your text to remove HTML, URLs, and special characters. These don't contribute to sentiment but add noise.

Mixed sentiment is more common than you might expect. A review like "Great product but terrible shipping" is genuinely mixed, and that signal is often more actionable than pure positive or negative.

For cases where the built-in sentiment model doesn't capture your domain's nuances, look into [Amazon Comprehend custom classification](https://oneuptime.com/blog/post/2026-02-12-amazon-comprehend-custom-classification/view) to train a model on your own labeled data.

Sentiment analysis is one of those capabilities that seems simple on the surface but can drive real business decisions when you build the right pipeline around it. Start with batch analysis of your existing feedback data and work up to real-time monitoring from there.
