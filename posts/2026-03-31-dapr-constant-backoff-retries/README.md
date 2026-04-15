# How to Use Constant Backoff Retries in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Constant Backoff, Fault Tolerance

Description: Learn how to configure constant backoff retry policies in Dapr to retry failed operations at a fixed interval, ideal for predictable recovery scenarios.

---

## Overview

Constant backoff retries wait a fixed duration between each retry attempt. This strategy is simple and predictable, making it well-suited for scenarios where you know approximately how long recovery takes - for example, a database that restarts in about 5 seconds, or a rate-limited API that resets every second.

## Configuring Constant Backoff

Define a constant retry policy in the `policies.retries` section:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: constant-retry-resiliency
  namespace: default
spec:
  policies:
    retries:
      fixedIntervalRetry:
        policy: constant
        duration: 2s
        maxRetries: 5
      quickFixedRetry:
        policy: constant
        duration: 250ms
        maxRetries: 3
      unlimitedFixedRetry:
        policy: constant
        duration: 10s
        maxRetries: -1
```

`maxRetries: -1` means retry indefinitely. Use this carefully - only for operations that must eventually succeed, like connecting to a required database at startup.

## Applying to Specific Services

```yaml
targets:
  apps:
    cache-service:
      retry: quickFixedRetry
    database-service:
      retry: fixedIntervalRetry
```

## Applying to Components

For state stores and bindings, apply retries to outbound (writes) and inbound (subscriptions) independently:

```yaml
targets:
  components:
    redis-state:
      outbound:
        retry: fixedIntervalRetry
    kafka-pubsub:
      inbound:
        retry: quickFixedRetry
      outbound:
        retry: fixedIntervalRetry
```

## Constant vs Exponential: When to Use Each

Constant backoff is the right choice when:
- Recovery time is predictable and consistent
- You want simple, deterministic retry behavior
- The service you are calling has a known cooldown period (e.g., rate limiting resets every second)
- Retrying too aggressively does not make the situation worse

Exponential backoff is better when:
- Recovery time is unpredictable
- You want to reduce pressure on an already struggling service
- Multiple callers retry simultaneously and could cause thundering herd

## Example: Retrying a Rate-Limited API

An external API allows 10 requests per second. After hitting the limit, requests return `429`. A constant 1-second retry makes sense:

```yaml
retries:
  rateLimitRetry:
    policy: constant
    duration: 1s
    maxRetries: 3
targets:
  apps:
    external-api:
      retry: rateLimitRetry
```

## Combining with Timeouts

Always pair retries with a timeout to bound total execution time:

```yaml
policies:
  timeouts:
    apiTimeout: 3s
  retries:
    fixedIntervalRetry:
      policy: constant
      duration: 500ms
      maxRetries: 4
targets:
  apps:
    downstream-service:
      timeout: apiTimeout
      retry: fixedIntervalRetry
```

With this configuration, each attempt waits 3 seconds before timing out. Up to 4 retries are attempted with 500ms between each, for a maximum total time of approximately 17 seconds (5 attempts × 3s timeout + 4 × 500ms delay).

## Summary

Constant backoff retries in Dapr provide predictable, fixed-interval retries configured entirely in a `Resiliency` resource. They are ideal when downstream recovery is predictable and you want straightforward retry behavior without the complexity of exponential backoff calculations.
