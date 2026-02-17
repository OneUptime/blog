# How to Combine Cloud Natural Language API with BigQuery for Large-Scale Text Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Natural Language API, BigQuery, Text Analysis, NLP

Description: Learn how to combine Google Cloud Natural Language API with BigQuery to perform sentiment analysis, entity extraction, and text classification at scale on large datasets.

---

When you have a handful of documents to analyze, calling the Cloud Natural Language API directly works just fine. But what happens when you have millions of customer reviews, support tickets, or social media posts? You need a pipeline that can handle text analysis at scale, and that is where combining the Natural Language API with BigQuery becomes incredibly powerful.

In this guide, I will walk you through building a pipeline that takes text data stored in BigQuery, runs it through the Cloud Natural Language API for sentiment analysis and entity extraction, and writes the results back to BigQuery for querying and visualization.

## Why This Combination Works

BigQuery handles massive datasets without breaking a sweat. It can store and query petabytes of data. The Cloud Natural Language API provides pre-trained models for sentiment analysis, entity recognition, syntax analysis, and content classification. By connecting the two, you get a system that can process enormous volumes of text and store the enriched results in a queryable format.

Think of it this way: BigQuery is your data warehouse, and the Natural Language API is your text understanding engine. Together, they form a pipeline where raw text goes in and structured insights come out.

## Prerequisites

Before getting started, make sure you have the following:

- A GCP project with billing enabled
- The Cloud Natural Language API enabled
- BigQuery API enabled
- A service account with appropriate permissions
- Python 3.8+ installed locally
- The google-cloud-language and google-cloud-bigquery Python libraries

Install the required libraries with pip.

```bash
# Install both the Natural Language and BigQuery client libraries
pip install google-cloud-language google-cloud-bigquery
```

## Step 1: Prepare Your Text Data in BigQuery

First, you need text data in BigQuery. Let's say you have a table of customer reviews. Here is a schema example and a way to load some sample data.

```sql
-- Create a dataset and table for customer reviews
CREATE SCHEMA IF NOT EXISTS text_analysis;

CREATE TABLE IF NOT EXISTS text_analysis.customer_reviews (
  review_id STRING,
  review_text STRING,
  created_at TIMESTAMP,
  product_id STRING
);

-- Insert some sample data
INSERT INTO text_analysis.customer_reviews VALUES
  ('r001', 'This product is amazing! Best purchase I have made all year.', CURRENT_TIMESTAMP(), 'p100'),
  ('r002', 'Terrible quality. Broke after two days of use.', CURRENT_TIMESTAMP(), 'p101'),
  ('r003', 'Decent product for the price. Shipping was fast.', CURRENT_TIMESTAMP(), 'p100');
```

## Step 2: Create the Results Table

You need a destination table where the analysis results will be stored.

```sql
-- Table to store sentiment and entity analysis results
CREATE TABLE IF NOT EXISTS text_analysis.review_analysis (
  review_id STRING,
  review_text STRING,
  sentiment_score FLOAT64,
  sentiment_magnitude FLOAT64,
  entities ARRAY<STRUCT<name STRING, type STRING, salience FLOAT64>>,
  analyzed_at TIMESTAMP
);
```

## Step 3: Build the Processing Pipeline

Here is the Python script that reads text from BigQuery, sends it to the Natural Language API, and writes the results back.

```python
from google.cloud import language_v1
from google.cloud import bigquery
from google.cloud.language_v1 import types
import time

# Initialize clients for both services
language_client = language_v1.LanguageServiceClient()
bq_client = bigquery.Client()

def analyze_text(text):
    """Send text to the Natural Language API for sentiment and entity analysis."""
    document = types.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT
    )

    # Get sentiment for the overall document
    sentiment_response = language_client.analyze_sentiment(
        request={"document": document}
    )
    sentiment = sentiment_response.document_sentiment

    # Extract entities from the text
    entity_response = language_client.analyze_entities(
        request={"document": document}
    )

    entities = []
    for entity in entity_response.entities:
        entities.append({
            "name": entity.name,
            "type": language_v1.Entity.Type(entity.type_).name,
            "salience": round(entity.salience, 4)
        })

    return {
        "sentiment_score": round(sentiment.score, 4),
        "sentiment_magnitude": round(sentiment.magnitude, 4),
        "entities": entities
    }

def process_reviews_batch(batch_size=100):
    """Fetch unprocessed reviews from BigQuery and analyze them."""
    # Query reviews that have not been analyzed yet
    query = """
        SELECT r.review_id, r.review_text
        FROM text_analysis.customer_reviews r
        LEFT JOIN text_analysis.review_analysis a
          ON r.review_id = a.review_id
        WHERE a.review_id IS NULL
        LIMIT @batch_size
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("batch_size", "INT64", batch_size)
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()

    rows_to_insert = []

    for row in results:
        try:
            # Analyze each review with the Natural Language API
            analysis = analyze_text(row.review_text)

            rows_to_insert.append({
                "review_id": row.review_id,
                "review_text": row.review_text,
                "sentiment_score": analysis["sentiment_score"],
                "sentiment_magnitude": analysis["sentiment_magnitude"],
                "entities": analysis["entities"],
                "analyzed_at": "AUTO"
            })

            # Respect API rate limits
            time.sleep(0.1)

        except Exception as e:
            print(f"Error processing review {row.review_id}: {e}")
            continue

    if rows_to_insert:
        # Write results back to BigQuery
        table_ref = bq_client.dataset("text_analysis").table("review_analysis")
        errors = bq_client.insert_rows_json(table_ref, rows_to_insert)

        if errors:
            print(f"Errors inserting rows: {errors}")
        else:
            print(f"Successfully analyzed and stored {len(rows_to_insert)} reviews")

# Run the processing pipeline
process_reviews_batch(batch_size=500)
```

