# How to Use BigQuery Remote Functions to Call Cloud Functions from SQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Remote Functions, Cloud Functions, SQL

Description: Learn how to use BigQuery remote functions to call Cloud Functions directly from SQL queries, enabling custom transformations, API calls, and ML inference within your analytics workflows.

---

BigQuery is powerful for analytics, but sometimes you need to do things that SQL alone cannot handle. Maybe you need to call an external API to enrich your data, run a custom ML model on each row, perform complex text transformations, or validate data against an external system. BigQuery remote functions let you call a Cloud Function or Cloud Run service directly from a SQL query, bridging the gap between SQL analytics and custom code.

This guide shows you how to set up remote functions, build the backend services, and use them effectively in your queries.

## How Remote Functions Work

When you call a remote function in a SQL query, BigQuery batches the input rows and sends them as HTTP POST requests to your Cloud Function or Cloud Run endpoint. The endpoint processes the batch and returns the results. BigQuery maps the results back to the corresponding rows and continues query execution.

The process is designed for batch operations - BigQuery sends rows in groups rather than one at a time, which keeps the overhead manageable even for large datasets.

## Step 1: Create the Cloud Function Backend

Let us start with a practical example - a function that performs sentiment analysis on text data.

```python
# main.py - Cloud Function for sentiment analysis
import json
import functions_framework
from google.cloud import language_v1

# Initialize the NLP client outside the function for reuse
nlp_client = language_v1.LanguageServiceClient()

@functions_framework.http
def analyze_sentiment(request):
    """Process a batch of text inputs and return sentiment scores.

    BigQuery sends requests in this format:
    {
        "requestId": "unique-id",
        "caller": "//bigquery.googleapis.com/...",
        "sessionUser": "user@domain.com",
        "calls": [
            ["text to analyze"],
            ["another text"],
            ...
        ]
    }
    """
    request_json = request.get_json()
    calls = request_json.get("calls", [])

    replies = []
    for call in calls:
        text = call[0]  # First argument passed to the function

        if not text or len(text.strip()) == 0:
            # Handle empty text gracefully
            replies.append(json.dumps({
                "score": 0.0,
                "magnitude": 0.0,
                "label": "NEUTRAL",
            }))
            continue

        try:
            # Analyze sentiment using the NLP API
            document = language_v1.Document(
                content=text[:5000],  # Limit text length
                type_=language_v1.Document.Type.PLAIN_TEXT,
            )
            response = nlp_client.analyze_sentiment(
                request={"document": document}
            )

            sentiment = response.document_sentiment
            label = "POSITIVE" if sentiment.score > 0.25 else (
                "NEGATIVE" if sentiment.score < -0.25 else "NEUTRAL"
            )

            replies.append(json.dumps({
                "score": round(sentiment.score, 3),
                "magnitude": round(sentiment.magnitude, 3),
                "label": label,
            }))
        except Exception as e:
            replies.append(json.dumps({
                "score": 0.0,
                "magnitude": 0.0,
                "label": "ERROR",
                "error": str(e),
            }))

    # Return results in the format BigQuery expects
    return json.dumps({"replies": replies})
```

Deploy the function:

```bash
# Deploy the Cloud Function
gcloud functions deploy analyze-sentiment \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=analyze_sentiment \
  --trigger-http \
  --no-allow-unauthenticated \
  --memory=512MB \
  --timeout=120 \
  --min-instances=1 \
  --max-instances=10

# Get the function URL
FUNCTION_URL=$(gcloud functions describe analyze-sentiment \
  --gen2 --region=us-central1 --format="value(serviceConfig.uri)")
echo $FUNCTION_URL
```

## Step 2: Create a BigQuery Connection

BigQuery needs a connection resource to authenticate with your Cloud Function.

```bash
# Create a BigQuery connection for Cloud Resources
bq mk --connection \
  --connection_type=CLOUD_RESOURCE \
  --project_id=PROJECT_ID \
  --location=US \
  remote-functions-connection

# Get the service account associated with the connection
CONNECTION_SA=$(bq show --connection --format=json \
  PROJECT_ID.US.remote-functions-connection | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['cloudResource']['serviceAccountId'])")

echo "Connection service account: $CONNECTION_SA"

# Grant the connection service account permission to invoke the Cloud Function
gcloud functions add-invoker-policy-binding analyze-sentiment \
  --gen2 \
  --region=us-central1 \
  --member="serviceAccount:$CONNECTION_SA"
```

## Step 3: Create the Remote Function in BigQuery

Now register the Cloud Function as a BigQuery remote function.

```sql
-- Create the remote function that points to your Cloud Function
CREATE OR REPLACE FUNCTION `PROJECT_ID.my_dataset.analyze_sentiment`(text STRING)
RETURNS STRING
REMOTE WITH CONNECTION `PROJECT_ID.US.remote-functions-connection`
OPTIONS (
    endpoint = 'https://us-central1-PROJECT_ID.cloudfunctions.net/analyze-sentiment',
    max_batching_rows = 100  -- Process 100 rows per request
);
```

## Step 4: Use the Remote Function in Queries

Now you can call your function directly in SQL queries.

