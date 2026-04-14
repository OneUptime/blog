# How to Use Exponential Backoff Retries in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Exponential Backoff, Fault Tolerance

Description: Learn how to configure exponential backoff retry policies in Dapr to gracefully handle transient failures while reducing load on struggling downstream services.

---

## Overview

Exponential backoff increases the wait time between each retry attempt, multiplying by a factor after each failure. This reduces pressure on an already-struggling service and prevents thundering herd scenarios where many callers simultaneously hammer a recovering dependency. Dapr's `exponential` retry policy uses a built-in growth rate of 1.5x and a randomization factor of 0.5 for jitter, while letting you configure the initial interval, maximum interval, and retry count.

## Configuring Exponential Backoff

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: exponential-retry-resiliency
  namespace: default
spec:
  policies:
    retries:
      standardExponential:
        policy: exponential
        duration: 500ms
        maxInterval: 30s
        maxRetries: 8
```

With `duration: 500ms` and Dapr's built-in 1.5x multiplier, the retry intervals grow as follows (before jitter):

| Attempt | Interval |
|---|---|
| 1 | 500ms |
| 2 | 750ms |
| 3 | 1.1s |
| 4 | 1.7s |
| 5 | 2.5s |
| 6 | 3.8s |
| 7 | 5.7s |
| 8 | 8.5s |

## Built-in Jitter

Dapr's exponential backoff includes a built-in randomization factor of 0.5. Each computed interval is multiplied by a random value between 0.5 and 1.5. This spreads retry timing across callers and avoids synchronized retry storms:

```yaml
retries:
  exponentialWithLongerCap:
    policy: exponential
    duration: 1s
    maxInterval: 60s
    maxRetries: 10
```

## Applying to Services and Components

```yaml
targets:
  apps:
    payment-gateway:
      retry: standardExponential
    notification-service:
      retry: exponentialWithLongerCap
  components:
    postgres-state:
      outbound:
        retry: standardExponential
```

## Exponential Backoff for Pub/Sub Redelivery

When a message consumer fails, Dapr can retry delivery using exponential backoff:

```yaml
targets:
  components:
    orders-kafka:
      inbound:
        retry: exponentialWithLongerCap
```

This means if the subscriber crashes during message processing, Dapr backs off before redelivering, giving the service time to recover.

## Calculating Max Total Time

With `maxRetries: 8`, `duration: 500ms`, Dapr's built-in 1.5x multiplier, and `maxInterval: 30s`, the worst-case total retry time (before jitter) is approximately:

```text
500ms + 750ms + 1.1s + 1.7s + 2.5s + 3.8s + 5.7s + 8.5s ≈ 24.6s
```

Add the per-attempt timeout to get the absolute worst case. Plan your upstream timeouts and SLAs accordingly.

## Real-World Example: Database Reconnection

```yaml
retries:
  dbReconnect:
    policy: exponential
    duration: 1s
    maxInterval: 30s
    maxRetries: -1

targets:
  components:
    primary-database:
      outbound:
        retry: dbReconnect
```

Using `maxRetries: -1` with exponential backoff is safe for database connections because the interval grows to `maxInterval` and stays there, rather than retrying indefinitely at high frequency.

## Summary

Dapr's exponential backoff retry policy increases wait time between retries using a built-in 1.5x multiplier and jitter, with configurable initial interval, cap, and retry count. It is the recommended strategy for most production scenarios because it reduces load on recovering services and naturally prevents synchronized retry bursts from multiple callers.
