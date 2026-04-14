# How to Use Sentinel Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Sentinel, Circuit Breaker, Rate Limiting

Description: Learn how to configure the Dapr Sentinel middleware for advanced traffic control including flow control, circuit breaking, and hot-spot detection.

---

## Introduction

The Dapr Sentinel middleware (`middleware.http.sentinel`) integrates Alibaba's Sentinel library into the Dapr HTTP pipeline. Sentinel provides advanced traffic control capabilities beyond simple rate limiting: flow control, circuit breaking, hot-spot parameter limiting, and system adaptive protection.

## Component Configuration

```yaml
# components/sentinel.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sentinel
spec:
  type: middleware.http.sentinel
  version: v1
  metadata:
    - name: appName
      value: "my-service"
    - name: logDir
      value: "/tmp/sentinel"
    - name: flowRules
      value: >
        [
          {
            "resource": "GET:/api/orders",
            "tokenCalculateStrategy": 0,
            "controlBehavior": 0,
            "threshold": 100,
            "statIntervalInMs": 1000
          }
        ]
    - name: circuitBreakerRules
      value: >
        [
          {
            "resource": "POST:/api/orders",
            "strategy": 1,
            "retryTimeoutMs": 3000,
            "minRequestAmount": 10,
            "statIntervalMs": 5000,
            "threshold": 0.5
          }
        ]
```

## Flow Control Rules

Flow rules limit requests per resource:

```json
[
  {
    "resource": "GET:/api/products",
    "tokenCalculateStrategy": 0,
    "controlBehavior": 0,
    "threshold": 200,
    "statIntervalInMs": 1000,
    "maxQueueingTimeMs": 500
  }
]
```

- `tokenCalculateStrategy: 0` = direct concurrency counting
- `controlBehavior: 0` = reject excess requests
- `controlBehavior: 1` = throttle excess requests (queue with rate limiting)

## Circuit Breaker Rules

```json
[
  {
    "resource": "POST:/api/payments",
    "strategy": 1,
    "retryTimeoutMs": 5000,
    "minRequestAmount": 5,
    "statIntervalMs": 10000,
    "threshold": 0.4
  }
]
```

- `strategy: 1` = error ratio based
- `threshold: 0.4` = open circuit when 40% of requests fail
- `retryTimeoutMs` = wait 5 seconds before trying to close the circuit

## Pipeline Configuration

```yaml
# config/sentinel-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: sentinel-pipeline
spec:
  httpPipeline:
    handlers:
      - name: sentinel
        type: middleware.http.sentinel
```

## Running the App

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --config ./config/sentinel-pipeline.yaml \
  --components-path ./components \
  -- python app.py
```

## Handling Sentinel Rejections

When Sentinel rejects a request, Dapr returns HTTP 429. Your clients should handle this:

```python
import requests
import time

def call_with_retry(url: str, max_retries: int = 3):
    for attempt in range(max_retries):
        resp = requests.get(url)
        if resp.status_code == 429:
            wait = 2 ** attempt
            print(f"Rate limited, retrying in {wait}s")
            time.sleep(wait)
        else:
            return resp
    raise Exception("Max retries exceeded")
```

## Hot-Spot Parameter Rules

Limit requests per unique parameter value:

```json
[
  {
    "resource": "GET:/api/users",
    "metricType": 1,
    "controlBehavior": 0,
    "paramIndex": 0,
    "threshold": 50,
    "burstCount": 10,
    "durationInSec": 1
  }
]
```

## Summary

Dapr Sentinel middleware provides enterprise-grade traffic control capabilities at the sidecar level. Flow control, circuit breaking, and hot-spot limiting are all configurable via JSON rules in the component YAML. Sentinel's circuit breaker automatically opens when error rates exceed thresholds, protecting downstream services from cascading failures without any code changes to your application.
