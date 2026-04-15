# How to Implement Circuit Breaker with Timeout Trigger in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Circuit Breaker, Timeout, Fault Tolerance

Description: Learn how to configure a Dapr circuit breaker that uses request timeouts as a trip condition, opening the circuit when services respond too slowly.

---

## Timeout-Based Circuit Breaking

Slow services are as harmful as failing ones - a slow dependency ties up threads and can cascade into broader system slowdowns. Dapr's resiliency policies support both explicit timeout policies and circuit breakers that react to slow or failed requests within a configurable time window.

The `trip` condition can use `consecutiveFailures` or `totalFailures` combined with a cyclic `interval` period to capture both outright failures and timeout-induced errors.

## Timeout Policy Configuration

Define a timeout policy and combine it with a circuit breaker:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      # Requests to slow services must complete within 2 seconds
      strictTimeout: 2s

    circuitBreakers:
      # Open when more than 3 consecutive requests fail or timeout
      timeoutTriggerCB:
        maxRequests: 2          # Test requests in half-open state
        interval: 10s           # Cyclic period to clear internal counts
        timeout: 20s            # Duration circuit stays open
        trip: consecutiveFailures > 3   # Trip after 3 consecutive failures

    retries:
      fastRetry:
        policy: constant
        maxRetries: 2
        duration: 200ms

  targets:
    apps:
      analytics-service:
        timeout: strictTimeout
        circuitBreaker: timeoutTriggerCB
        retry: fastRetry
      reporting-service:
        timeout: strictTimeout
        circuitBreaker: timeoutTriggerCB
```

## How Timeouts Contribute to Circuit Breaking

When a request exceeds the `timeout` policy duration, Dapr cancels it and counts it as an error. These timeout-induced errors feed into the circuit breaker's failure tracking. If enough requests time out within a single `interval` cycle, the `consecutiveFailures` threshold is breached and the circuit opens. Note that the `interval` is a cyclic period — when it elapses, all internal counts are reset to zero.

## Application Code with Timeout Handling

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func fetchAnalytics(ctx context.Context, client dapr.Client, params AnalyticsParams) (*AnalyticsResult, error) {
    content := &dapr.DataContent{
        Data:        marshalParams(params),
        ContentType: "application/json",
    }

    // Dapr applies the 2s timeout and circuit breaker automatically
    resp, err := client.InvokeMethodWithContent(ctx, "analytics-service", "compute", "POST", content)
    if err != nil {
        // Distinguish between timeout and circuit open
        errMsg := err.Error()
        if containsAny(errMsg, "deadline exceeded", "context deadline exceeded") {
            log.Printf("Analytics request timed out")
            return nil, fmt.Errorf("analytics timeout: %w", err)
        }
        if containsString(errMsg, "circuit breaker") {
            log.Printf("Analytics circuit breaker open - service is slow/unavailable")
            return nil, fmt.Errorf("analytics unavailable (circuit open): %w", err)
        }
        return nil, err
    }

    return unmarshalResult(resp), nil
}

func fetchAnalyticsWithFallback(ctx context.Context, client dapr.Client, params AnalyticsParams) *AnalyticsResult {
    result, err := fetchAnalytics(ctx, client, params)
    if err != nil {
        log.Printf("Analytics unavailable: %v - using cached data", err)
        return getCachedAnalytics(params)
    }
    return result
}
```

## Per-Operation Timeout Overrides

Apply different timeout policies to different operations on the same service:

```yaml
spec:
  policies:
    timeouts:
      shortTimeout: 500ms   # For lightweight operations
      longTimeout: 10s      # For expensive batch operations

    circuitBreakers:
      shortOpCB:
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures > 5
      longOpCB:
        interval: 60s
        timeout: 120s
        trip: consecutiveFailures > 3   # Lower threshold for long ops

  targets:
    apps:
      data-service:
        timeout: shortTimeout
        circuitBreaker: shortOpCB
```

## Monitoring Timeout-Triggered Circuit Breakers

```bash
# View Dapr sidecar logs for circuit breaker events
kubectl logs -l app=my-service -c daprd | grep -i "circuit"

# Example log output:
# time="2026-03-31T12:00:00Z" level=warning msg="Circuit breaker 'timeoutTriggerCB' state changed to Open"
# time="2026-03-31T12:00:20Z" level=info    msg="Circuit breaker 'timeoutTriggerCB' state changed to HalfOpen"
# time="2026-03-31T12:00:21Z" level=info    msg="Circuit breaker 'timeoutTriggerCB' state changed to Closed"
```

## Prometheus Metrics

```promql
# Query: ratio of circuit breaker open states over time
rate(dapr_resiliency_cb_state{status="open"}[5m])

# Alert when circuit stays open for more than 1 minute
dapr_resiliency_cb_state{status="open"} == 1
```

## Summary

Dapr's timeout-triggered circuit breaker combines a `timeout` policy (which fails slow requests) with a circuit breaker using `consecutiveFailures` and a cyclic `interval` period. When timed-out requests push the failure count above the threshold, the circuit opens and prevents further slow requests from impacting callers. This pattern is essential for protecting services from slow dependencies that do not fail outright but consume excessive resources.
