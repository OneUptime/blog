# How to Resolve HTTP 429 Too Many Requests Errors from GCP APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, API Rate Limiting, Quota, Troubleshooting, Cloud API

Description: Learn how to diagnose and resolve HTTP 429 Too Many Requests errors from Google Cloud Platform APIs using rate limiting strategies, exponential backoff, and quota management.

---

You are making API calls to a GCP service and suddenly start getting HTTP 429 responses. This is GCP telling you that you are sending requests too fast or have exceeded a rate quota. Some quota exceeded errors are about total resource usage, but 429 errors are usually about request velocity - how many API calls you are making per second or per minute.

The fix depends on why you are hitting the rate limit and which API it is. Let me walk through the diagnosis and solutions.

## Understanding the Error

The 429 error typically looks like this:

```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute' of service 'compute.googleapis.com'.",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

Or from gcloud:

```text
ERROR: (gcloud.compute.instances.list) HttpError accessing
https://compute.googleapis.com/compute/v1/projects/my-project/zones/us-central1-a/instances:
response: <{status: 429}>, Quota exceeded for quota metric 'Requests' and limit
'Requests per 100 seconds' of service 'compute.googleapis.com'.
```

The message tells you which metric and limit you exceeded. This information is crucial for the fix.

## Step 1: Identify the Rate Limit

Check which API and which quota metric is being exceeded:

```bash
# View your project's quota usage for a specific API

gcloud beta quotas info list \
    --service=compute.googleapis.com \
    --project=my-project

# Check recent 429 errors in the logs
gcloud logging read \
    'httpRequest.status=429' \
    --project=my-project \
    --limit=20 \
    --format="table(timestamp, httpRequest.requestUrl, httpRequest.status)"
```

Common rate limits across GCP APIs vary by API method, region, project, and account. Always check the current quota page for your project, but these examples show the kind of limits you might run into:

| API | Default Rate Limit | Unit |
|---|---|---|
| Compute Engine | Varies by method group, enforced per minute | Per project |
| Cloud Storage | Initially about 5000 object reads/second, then scales as needed | Per bucket |
| BigQuery | Dynamic query concurrency; specific limits also apply to queued jobs, remote functions, and external data sources | Per project |
| Cloud SQL Admin | 500 get/list requests/minute and 180 mutate requests/minute | Per user, per region |
| Pub/Sub | Publisher throughput is measured in kB/minute by region size | Per project, per region |
| Cloud Run functions | 5000 read API calls/100 seconds for 1st gen; 1200 read API calls/60 seconds for 2nd gen | Per project or per region, depending on generation |
| IAM | 6000 read requests/minute and 600 write requests/minute for the IAM v1 API | Per project |

## Step 2: Implement Exponential Backoff

The first line of defense is implementing exponential backoff with jitter in your code. When you get a 429, wait before retrying, and increase the wait time with each retry.

Here is a Python implementation:

```python
from google.api_core import exceptions, retry

# Using google-cloud library's built-in retry
# Most Google Cloud client libraries support automatic retry
from google.cloud import storage

# The client libraries handle 429 retries automatically
# But you can customize the behavior
client = storage.Client()

# Custom retry configuration
custom_retry = retry.Retry(
    initial=1.0,        # First retry after 1 second
    maximum=60.0,        # Maximum wait of 60 seconds
    multiplier=2.0,      # Double the wait time each retry
    timeout=300.0,       # Give up after 5 minutes total
    predicate=retry.if_exception_type(
        exceptions.TooManyRequests,
        exceptions.ServiceUnavailable,
    ),
)

# Use the custom retry
bucket = client.get_bucket("my-bucket", retry=custom_retry)
```

Manual implementation for any HTTP client:

```python
import time
import random
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import requests

def parse_retry_after(value):
    """Parse Retry-After as seconds or an HTTP date."""
    try:
        return int(value)
    except ValueError:
        retry_at = parsedate_to_datetime(value)
        if retry_at.tzinfo is None:
            retry_at = retry_at.replace(tzinfo=timezone.utc)
        return max(0, (retry_at - datetime.now(timezone.utc)).total_seconds())

def call_with_backoff(url, headers, max_retries=5):
    """Make an API call with exponential backoff on 429 errors."""
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)

        if response.status_code == 429:
            # Calculate wait time with exponential backoff and jitter
            wait_time = min(60, (2 ** attempt) + random.uniform(0, 1))

            # Check for Retry-After header
            retry_after = response.headers.get('Retry-After')
            if retry_after:
                wait_time = max(wait_time, parse_retry_after(retry_after))

            print(f"Rate limited. Waiting {wait_time:.1f}s before retry {attempt + 1}")
            time.sleep(wait_time)
            continue

        return response

    raise Exception("Max retries exceeded")
