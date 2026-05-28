# How to Manage Quotas and Rate Limits for Gemini API Requests in Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini API, Quota, Rate Limiting

Description: A practical guide to understanding, monitoring, and managing quotas and rate limits when using Gemini API through Vertex AI on Google Cloud.

---

If you have ever hit a 429 "Resource Exhausted" error while calling the Gemini API through Vertex AI, you know how frustrating throughput limits can be. They tend to show up at the worst possible time - during a demo, a load test, or right when your production traffic spikes. Understanding how quotas and shared throughput work, and how to manage them proactively, is essential for any serious Gemini API integration.

This post covers how quotas and rate limits work for Gemini in Vertex AI, how to monitor them, and what strategies you can use to stay within limits or request increases.

## Understanding Gemini API Quotas

Vertex AI uses different quota systems depending on the Gemini model and consumption mode. Older Gemini models and some non-Gemini models use standard per-project, per-region quotas. Newer Gemini models on Standard PayGo use shared throughput tiers instead of a fixed quota that you can directly increase. The main dimensions you will see are:

**Tokens per minute (TPM)**: The total number of input and output tokens processed per minute. A single large prompt can consume a significant chunk of this quota or throughput allocation.

**Requests per minute (RPM)**: The total number of API calls you can make per minute. For current Standard PayGo Gemini tiers, Google documents token-based baseline throughput and a separate system limit rather than a separate RPM quota per tier.

**Model and modality limits**: Preview models and multimodal requests can have additional model-specific or modality-specific rate limits.

Standard quotas are applied per project and supported region. For Standard PayGo on current Gemini models, the documented usage tiers are based on organization-level traffic sent to the global endpoint.

## Checking Your Current Quotas

The first step is knowing what your current limits are. You can check this in the GCP Console:

1. Go to IAM & Admin > Quotas & System Limits
2. Filter by "Vertex AI API" in the service dropdown
3. Search for "gemini" to see Gemini-specific quotas

Alternatively, use the gcloud CLI to list quotas programmatically:

```bash
# List Vertex AI quota information for your project
gcloud beta quotas info list \
    --service=aiplatform.googleapis.com \
    --project=your-project-id \
    --format="table(quotaId, metric, dimensions)"
```

You can also check quota usage through the Cloud Monitoring API:

```python
from google.cloud import monitoring_v3
import time

# Create a monitoring client
client = monitoring_v3.MetricServiceClient()
project_name = f"projects/your-project-id"

# Define the time interval for the last hour
now = time.time()
interval = monitoring_v3.TimeInterval(
    {
        "end_time": {"seconds": int(now)},
        "start_time": {"seconds": int(now) - 3600},
    }
)

# Query quota usage metrics for Vertex AI
results = client.list_time_series(
    request={
        "name": project_name,
        "filter": 'metric.type = "serviceruntime.googleapis.com/quota/rate/net_usage" AND resource.type = "consumer_quota" AND resource.labels.service = "aiplatform.googleapis.com"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
    }
)

for result in results:
    print(f"Metric: {result.metric.labels}")
    for point in result.points:
        value = point.value.double_value or point.value.int64_value
        print(f"  Value: {value}")
```

## Implementing Client-Side Rate Limiting

Even if GCP enforces quotas server-side, you should implement client-side rate limiting to avoid wasted requests and improve the user experience. Here is a practical implementation using a token bucket approach:

```python
import time
import threading
from google import genai
from google.genai.types import HttpOptions

class GeminiRateLimiter:
    """Simple token bucket rate limiter for Gemini API calls."""

    def __init__(self, requests_per_minute=60):
        self.rate = requests_per_minute / 60.0  # Convert to per-second
        self.tokens = requests_per_minute
        self.max_tokens = requests_per_minute
        self.last_refill = time.monotonic()
        self.lock = threading.Lock()

    def acquire(self):
        """Wait until a token is available, then consume it."""
        while True:
            with self.lock:
                # Refill tokens based on elapsed time
                now = time.monotonic()
                elapsed = now - self.last_refill
                self.tokens = min(
                    self.max_tokens,
                    self.tokens + elapsed * self.rate
                )
                self.last_refill = now

                if self.tokens >= 1:
                    self.tokens -= 1
                    return

            # Wait a short time before trying again
            time.sleep(0.1)

# Initialize the rate limiter based on your quota
limiter = GeminiRateLimiter(requests_per_minute=60)
client = genai.Client(
    vertexai=True,
    project="your-project-id",
    location="global",
    http_options=HttpOptions(api_version="v1"),
)

def call_gemini_with_rate_limit(prompt):
    """Make a Gemini API call with rate limiting."""
    # Wait for available capacity
    limiter.acquire()

    # Make the actual API call
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text
```

