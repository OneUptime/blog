# How to Fix 'Rate Exceeded' and Throttling Errors in AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Throttling, API, Performance, Troubleshooting

Description: Handle and prevent AWS API throttling and rate exceeded errors by implementing exponential backoff, request batching, caching, and understanding service-specific rate limits.

---

Every AWS service has API rate limits, and when you exceed them, you get throttled. The error shows up in various forms:

```
An error occurred (Throttling) when calling the DescribeInstances operation:
Rate exceeded

An error occurred (TooManyRequestsException) when calling the Invoke operation:
Rate exceeded

An error occurred (RequestLimitExceeded) when calling the DescribeSecurityGroups operation:
Request limit exceeded.
```

This isn't a permissions issue or a bug - it's AWS protecting its infrastructure from being overwhelmed. Let's look at why it happens and how to handle it properly.

## Why Throttling Happens

AWS applies rate limits at multiple levels:

- **Account level** - API calls per second across your entire account
- **Service level** - limits specific to each AWS service
- **Resource level** - limits on individual resources (like Lambda concurrency)
- **Region level** - limits apply per region

For example, EC2 API calls are typically limited to around 100 calls per second for describe operations. That sounds like a lot until you've got automated tooling, monitoring, and multiple services all hitting the same APIs.

## Implementing Exponential Backoff

The standard fix for throttling is exponential backoff with jitter. When you get throttled, wait, then retry - but increase the wait time with each retry to avoid making the problem worse.

```python
import time
import random
from botocore.exceptions import ClientError

def call_with_backoff(func, max_retries=5, base_delay=1):
    """Call an AWS API with exponential backoff on throttling."""
    for attempt in range(max_retries):
        try:
            return func()
        except ClientError as e:
            error_code = e.response['Error']['Code']
            throttle_codes = [
                'Throttling', 'ThrottlingException',
                'TooManyRequestsException', 'RequestLimitExceeded',
                'ProvisionedThroughputExceededException',
                'TransactionInProgressException'
            ]

            if error_code in throttle_codes and attempt < max_retries - 1:
                # Exponential backoff with jitter
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Throttled ({error_code}), retrying in {delay:.1f}s "
                      f"(attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            else:
                raise

    raise Exception(f"Max retries ({max_retries}) exceeded")

# Usage
import boto3
ec2 = boto3.client('ec2')

instances = call_with_backoff(lambda: ec2.describe_instances())
```

## Node.js Implementation

```javascript
// retry-with-backoff.js
const { ThrottlingException } = require('@aws-sdk/client-ec2');

async function callWithBackoff(apiCall, maxRetries = 5, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const throttleErrors = [
        'Throttling', 'ThrottlingException',
        'TooManyRequestsException', 'RequestLimitExceeded'
      ];

      const isThrottle = throttleErrors.includes(error.name) ||
                         throttleErrors.includes(error.Code);

      if (isThrottle && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Throttled, retrying in ${(delay/1000).toFixed(1)}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

module.exports = { callWithBackoff };
```

## Using AWS SDK Built-in Retries

Both the Python and JavaScript SDKs have built-in retry mechanisms. You can configure them instead of building your own.

### Python (Boto3)

```python
import boto3
from botocore.config import Config

# Configure retry behavior
config = Config(
    retries={
        'max_attempts': 10,
        'mode': 'adaptive'  # 'legacy', 'standard', or 'adaptive'
    }
)

# 'adaptive' mode dynamically adjusts retry behavior
# based on the throttling response
ec2 = boto3.client('ec2', config=config)

# Now all API calls automatically retry on throttling
instances = ec2.describe_instances()
```

The `adaptive` mode is the best choice for throttling. It automatically implements exponential backoff and also adjusts the rate of requests based on throttling signals.

### Node.js (AWS SDK v3)

```javascript
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

const ec2 = new EC2Client({
  region: 'us-east-1',
  maxAttempts: 10
  // SDK v3 uses adaptive retry by default
});
```

## Reducing API Call Volume