```

Node.js implementation:

```javascript
// Exponential backoff for GCP API calls
async function callWithBackoff(fn, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.code === 429 || error.code === 'RESOURCE_EXHAUSTED') {
                // Exponential backoff with jitter
                const waitMs = Math.min(60000, Math.pow(2, attempt) * 1000 + Math.random() * 1000);
                console.log(`Rate limited. Retrying in ${waitMs}ms`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
            } else {
                throw error;  // Re-throw non-rate-limit errors
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// Usage with Google Cloud client
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

const result = await callWithBackoff(() =>
    storage.bucket('my-bucket').getFiles({maxResults: 100})
);
```

## Step 3: Batch Your Requests

Instead of making many individual API calls, batch them where possible:

```python
# Bad: Individual metadata updates in a loop
# This generates 1000 API calls
for item in items:
    blob = bucket.blob(item)
    blob.metadata = {"processed": "true"}
    blob.patch()

# Better: Use batch operations
# This groups multiple JSON API calls into fewer HTTP requests
from google.cloud import storage

client = storage.Client()
bucket = client.bucket("my-bucket")

# Cloud Storage supports batching metadata updates and deletes,
# but not uploads or downloads.
with client.batch():
    for item in items[:100]:  # Batch up to 100 at a time
        blob = bucket.blob(item)
        blob.metadata = {"processed": "true"}
        blob.patch()
```

For Compute Engine, use batch API calls:

```bash
# Instead of listing instances zone by zone
# Use aggregated list to get all instances in one call
gcloud compute instances list \
    --project=my-project \
    --format="table(name, zone, status)"
```

## Step 4: Request a Quota Increase

If your application legitimately needs higher rate limits, request an increase:

```bash
# View current quota limits
gcloud beta quotas info list \
    --service=compute.googleapis.com \
    --project=my-project

# Request a quota increase through the Console
# Go to APIs & Services > Quotas
# Filter for the specific metric
# Click Edit Quotas
```

Some quota preferences can be created through gcloud:

```bash
# Request a quota preference (if supported for the quota)
gcloud beta quotas preferences create \
    --service=compute.googleapis.com \
    --project=my-project \
    --quota-id=GlobalReadsPerMinutePerProject \
    --preferred-value=1000 \
    --justification="Production workload needs higher read API quota"
```

## Step 5: Distribute Load Across Projects

For workloads that legitimately span multiple projects, you can distribute API calls to the project that owns each workload:

```python
# Route API calls to the project that owns each workload.
# Each project has its own quota, but this should not be used
# just to bypass quota policy for a single workload.
import itertools

projects = ['project-1', 'project-2', 'project-3']
project_cycle = itertools.cycle(projects)

def get_client_for_next_project():
    """Round-robin through projects to distribute rate limit impact."""
    project = next(project_cycle)
    return storage.Client(project=project)
```

## Step 6: Implement Client-Side Rate Limiting

Instead of hitting the rate limit and reacting, proactively limit your request rate:

```python
import time
import threading

class RateLimiter:
    """Simple token bucket rate limiter."""
    def __init__(self, rate_per_second):
        self.rate = rate_per_second
        self.tokens = rate_per_second
        self.last_refill = time.monotonic()
        self.lock = threading.Lock()

    def acquire(self):
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens >= 1:
                self.tokens -= 1
                return
            else:
                sleep_time = (1 - self.tokens) / self.rate
                time.sleep(sleep_time)
                self.tokens = 0

# Limit to 15 requests per second (below the 20/s limit)
limiter = RateLimiter(rate_per_second=15)

for item in items:
    limiter.acquire()
    make_api_call(item)
```

## Monitoring Rate Limit Usage

Set up monitoring to track how close you are to rate limits:

```bash
# Check API usage metrics in Cloud Monitoring
gcloud monitoring metrics list \
    --filter='metric.type = "serviceruntime.googleapis.com/api/request_count"'
```

Create a dashboard in Cloud Monitoring that shows API request rates over time. This helps you identify patterns (e.g., rate limit hits during batch processing jobs) and plan around them.

## Key Takeaways

429 errors are not bugs - they are GCP protecting its infrastructure and ensuring fair usage. The proper response is:

1. Always implement exponential backoff in your code
2. Batch requests where possible
3. Use client-side rate limiting for predictable workloads
4. Request quota increases if your legitimate usage exceeds defaults
5. Monitor your API usage to stay ahead of rate limits

Most Google Cloud client libraries handle retries with backoff automatically. Make sure you are using the official client libraries rather than raw HTTP calls, and you will get this behavior for free.
