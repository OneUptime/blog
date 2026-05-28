# How to Configure Rate Limiting and Quotas for Cloud Endpoints APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, Rate Limiting, Quota, API Management

Description: Learn how to configure rate limiting and quotas for Google Cloud Endpoints APIs to protect your backend from overuse and enforce fair usage policies.

---

Without rate limiting, a single misbehaving client can overwhelm your API backend. Cloud Endpoints provides built-in quota management that lets you define per-consumer rate limits, enforce them at the proxy level, and track usage over time. Clients that exceed their quotas get a clear 429 Too Many Requests response, and your backend stays healthy.

This guide covers setting up quotas in your OpenAPI specification, configuring per-method limits, managing consumer quotas, and monitoring usage.

## How Quotas Work in Cloud Endpoints

Cloud Endpoints quotas work through the Service Control API. When a request comes in:

1. ESPv2 checks the API key to identify the consumer
2. ESPv2 allocates quota through Service Control
3. Service Control evaluates the allocation against the consumer's quota
4. If under quota, the request proceeds
5. If over quota, ESPv2 returns a 429 response

Quotas are tracked per consumer project, identified from the API key, and Cloud Endpoints OpenAPI quotas currently support per-minute, per-project limits.

## Prerequisites

- Cloud Endpoints deployed with API key validation enabled
- Service Management API and Service Control API enabled
- API consumers identified by API keys

```bash
# Enable required APIs

gcloud services enable \
  servicemanagement.googleapis.com \
  servicecontrol.googleapis.com \
  endpoints.googleapis.com \
  --project=my-project-id
```

## Step 1: Define Quota Metrics in the OpenAPI Spec

Quota configuration in Cloud Endpoints uses Google's service extensions. You define quota metrics (what you are counting) and quota limits (how much is allowed).

```yaml
# openapi-with-quotas.yaml
swagger: "2.0"
info:
  title: "Weather API"
  version: "1.0.0"
host: "weather-api.endpoints.my-project-id.cloud.goog"
basePath: "/"
schemes:
  - "https"

x-google-backend:
  address: "https://weather-backend-abc123-uc.a.run.app"

# API key authentication (required for quota tracking)
securityDefinitions:
  api_key:
    type: "apiKey"
    name: "key"
    in: "query"

security:
  - api_key: []

# Define quota metrics and limits
x-google-management:
  metrics:
    # Define a metric for read requests
    - name: "read-requests"
      displayName: "Read Requests"
      valueType: INT64
      metricKind: DELTA
    # Define a metric for write requests
    - name: "write-requests"
      displayName: "Write Requests"
      valueType: INT64
      metricKind: DELTA

  quota:
    limits:
      # 1000 read requests per minute per consumer
      - name: "read-requests-per-minute"
        metric: "read-requests"
        unit: "1/min/{project}"
        values:
          STANDARD: 1000
      # 100 write requests per minute per consumer
      - name: "write-requests-per-minute"
        metric: "write-requests"
        unit: "1/min/{project}"
        values:
          STANDARD: 100
paths:
  /current:
    get:
      summary: "Get current weather"
      operationId: "getCurrentWeather"
      # This endpoint consumes read quota
      x-google-quota:
        metricCosts:
          "read-requests": 1
      parameters:
        - name: "city"
          in: "query"
          type: "string"
          required: true
      responses:
        200:
          description: "Current weather"
        429:
          description: "Quota exceeded"

  /forecast:
    get:
      summary: "Get weather forecast"
      operationId: "getWeatherForecast"
      # Forecasts cost more because they are more expensive to compute
      x-google-quota:
        metricCosts:
          "read-requests": 5
      parameters:
        - name: "city"
          in: "query"
          type: "string"
          required: true
      responses:
        200:
          description: "Weather forecast"
        429:
          description: "Quota exceeded"

  /alerts:
    post:
      summary: "Create weather alert"
      operationId: "createAlert"
      # Write operations use the write quota
      x-google-quota:
        metricCosts:
          "write-requests": 1
      parameters:
        - name: "body"
          in: "body"
          required: true
          schema:
            type: "object"
      responses:
        201:
          description: "Alert created"
        429:
          description: "Quota exceeded"
```

Let me break down the key concepts:

- **Metrics** define what you are counting. You can have multiple metrics (e.g., read requests and write requests).
- **Limits** define how much of each metric is allowed per time period.
- **Metric costs** on each path define how much quota each API call consumes. A simple GET might cost 1 unit, while an expensive operation might cost 5.
- The `{project}` in the unit means the limit is per consumer project.

## Step 2: Deploy the Configuration

Deploy the updated OpenAPI spec.

```bash
# Deploy with quota configuration
gcloud endpoints services deploy openapi-with-quotas.yaml --project=my-project-id
```

## Step 3: Override Quotas for Specific Consumers

The STANDARD values in the spec are defaults for all consumers. You can override them for specific consumers (by project).

