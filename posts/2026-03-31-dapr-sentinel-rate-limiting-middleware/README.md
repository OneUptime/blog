# How to Use Sentinel Middleware for Dapr Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Rate Limiting, Sentinel, Resiliency

Description: Learn how to configure the Alibaba Sentinel middleware in Dapr to apply rate limiting and traffic control rules to incoming HTTP requests.

---

## Overview

Sentinel is a traffic control library developed by Alibaba. Dapr provides a Sentinel middleware component that integrates directly into the sidecar HTTP pipeline, allowing you to define rate limiting, flow control, and circuit breaking rules without modifying application code.

## Configuring the Sentinel Middleware Component

Create a Dapr component that defines Sentinel flow rules. Each rule targets a specific URL resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sentinel-rate-limit
  namespace: default
spec:
  type: middleware.http.sentinel
  version: v1
  metadata:
  - name: appName
    value: "order-service"
  - name: logDir
    value: "/tmp/sentinel"
  - name: flowRules
    value: |
      [
        {
          "resource": "POST:/v1.0/invoke/order-service/method/orders",
          "threshold": 100,
          "tokenCalculateStrategy": 0,
          "controlBehavior": 0,
          "statIntervalInMs": 1000
        },
        {
          "resource": "GET:/v1.0/invoke/order-service/method/orders",
          "threshold": 500,
          "tokenCalculateStrategy": 0,
          "controlBehavior": 0,
          "statIntervalInMs": 1000
        }
      ]
```

## Flow Rule Fields Explained

- `resource`: The request path pattern to apply the rule to
- `threshold`: Maximum requests per `statIntervalInMs` window
- `tokenCalculateStrategy`: `0` = Direct, `1` = WarmUp
- `controlBehavior`: `0` = Reject immediately, `1` = Throttling (queuing)
- `statIntervalInMs`: The sliding window duration in milliseconds

## Attaching to the HTTP Pipeline

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: sentinel-pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: sentinel-rate-limit
      type: middleware.http.sentinel
```

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "sentinel-pipeline"
```

## Adding Circuit Breaker Rules

Sentinel also supports circuit breaking based on error rate or slow request ratio:

```yaml
  - name: circuitBreakerRules
    value: |
      [
        {
          "resource": "POST:/orders",
          "strategy": 1,
          "retryTimeoutMs": 3000,
          "minRequestAmount": 10,
          "statIntervalMs": 5000,
          "threshold": 0.5
        }
      ]
```

`strategy: 1` is error ratio (`0` = slow request ratio, `2` = error count). A 50% error rate over 10 requests in 5 seconds trips the breaker for 3 seconds.

## Testing Rate Limiting

Use a load testing tool to verify the limit is enforced:

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Send 200 requests, expecting 100 to be rejected
hey -n 200 -c 10 \
  http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Rejected requests receive a `429 Too Many Requests` response.

## Combining with Dapr Resiliency

Sentinel middleware rate limits at the ingress path. Pair it with Dapr Resiliency policies on the egress path to get end-to-end protection:

```yaml
# Resiliency policy for outbound calls from order-service
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: order-resiliency
spec:
  policies:
    retries:
      defaultRetry:
        policy: exponential
        maxRetries: 3
```

## Summary

Dapr's Sentinel middleware provides production-grade traffic control by applying flow rules and circuit breaker policies at the sidecar level. Defining thresholds per resource path protects backend services from overload without requiring any rate-limiting logic in application code.