```sql
-- Analyze sentiment of customer reviews
SELECT
    review_id,
    review_text,
    `PROJECT_ID.my_dataset.analyze_sentiment`(review_text) AS sentiment_analysis
FROM `PROJECT_ID.my_dataset.customer_reviews`
WHERE review_date >= '2026-02-01'
LIMIT 1000;

-- Parse the JSON result and use it for filtering
WITH analyzed AS (
    SELECT
        review_id,
        review_text,
        JSON_EXTRACT_SCALAR(
            `PROJECT_ID.my_dataset.analyze_sentiment`(review_text),
            '$.score'
        ) AS sentiment_score,
        JSON_EXTRACT_SCALAR(
            `PROJECT_ID.my_dataset.analyze_sentiment`(review_text),
            '$.label'
        ) AS sentiment_label
    FROM `PROJECT_ID.my_dataset.customer_reviews`
    WHERE review_date >= '2026-02-01'
)
SELECT *
FROM analyzed
WHERE sentiment_label = 'NEGATIVE'
AND CAST(sentiment_score AS FLOAT64) < -0.5
ORDER BY CAST(sentiment_score AS FLOAT64) ASC;
```

## Step 5: Build More Practical Remote Functions

### Geocoding Function

```python
# geocode_function/main.py
import json
import functions_framework
import googlemaps

gmaps = googlemaps.Client(key="YOUR_MAPS_API_KEY")

@functions_framework.http
def geocode_address(request):
    """Convert addresses to latitude/longitude coordinates."""
    request_json = request.get_json()
    calls = request_json.get("calls", [])

    replies = []
    for call in calls:
        address = call[0]

        if not address:
            replies.append(json.dumps({"lat": None, "lng": None}))
            continue

        try:
            result = gmaps.geocode(address)
            if result:
                location = result[0]["geometry"]["location"]
                replies.append(json.dumps({
                    "lat": location["lat"],
                    "lng": location["lng"],
                    "formatted": result[0]["formatted_address"],
                }))
            else:
                replies.append(json.dumps({"lat": None, "lng": None}))
        except Exception as e:
            replies.append(json.dumps({"lat": None, "lng": None, "error": str(e)}))

    return json.dumps({"replies": replies})
```

### Data Validation Function

```python
# validate_function/main.py
import json
import re
import functions_framework

@functions_framework.http
def validate_data(request):
    """Validate data fields against business rules."""
    request_json = request.get_json()
    calls = request_json.get("calls", [])

    replies = []
    for call in calls:
        field_type = call[0]  # e.g., "email", "phone", "ssn"
        value = call[1]

        validation_result = validate_field(field_type, value)
        replies.append(json.dumps(validation_result))

    return json.dumps({"replies": replies})

def validate_field(field_type, value):
    """Validate a field value based on its type."""
    validators = {
        "email": lambda v: bool(re.match(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v or ''
        )),
        "phone": lambda v: bool(re.match(
            r'^\+?1?\d{10,15}$', re.sub(r'[\s\-\(\)]', '', v or '')
        )),
        "url": lambda v: bool(re.match(
            r'^https?://[^\s]+$', v or ''
        )),
    }

    validator = validators.get(field_type)
    if not validator:
        return {"valid": False, "reason": f"Unknown field type: {field_type}"}

    is_valid = validator(value)
    return {
        "valid": is_valid,
        "reason": None if is_valid else f"Invalid {field_type} format",
    }
```

Register both functions in BigQuery:

```sql
-- Create the geocoding remote function
CREATE OR REPLACE FUNCTION `PROJECT_ID.my_dataset.geocode`(address STRING)
RETURNS STRING
REMOTE WITH CONNECTION `PROJECT_ID.US.remote-functions-connection`
OPTIONS (
    endpoint = 'https://us-central1-PROJECT_ID.cloudfunctions.net/geocode-address',
    max_batching_rows = 50
);

-- Create the validation remote function
CREATE OR REPLACE FUNCTION `PROJECT_ID.my_dataset.validate_field`(
    field_type STRING,
    field_value STRING
)
RETURNS STRING
REMOTE WITH CONNECTION `PROJECT_ID.US.remote-functions-connection`
OPTIONS (
    endpoint = 'https://us-central1-PROJECT_ID.cloudfunctions.net/validate-data',
    max_batching_rows = 200
);

-- Use the validation function to find bad data
SELECT
    customer_id,
    email,
    JSON_EXTRACT_SCALAR(
        `PROJECT_ID.my_dataset.validate_field`('email', email),
        '$.valid'
    ) AS email_valid,
    phone,
    JSON_EXTRACT_SCALAR(
        `PROJECT_ID.my_dataset.validate_field`('phone', phone),
        '$.valid'
    ) AS phone_valid
FROM `PROJECT_ID.my_dataset.customers`
WHERE DATE(created_at) = CURRENT_DATE();
```

## Performance Tips

Remote functions add latency because of the HTTP round-trips. Here are ways to keep things fast. Use `max_batching_rows` to control batch size - larger batches mean fewer HTTP calls but more memory usage per call. Set `min-instances=1` on your Cloud Function to avoid cold start latency. Filter your data before applying the remote function to minimize the number of rows processed. Cache results in a separate table if you are calling the function on the same data repeatedly.

```sql
-- Good: Filter first, then apply remote function
SELECT
    review_id,
    `PROJECT_ID.my_dataset.analyze_sentiment`(review_text) AS sentiment
FROM `PROJECT_ID.my_dataset.customer_reviews`
WHERE review_date = CURRENT_DATE()  -- Filter first to reduce rows
AND review_text IS NOT NULL;         -- Skip nulls

-- Bad: Apply remote function to entire table
SELECT
    review_id,
    `PROJECT_ID.my_dataset.analyze_sentiment`(review_text) AS sentiment
FROM `PROJECT_ID.my_dataset.customer_reviews`;  -- Processes everything
```

BigQuery remote functions are a powerful bridge between SQL analytics and custom code. They let you keep your analysis workflow in SQL while reaching out to external services, ML models, and custom logic when needed. The key is to design your Cloud Functions to handle batches efficiently and to filter your data before applying remote functions to keep costs and latency reasonable.