```bash
# Give a premium consumer higher limits
gcloud alpha endpoints quota create \
  --service=weather-api.endpoints.my-project-id.cloud.goog \
  --consumer=projects/premium-customer-project \
  --metric=read-requests \
  --unit="1/min/{project}" \
  --value=5000 \
  --project=my-project-id

# Give another consumer lower limits (restrict a misbehaving client)
gcloud alpha endpoints quota create \
  --service=weather-api.endpoints.my-project-id.cloud.goog \
  --consumer=projects/restricted-customer-project \
  --metric=read-requests \
  --unit="1/min/{project}" \
  --value=100 \
  --project=my-project-id
```

## Step 4: Test Rate Limiting

Verify that quota enforcement works.

```bash
# Send requests in a loop to trigger rate limiting
for i in $(seq 1 1100); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://weather-api.endpoints.my-project-id.cloud.goog/current?city=Seattle&key=YOUR_API_KEY")
  echo "Request $i: $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo "Rate limited after $i requests"
    break
  fi
done
```

When the quota is exceeded, the response will look like this.

Because Endpoints batches quota allocation calls to reduce request latency, the exact request that receives the 429 response can vary.

```json
{
  "code": 429,
  "message": "Quota exceeded for quota metric 'read-requests' and limit 'read-requests-per-minute' of service 'weather-api.endpoints.my-project-id.cloud.goog'.",
  "status": "RESOURCE_EXHAUSTED"
}
```

## Step 5: Implement Different Quota Tiers

A common pattern is to offer different tiers of service with different quota limits.

```yaml
# Define the quota limits with different tiers in mind
x-google-management:
  metrics:
    - name: "api-requests"
      displayName: "API Requests"
      valueType: INT64
      metricKind: DELTA

  quota:
    limits:
      # Default (free tier) - 100 requests per minute
      - name: "api-requests-per-minute"
        metric: "api-requests"
        unit: "1/min/{project}"
        values:
          STANDARD: 100
```

Then use overrides to implement tiers.

```bash
# Basic tier: 500/min
gcloud alpha endpoints quota create \
  --service=weather-api.endpoints.my-project-id.cloud.goog \
  --consumer=projects/basic-tier-project \
  --metric=api-requests \
  --unit="1/min/{project}" \
  --value=500

# Premium tier: 5000/min
gcloud alpha endpoints quota create \
  --service=weather-api.endpoints.my-project-id.cloud.goog \
  --consumer=projects/premium-tier-project \
  --metric=api-requests \
  --unit="1/min/{project}" \
  --value=5000
```

## Step 6: Monitor Quota Usage

Track how consumers are using their quotas.

In Cloud Monitoring Metrics Explorer, select the Consumer Quota resource and the Allocation quota usage metric. The equivalent Monitoring filter is `metric.type="serviceruntime.googleapis.com/quota/allocation/usage" AND resource.type="consumer_quota"`.

Set up alerts when consumers approach their limits.

```bash
# Alert when absolute quota usage exceeds 800 units
gcloud monitoring policies create \
  --display-name="Quota Usage Warning" \
  --condition-display-name="Consumer approaching quota limit" \
  --condition-filter='metric.type="serviceruntime.googleapis.com/quota/allocation/usage" AND resource.type="consumer_quota"' \
  --if="> 800" \
  --duration=60s \
  --notification-channels=CHANNEL_ID \
  --project=my-project-id
```

## Handling Quota in Client Applications

Good API clients should handle 429 responses gracefully with exponential backoff.

```python
# Python example: API client with quota-aware retry logic
import time
import requests

def call_api_with_retry(url, api_key, max_retries=5):
    """Makes an API call with exponential backoff on 429 responses."""
    for attempt in range(max_retries):
        response = requests.get(url, params={"key": api_key})

        if response.status_code == 200:
            return response.json()

        if response.status_code == 429:
            # Quota exceeded - wait and retry with exponential backoff
            wait_time = (2 ** attempt) + 1
            print(f"Rate limited. Waiting {wait_time} seconds before retry...")
            time.sleep(wait_time)
            continue

        # Other errors - raise immediately
        response.raise_for_status()

    raise Exception("Max retries exceeded due to rate limiting")
```

## Including Quota Information in Response Headers

If you need rate limit headers, your backend can calculate them from its own tracking and include them in responses to help clients manage their usage.

```python
# Flask backend example: adding rate limit headers
from flask import Flask

app = Flask(__name__)

@app.after_request
def add_rate_limit_headers(response):
    # These values would come from your own tracking
    response.headers['X-RateLimit-Limit'] = '1000'
    response.headers['X-RateLimit-Remaining'] = '950'
    response.headers['X-RateLimit-Reset'] = '1609459200'
    return response
```

## Summary

Quota management in Cloud Endpoints protects your backend from overuse and lets you offer different service tiers to different consumers. Define metrics for what you want to count, set per-minute limits, and assign costs to each API method based on its expense. Use quota overrides to customize limits per consumer, and monitor usage to catch consumers approaching their limits. Client applications should implement exponential backoff to handle 429 responses gracefully.
