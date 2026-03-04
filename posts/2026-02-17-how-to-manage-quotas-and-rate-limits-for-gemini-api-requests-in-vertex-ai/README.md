# How to Manage Quotas and Rate Limits for Gemini API Requests in Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini API, Quotas, Rate Limiting

Description: A practical guide to understanding, monitoring, and managing quotas and rate limits when using Gemini API through Vertex AI on Google Cloud.

---

If you have ever hit a 429 "Resource Exhausted" error while calling the Gemini API through Vertex AI, you know how frustrating quota limits can be. They tend to show up at the worst possible time - during a demo, a load test, or right when your production traffic spikes. Understanding how quotas work and how to manage them proactively is essential for any serious Gemini API integration.

This post covers how quotas and rate limits work for Gemini in Vertex AI, how to monitor them, and what strategies you can use to stay within limits or request increases.

## Understanding Gemini API Quotas

Vertex AI applies quotas at multiple levels for Gemini API requests. The main dimensions are:

**Requests per minute (RPM)**: The total number of API calls you can make per minute. This applies regardless of how large or small each request is.

**Tokens per minute (TPM)**: The total number of input and output tokens processed per minute. A single large prompt can consume a significant chunk of this quota.

**Requests per day**: Some models also have daily request limits, especially during preview or limited availability phases.

These quotas are applied per project and per region. So if you are running workloads in us-central1 and europe-west4, each region has its own independent quota allocation.

## Checking Your Current Quotas

The first step is knowing what your current limits are. You can check this in the GCP Console:

1. Go to IAM & Admin > Quotas
2. Filter by "Vertex AI API" in the service dropdown
3. Search for "gemini" to see Gemini-specific quotas

Alternatively, use the gcloud CLI to list quotas programmatically:

```bash
# List all Vertex AI quotas for your project
# Filter for Gemini-related entries
gcloud services quotas list \
    --service=aiplatform.googleapis.com \
    --consumer=projects/your-project-id \
    --filter="metric:gemini"
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
        "filter": 'metric.type = "serviceruntime.googleapis.com/quota/rate/net_usage" AND resource.labels.service = "aiplatform.googleapis.com"',
        "interval": interval,
        "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
    }
)

for result in results:
    print(f"Metric: {result.metric.labels}")
    for point in result.points:
        print(f"  Value: {point.value.int64_value}")
```

## Implementing Client-Side Rate Limiting

Even if GCP enforces quotas server-side, you should implement client-side rate limiting to avoid wasted requests and improve the user experience. Here is a practical implementation using a token bucket approach:

```python
import time
import threading
from google.cloud import aiplatform

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

def call_gemini_with_rate_limit(prompt):
    """Make a Gemini API call with rate limiting."""
    # Wait for available capacity
    limiter.acquire()

    # Make the actual API call
    model = aiplatform.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    return response.text
```

## Handling 429 Errors with Exponential Backoff

When you do hit rate limits, implement exponential backoff with jitter to retry gracefully:

```python
import random
import time
from google.api_core import exceptions

def call_gemini_with_retry(prompt, max_retries=5):
    """Call Gemini API with exponential backoff on rate limit errors."""

    model = aiplatform.GenerativeModel("gemini-1.5-pro")

    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            return response.text

        except exceptions.ResourceExhausted as e:
            if attempt == max_retries - 1:
                raise  # Give up after max retries

            # Calculate backoff with jitter
            base_delay = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
            jitter = random.uniform(0, base_delay * 0.5)
            delay = base_delay + jitter

            print(f"Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1})")
            time.sleep(delay)

        except exceptions.ServiceUnavailable:
            # Also retry on temporary service issues
            time.sleep(2 ** attempt)
```

## Requesting Quota Increases

If your default quotas are not enough for your workload, you can request an increase. Here is how:

1. Go to IAM & Admin > Quotas in the GCP Console
2. Select the specific quota you want to increase
3. Click "Edit Quotas" at the top
4. Enter your desired new limit and provide a justification
5. Submit the request

A few tips for getting quota increases approved faster:

- Be specific about why you need the increase. Mention your use case and expected traffic patterns.
- Start with a reasonable request. Asking for 10x your current limit is more likely to be approved than asking for 1000x.
- If you have a launch date or deadline, mention it in the justification.
- For large increases, consider working with your Google Cloud account team.

You can also request increases via gcloud:

```bash
# Request a quota increase for Gemini RPM
gcloud alpha services quotas update \
    --service=aiplatform.googleapis.com \
    --consumer=projects/your-project-id \
    --metric=aiplatform.googleapis.com/gemini_requests_per_minute \
    --unit=1/min/{project} \
    --value=300
```

## Multi-Region Load Distribution

One effective strategy for handling high throughput is distributing requests across multiple regions. Since quotas are per-region, this effectively multiplies your available capacity:

```python
import random
from google.cloud import aiplatform

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

    aiplatform.init(
        project="your-project-id",
        location=region,
    )

    model = aiplatform.GenerativeModel("gemini-1.5-pro")
    response = model.generate_content(prompt)
    return response.text
```

## Setting Up Quota Alerts

Do not wait until you hit limits to find out about quota issues. Set up alerts in Cloud Monitoring:

```bash
# Create an alert policy for quota usage above 80%
gcloud alpha monitoring policies create \
    --notification-channels="projects/your-project-id/notificationChannels/CHANNEL_ID" \
    --display-name="Gemini Quota Alert" \
    --condition-display-name="Gemini RPM above 80%" \
    --condition-filter='metric.type="serviceruntime.googleapis.com/quota/rate/net_usage" AND resource.labels.service="aiplatform.googleapis.com"' \
    --condition-threshold-value=0.8 \
    --condition-threshold-comparison=COMPARISON_GT
```

## Best Practices Summary

Here is what I have found works best when dealing with Gemini quotas in production:

- Always implement client-side rate limiting. Do not rely solely on server-side enforcement.
- Use exponential backoff with jitter for retries.
- Monitor quota usage and set alerts at 70-80% utilization.
- Distribute load across regions when high throughput is needed.
- Request quota increases proactively, before you need them.
- Cache responses when possible to reduce redundant API calls.
- Use batch endpoints for non-latency-sensitive workloads.

For comprehensive monitoring of your API quota usage and endpoint health, tools like [OneUptime](https://oneuptime.com) can help you track rate limit errors and set up intelligent alerting before quotas become a bottleneck.