## Handling 429 Errors with Exponential Backoff

When you do hit rate limits, implement exponential backoff with jitter to retry gracefully:

```python
import random
import time
from google import genai
from google.genai import errors
from google.genai.types import HttpOptions

client = genai.Client(
    vertexai=True,
    project="your-project-id",
    location="global",
    http_options=HttpOptions(api_version="v1"),
)

def call_gemini_with_retry(prompt, max_retries=5):
    """Call Gemini API with exponential backoff on rate limit errors."""

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text

        except errors.APIError as e:
            if e.code not in (429, 503):
                raise

            if attempt == max_retries - 1:
                raise  # Give up after max retries

            # Calculate backoff with jitter
            base_delay = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
            jitter = random.uniform(0, base_delay * 0.5)
            delay = base_delay + jitter

            print(f"Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1})")
            time.sleep(delay)
```

## Requesting Quota Increases

If your default quotas are not enough for your workload, you can request an increase. Here is how:

1. Go to IAM & Admin > Quotas & System Limits in the GCP Console
2. Select the specific quota you want to increase
3. Click "Edit Quotas" at the top
4. Enter your desired new limit and provide a justification
5. Submit the request

A few tips for getting quota increases approved faster:

- Be specific about why you need the increase. Mention your use case and expected traffic patterns.
- Start with a reasonable request. Asking for 10x your current limit is more likely to be approved than asking for 1000x.
- If you have a launch date or deadline, mention it in the justification.
- For large increases, consider working with your Google Cloud account team.

You can also request quota adjustments for adjustable standard quotas via gcloud. First find the quota ID with `gcloud beta quotas info list`, then create a quota preference:

```bash
# Request a quota adjustment for an adjustable Vertex AI quota
gcloud beta quotas preferences create \
    --project=your-project-id \
    --service=aiplatform.googleapis.com \
    --quota-id=QUOTA_ID \
    --dimensions=region=us-central1 \
    --preferred-value=300 \
    --email=you@example.com \
    --justification="Expected launch traffic for Gemini workload" \
    --preference-id=gemini-quota-us-central1
```

## Multi-Region Load Distribution

For current Standard PayGo Gemini models, prefer the global endpoint because Vertex AI can route traffic to available capacity. For older models with standard regional quotas, you can distribute requests across supported regions when your application can tolerate region failover:

```python
import random
from google import genai
from google.genai.types import HttpOptions

# List of regions where Gemini is available
GEMINI_REGIONS = [
    "us-central1",
    "us-east4",
    "europe-west4",
    "asia-southeast1",
]

def call_gemini_multi_region(prompt):
    """Distribute Gemini calls across regions for higher throughput."""
    # Pick a random region to spread the load
    region = random.choice(GEMINI_REGIONS)

    client = genai.Client(
        vertexai=True,
        project="your-project-id",
        location=region,
        http_options=HttpOptions(api_version="v1"),
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text
```

## Setting Up Quota Alerts

Do not wait until you hit limits to find out about quota issues. Set up alerts in Cloud Monitoring:

```text
# Use this Monitoring filter when creating a quota chart or alert policy
metric.type="serviceruntime.googleapis.com/quota/rate/net_usage"
resource.type="consumer_quota"
resource.labels.service="aiplatform.googleapis.com"
```

## Best Practices Summary

Here is what I have found works best when dealing with Gemini quotas in production:

- Always implement client-side rate limiting. Do not rely solely on server-side enforcement.
- Use exponential backoff with jitter for retries.
- Monitor quota usage and set alerts at 70-80% utilization.
- Use the global endpoint for current Standard PayGo Gemini models, and distribute load across regions only when it fits the quota model and your application's data-residency requirements.
- Request quota increases proactively for adjustable standard quotas, before you need them.
- Cache responses when possible to reduce redundant API calls.
- Use batch endpoints for non-latency-sensitive workloads.

For comprehensive monitoring of your API quota usage and endpoint health, tools like [OneUptime](https://oneuptime.com) can help you track rate limit errors and set up intelligent alerting before quotas become a bottleneck.