Retries help with occasional throttling, but if you're constantly hitting limits, you need to reduce the number of calls.

### Batch Operations

Many AWS APIs support batch or bulk operations. Use them.

```python
# Instead of individual calls
for instance_id in instance_ids:
    ec2.describe_instances(InstanceIds=[instance_id])  # N API calls

# Use a single call with multiple IDs
ec2.describe_instances(InstanceIds=instance_ids)  # 1 API call

# For tagging - batch instead of individual
ec2.create_tags(
    Resources=instance_ids,  # Tag many resources at once
    Tags=[{'Key': 'Environment', 'Value': 'production'}]
)
```

### Caching

If you're making the same API call repeatedly, cache the results.

```python
from functools import lru_cache
import time

class AWSCache:
    def __init__(self, ttl_seconds=60):
        self.cache = {}
        self.ttl = ttl_seconds

    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, time.time())

cache = AWSCache(ttl_seconds=300)

def get_instances_cached():
    """Get EC2 instances with caching."""
    cached = cache.get('instances')
    if cached:
        return cached

    response = ec2.describe_instances()
    instances = response['Reservations']
    cache.set('instances', instances)
    return instances
```

### Pagination

When listing resources, use pagination instead of trying to get everything in one call.

```python
# Use paginators - they handle the API calls efficiently
paginator = ec2.get_paginator('describe_instances')

for page in paginator.paginate():
    for reservation in page['Reservations']:
        for instance in reservation['Instances']:
            process_instance(instance)
```

## Rate Limiting Your Own Code

If you're making many calls in a loop, add deliberate delays.

```python
import time
from collections import deque

class RateLimiter:
    """Simple rate limiter using a sliding window."""

    def __init__(self, max_calls_per_second=10):
        self.max_calls = max_calls_per_second
        self.call_times = deque()

    def wait(self):
        now = time.time()

        # Remove calls outside the 1-second window
        while self.call_times and self.call_times[0] < now - 1:
            self.call_times.popleft()

        # If we've hit the limit, wait
        if len(self.call_times) >= self.max_calls:
            sleep_time = 1 - (now - self.call_times[0])
            if sleep_time > 0:
                time.sleep(sleep_time)

        self.call_times.append(time.time())

# Usage
limiter = RateLimiter(max_calls_per_second=10)

for instance_id in all_instances:
    limiter.wait()
    ec2.describe_instance_status(InstanceIds=[instance_id])
```

## Service-Specific Limits and Tips

### EC2
- Most describe calls: ~100 requests/second
- Use filters to reduce the number of calls instead of describe-then-filter
- Use `describe-instances` with filters instead of calling `describe-instance-status` for each instance

### Lambda
- Default concurrent executions: 1,000 per region
- API requests: varies by operation
- Use reserved concurrency to guarantee capacity for critical functions

### DynamoDB
- Read/write capacity units or on-demand
- Use batch operations (`batch_get_item`, `batch_write_item`)
- Enable auto-scaling for provisioned capacity

### S3
- 5,500 GET requests per second per prefix
- 3,500 PUT/DELETE requests per second per prefix
- Distribute keys across multiple prefixes to scale

### SES
- Sending rate varies by account (check your quota)
- Use `SendBulkTemplatedEmail` instead of individual sends

## Requesting Limit Increases

If legitimate usage is hitting limits, you can request increases.

```bash
# Check current limits for a service
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query "Quotas[?contains(QuotaName, 'rate')]"

# Request an increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-XXXXXXXX \
  --desired-value 200
```

## Monitoring Throttling

Set up CloudWatch alarms to alert you when throttling is happening.

```bash
# Many AWS services publish ThrottledRequests metrics
# Check CloudWatch for your specific service

aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Summary

Throttling is a normal part of working with AWS at scale. The key defenses are: use the SDK's built-in adaptive retry mode, reduce API call volume through batching and caching, add rate limiting to your code, and request quota increases when needed. Don't fight throttling by retrying faster - that makes it worse. Back off, batch up, and cache intelligently.
