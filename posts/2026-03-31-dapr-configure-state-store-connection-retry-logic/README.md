# How to Configure State Store Connection Retry Logic in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Retry, Resilience, Connection

Description: Configure connection retry logic for Dapr state stores using resiliency policies to handle transient failures and network interruptions gracefully.

---

## Overview

Network partitions, store restarts, and transient failures are unavoidable in distributed systems. Dapr's Resiliency API lets you define retry, timeout, and circuit breaker policies that apply to all state store operations automatically.

## Defining a Resiliency Policy for State Stores

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: state-resiliency
  namespace: default
spec:
  policies:
    retries:
      stateRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
    timeouts:
      stateTimeout: 3s
    circuitBreakers:
      stateCircuitBreaker:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 3
  targets:
    components:
      statestore:
        outbound:
          retry: stateRetry
          timeout: stateTimeout
          circuitBreaker: stateCircuitBreaker
```

## Applying the Policy to Your Component

The Resiliency policy references the component by name (`statestore`). No changes are needed to the state component YAML itself.

## Testing Retry Behavior

Simulate a Redis failure and observe retries in logs:

```bash
# Scale down Redis temporarily
kubectl scale deployment redis --replicas=0

# Watch Dapr sidecar logs for retry attempts
kubectl logs -f deploy/my-app -c daprd | grep -i "retry\|error\|state"

# Restore Redis
kubectl scale deployment redis --replicas=1
```

## Handling Retries in Application Code

Even with Dapr retries, your application should handle the case where all retries are exhausted:

```python
import requests
import time

def save_state(key, value, max_attempts=3):
    url = "http://localhost:3500/v1.0/state/statestore"
    payload = [{"key": key, "value": value}]

    for attempt in range(max_attempts):
        try:
            response = requests.post(url, json=payload, timeout=5)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            if attempt == max_attempts - 1:
                print(f"All retries exhausted: {e}")
                raise
            wait = 2 ** attempt
            print(f"Attempt {attempt + 1} failed, retrying in {wait}s")
            time.sleep(wait)
```

## Monitoring Retry Metrics

Dapr exposes retry metrics via Prometheus. Scrape them with:

```bash
curl http://localhost:9090/metrics | grep dapr_resiliency
```

Example Prometheus query to track retry rates:

```bash
rate(dapr_resiliency_activations_total{app_id="my-app", name="stateRetry"}[5m])
```

## Circuit Breaker Behavior

When `consecutiveFailures >= 3`, the circuit opens and requests fail fast for 30 seconds. After the timeout, one test request is allowed (half-open state). Configure alerting when the circuit opens:

```yaml
# Example Grafana alert rule
- alert: DaprStateCircuitOpen
  expr: dapr_resiliency_cb_state{app_id="my-app", status="open"} == 1
  for: 1m
  labels:
    severity: warning
```

## Summary

Dapr's Resiliency API provides declarative retry, timeout, and circuit breaker policies for state store connections without any application code changes. Use exponential backoff with a cap, pair it with circuit breakers to prevent overload, and monitor retry metrics to tune your configuration for production workloads.
