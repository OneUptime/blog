# How to Configure Circuit Breaker Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Circuit Breaker, Fault Tolerance, Policy

Description: Learn how to configure circuit breaker policies in Dapr Resiliency resources to stop calling failing services and allow them time to recover.

---

## Overview

A circuit breaker monitors calls to a downstream service and "trips" when failures exceed a threshold, returning errors immediately without attempting the call. After a cooldown period, it enters a "half-open" state to test if the service has recovered. Dapr's built-in circuit breaker is configured declaratively in a `Resiliency` resource.

## Circuit Breaker States

- **Closed**: Normal operation, all requests pass through
- **Open**: Breaker has tripped, requests fail immediately without calling the service
- **Half-Open**: Test mode after the timeout - allows a limited number of requests through to check recovery

## Configuring a Circuit Breaker

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: circuit-breaker-resiliency
  namespace: default
spec:
  policies:
    circuitBreakers:
      serviceCB:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
      aggressiveCB:
        maxRequests: 2
        interval: 5s
        timeout: 15s
        trip: consecutiveFailures >= 2
```

## Circuit Breaker Fields

| Field | Description |
|---|---|
| `maxRequests` | Number of requests allowed in half-open state to test recovery |
| `interval` | Window for counting failures (resets counters periodically) |
| `timeout` | How long the breaker stays open before entering half-open |
| `trip` | The condition that opens the breaker |

## Trip Expressions

The `trip` field accepts expressions evaluated against counters:

```yaml
# Open after 5 consecutive failures
trip: consecutiveFailures >= 5

# Open after 3 consecutive failures (more aggressive)
trip: consecutiveFailures > 3
```

## Applying Circuit Breakers to Targets

```yaml
targets:
  apps:
    payment-service:
      circuitBreaker: serviceCB
      retry: exponentialRetry
      timeout: standardTimeout
    email-service:
      circuitBreaker: aggressiveCB
```

Note: Circuit breakers and retries work together. The retry policy retries within a single circuit breaker state. If the breaker is open, retries are skipped entirely.

## Circuit Breaker for Components

```yaml
targets:
  components:
    redis-state:
      outbound:
        circuitBreaker: serviceCB
    kafka-pubsub:
      outbound:
        circuitBreaker: aggressiveCB
```

## Observing Circuit Breaker State Changes

Dapr logs circuit breaker state transitions:

```bash
kubectl logs deployment/order-service -c daprd \
  | grep -i "circuit breaker\|state change\|open\|half-open"
```

You will see entries like:
- `Circuit breaker state changed from closed to open`
- `Circuit breaker state changed from open to half-open`
- `Circuit breaker state changed from half-open to closed`

## Metrics for Circuit Breaker Monitoring

Dapr exposes Prometheus metrics for circuit breaker state. Scrape the sidecar metrics endpoint:

```bash
curl http://localhost:9090/metrics | grep dapr_resiliency
```

Look for `dapr_resiliency_count` metrics with `policy=circuitbreaker` labels.

## Summary

Dapr circuit breaker policies prevent calls to failing services from piling up, giving them time to recover. Configuring a breaker in a `Resiliency` resource with appropriate trip conditions, timeout duration, and half-open probe count lets you tune the balance between failing fast and recovering quickly across your microservices.
