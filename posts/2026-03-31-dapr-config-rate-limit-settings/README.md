# How to Use Dapr Configuration for Rate Limit Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Rate Limiting, Microservice, Redis

Description: Use the Dapr Configuration API to manage rate limit settings dynamically, allowing real-time threshold adjustments across microservices without redeployment.

---

Rate limiting protects services from overload, but static limits baked into code require redeployment to adjust. Using the Dapr Configuration API, you can store and subscribe to rate limit thresholds, updating them in real time as traffic patterns change.

## Component Setup

Define a configuration store component backed by Redis:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimitconfig
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    value: ""
```

## Defining Rate Limit Keys

Store rate limit settings as config keys in Redis:

```bash
redis-cli MSET \
  "requests-per-second" "100||1" \
  "burst-limit" "200||1" \
  "window-seconds" "60||1"
```

## Loading Limits at Service Start

Read the rate limit configuration on startup:

```python
from dapr.clients import DaprClient

limits = {}

with DaprClient() as client:
    result = client.get_configuration(
        store_name="ratelimitconfig",
        keys=["requests-per-second", "burst-limit", "window-seconds"]
    )
    for key, item in result.items.items():
        limits[key] = int(item.value)

print(f"Rate limits loaded: {limits}")
```

## Subscribing to Limit Changes

React to configuration changes at runtime using the subscribe API:

```python
import time
from dapr.clients import DaprClient
from dapr.clients.grpc._response import ConfigurationResponse

def watch_limits():
    with DaprClient() as client:
        def on_update(id: str, resp: ConfigurationResponse):
            for key, item in resp.items.items():
                limits[key] = int(item.value)
                print(f"Rate limit updated: {key} = {item.value}")

        subscription_id = client.subscribe_configuration(
            store_name="ratelimitconfig",
            keys=["requests-per-second", "burst-limit", "window-seconds"],
            handler=on_update
        )
        print(f"Subscribed with ID: {subscription_id}")
        while True:
            time.sleep(1)

watch_limits()
```

## Applying Dynamic Limits in a Rate Limiter

Use the loaded config in your token bucket or sliding window implementation:

```python
import time

class DynamicRateLimiter:
    def __init__(self, limits):
        self.limits = limits
        self.tokens = limits.get("requests-per-second", 100)
        self.last_check = time.monotonic()

    def allow_request(self):
        now = time.monotonic()
        rps = self.limits.get("requests-per-second", 100)
        elapsed = now - self.last_check
        self.tokens = min(rps, self.tokens + elapsed * rps)
        self.last_check = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
```

## Updating Limits Without Redeployment

Adjust thresholds without touching code:

```bash
redis-cli SET "requests-per-second" "150||2"
```

The subscription fires, `limits` updates in memory, and the `DynamicRateLimiter` picks up the new value on the next call.

## Applying Per-Service Limits

Use different key prefixes for different services:

```bash
redis-cli MSET \
  "checkout-requests-per-second" "50||1" \
  "search-requests-per-second" "500||1"
```

Each service reads only its own keys, giving you fine-grained control.

## Summary

Dapr Configuration provides a practical foundation for dynamic rate limit management. Services subscribe to limit keys in Redis and update their in-memory throttle parameters the moment values change. This eliminates the need for redeployment when adjusting rate limits and enables rapid response to traffic spikes or abuse patterns.
