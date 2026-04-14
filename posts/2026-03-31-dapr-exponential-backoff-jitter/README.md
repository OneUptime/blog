# How to Implement Exponential Backoff with Jitter in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Backoff, Fault Tolerance

Description: Learn how to configure exponential backoff with jitter in Dapr's resiliency policies to avoid thundering herd problems when retrying failed service calls.

---

## Why Exponential Backoff with Jitter?

When multiple service instances retry simultaneously after a failure, they can overwhelm the recovering service - a "thundering herd" problem. Exponential backoff increases wait time between retries, and jitter adds randomness to spread out retries across time, reducing the spike load on the recovering service.

Dapr's resiliency policies support exponential backoff natively with configurable jitter.

## Configuring Exponential Backoff in Dapr

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: default
spec:
  policies:
    retries:
      exponentialBackoffRetry:
        policy: exponential          # Use exponential backoff
        maxRetries: 6                # Maximum number of retry attempts
        initialInterval: 500ms      # First retry after 500ms
        maxInterval: 30s            # Cap retry delay at 30 seconds
        multiplier: 2.0             # Double the interval each retry

      # More aggressive backoff for external API calls
      externalApiRetry:
        policy: exponential
        maxRetries: 4
        initialInterval: 1s
        maxInterval: 60s
        multiplier: 2.5

  targets:
    apps:
      inventory-service:
        retry: exponentialBackoffRetry
      payment-gateway:
        retry: externalApiRetry
    components:
      my-pubsub:
        inbound:
          retry: exponentialBackoffRetry
```

## How Exponential Backoff Intervals Work

With `initialInterval: 500ms` and `multiplier: 2.0`:

| Attempt | Delay (no jitter) |
|---|---|
| 1 | 500ms |
| 2 | 1s |
| 3 | 2s |
| 4 | 4s |
| 5 | 8s |
| 6 | 16s |

With jitter applied by Dapr, actual delays vary randomly within a range around these values.

## Application Code: Making Retried Calls

The resiliency policy applies automatically - your application code does not need to implement retry logic:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

async function processOrder(order) {
  // Dapr automatically applies exponentialBackoffRetry on failure
  // Your code doesn't need try/catch for retryable errors
  const result = await client.invoker.invoke(
    'inventory-service',
    'reserve',
    HttpMethod.POST,
    { orderId: order.id, items: order.items }
  );
  return result;
}
```

## Implementing Jitter in Custom Retry Logic

If you need client-side retry with jitter outside of Dapr's built-in resiliency:

```python
import asyncio
import random

async def retry_with_exponential_backoff(
    func,
    max_retries: int = 6,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    multiplier: float = 2.0,
):
    """
    Retry a function with exponential backoff and full jitter.
    Full jitter: delay = random(0, min(maxDelay, base * 2^attempt))
    """
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries:
                raise

            # Calculate exponential backoff cap
            cap = min(max_delay, base_delay * (multiplier ** attempt))
            # Full jitter: random delay between 0 and cap
            delay = random.uniform(0, cap)

            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)

# Usage
result = await retry_with_exponential_backoff(
    lambda: call_payment_service(order),
    max_retries=5,
    base_delay=1.0,
    max_delay=30.0,
)
```

## Combining Backoff with Circuit Breaker

For maximum resilience, combine exponential backoff retry with a circuit breaker:

```yaml
spec:
  policies:
    retries:
      exponentialBackoffRetry:
        policy: exponential
        maxRetries: 5
        initialInterval: 200ms
        maxInterval: 20s

    circuitBreakers:
      protectiveCB:
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures > 10

  targets:
    apps:
      external-api:
        retry: exponentialBackoffRetry
        circuitBreaker: protectiveCB
```

## Retryable vs Non-Retryable Errors

Design your services to return appropriate HTTP status codes so Dapr knows which errors to retry:

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.post('/process')
async def process(request: dict):
    try:
        result = await heavy_computation(request)
        return result
    except TemporaryError as e:
        # 503 - retryable
        raise HTTPException(status_code=503, detail=str(e))
    except ValidationError as e:
        # 400 - not retryable
        raise HTTPException(status_code=400, detail=str(e))
```

## Summary

Dapr exponential backoff is configured with `policy: exponential` in a resiliency retry policy. Set `initialInterval`, `maxInterval`, and `multiplier` to control the backoff curve. Dapr adds jitter automatically to spread retries across multiple instances. Combine with a circuit breaker to stop retrying after the service is clearly unhealthy, and ensure your services return non-retryable status codes for client errors.