## Step 4: Scale with Cloud Functions

For production use, you do not want to run this from your laptop. Wrap the processing logic in a Cloud Function that triggers on a schedule.

```python
import functions_framework
from google.cloud import language_v1, bigquery

# This function runs on a Cloud Scheduler trigger
@functions_framework.cloud_event
def process_reviews(cloud_event):
    """Cloud Function to process reviews on a schedule."""
    bq_client = bigquery.Client()
    language_client = language_v1.LanguageServiceClient()

    # Fetch and process in batches of 200
    query = """
        SELECT r.review_id, r.review_text
        FROM text_analysis.customer_reviews r
        LEFT JOIN text_analysis.review_analysis a
          ON r.review_id = a.review_id
        WHERE a.review_id IS NULL
        LIMIT 200
    """

    results = bq_client.query(query).result()
    processed = 0

    for row in results:
        document = language_v1.Document(
            content=row.review_text,
            type_=language_v1.Document.Type.PLAIN_TEXT
        )

        sentiment = language_client.analyze_sentiment(
            request={"document": document}
        ).document_sentiment

        # Insert result directly
        insert_query = f"""
            INSERT INTO text_analysis.review_analysis
            (review_id, review_text, sentiment_score, sentiment_magnitude, analyzed_at)
            VALUES ('{row.review_id}', '{row.review_text}',
                    {sentiment.score}, {sentiment.magnitude}, CURRENT_TIMESTAMP())
        """
        bq_client.query(insert_query).result()
        processed += 1

    print(f"Processed {processed} reviews")
```

## Step 5: Query the Enriched Data

Once you have analysis results in BigQuery, you can run powerful queries to gain insights.

```sql
-- Find the average sentiment by product
SELECT
  r.product_id,
  COUNT(*) as review_count,
  ROUND(AVG(a.sentiment_score), 3) as avg_sentiment,
  ROUND(AVG(a.sentiment_magnitude), 3) as avg_magnitude
FROM text_analysis.customer_reviews r
JOIN text_analysis.review_analysis a ON r.review_id = a.review_id
GROUP BY r.product_id
ORDER BY avg_sentiment DESC;

-- Find the most mentioned entities across all negative reviews
SELECT
  entity.name,
  entity.type,
  COUNT(*) as mention_count,
  ROUND(AVG(entity.salience), 3) as avg_salience
FROM text_analysis.review_analysis,
  UNNEST(entities) as entity
WHERE sentiment_score < -0.3
GROUP BY entity.name, entity.type
ORDER BY mention_count DESC
LIMIT 20;
```

## Handling Rate Limits and Costs

The Cloud Natural Language API has quotas. The default is 600 requests per minute. For large-scale processing, consider these strategies:

- **Batch processing**: Process records in chunks rather than all at once
- **Exponential backoff**: Implement retry logic with increasing delays when you hit rate limits
- **Request quotas**: Request a quota increase through the GCP Console if needed
- **Cost monitoring**: Each API call costs money, so set up budget alerts in GCP

For very large datasets (millions of rows), consider using Dataflow to orchestrate the pipeline. Dataflow can automatically scale workers and manage the parallelism for you.

## Monitoring Your Pipeline

Set up monitoring so you know when things go wrong. Use Cloud Monitoring to track API call counts and error rates. You can also query BigQuery directly to check processing progress.

```sql
-- Check how many reviews are still waiting to be processed
SELECT
  (SELECT COUNT(*) FROM text_analysis.customer_reviews) as total_reviews,
  (SELECT COUNT(*) FROM text_analysis.review_analysis) as analyzed_reviews,
  (SELECT COUNT(*) FROM text_analysis.customer_reviews r
   LEFT JOIN text_analysis.review_analysis a ON r.review_id = a.review_id
   WHERE a.review_id IS NULL) as pending_reviews;
```

## Wrapping Up

Combining the Cloud Natural Language API with BigQuery gives you a scalable text analysis pipeline that can handle anything from a few hundred documents to millions. The key is to structure the pipeline so that BigQuery holds both your raw text and your enriched results, while the Natural Language API does the heavy lifting of understanding the text. With Cloud Functions and Cloud Scheduler handling the orchestration, the whole system runs hands-free once it is set up.
