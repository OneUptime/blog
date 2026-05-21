# How to Configure Retry Budget for Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Resilience, Service Mesh, Traffic Management

Description: Learn how to configure retry budgets in Istio to prevent retry storms from overwhelming your services while still allowing helpful retries.

---

Retries are one of those things that sound obviously good until they cause a cascading failure. When a downstream service is struggling - returning errors or timing out - the natural response is to retry. But if every caller retries failed requests, you can easily triple or quadruple the load on an already struggling service. This is a retry storm, and it can turn a minor hiccup into a full-blown outage.

A retry budget limits the total number of retries happening at any given time. Instead of letting every individual request retry independently, you put a cap on the overall retry rate. This way, retries remain useful for transient errors without overwhelming a struggling service.

## How Retries Work in Istio

Istio configures retries through VirtualService resources. A basic retry configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,retriable-status-codes
```

This says: retry up to 3 times after the initial request, give each attempt 2 seconds, and retry on 5xx errors, connection resets, connection failures, and retriable status codes. Simple enough. But without a budget, under high load this can add up to three extra retry attempts for each original request.

## The Retry Budget Concept

Istio supports Envoy retry budgets through the `retryBudget` field in DestinationRule. This limits the number of concurrent retries as a percentage of active and pending requests from a caller to a specific destination. It is not a per-request setting - it is a pool-wide limit.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    retryBudget:
      percent: 10
      minRetryConcurrency: 3
    connectionPool:
      http:
        http2MaxRequests: 100
```

With `percent: 10`, retries are capped at 10% of the current active and pending request load, with at least 3 retry slots available because of `minRetryConcurrency`. If all retry slots are used, additional retries are not attempted - the original failure response is returned to the caller.

## Sizing Your Retry Budget

The right retry budget depends on your traffic volume and how much additional load the destination can handle. A good starting point is to set `retryBudget.percent` to a small percentage of active and pending requests.

For example, if the caller has 100 active and pending requests, setting `percent: 10` means retries can add up to about 10 concurrent retry attempts, subject to the minimum retry concurrency. This is conservative and safe.

If you set `percent` too high (say, 100), you effectively allow retries to match the current request load. That defeats the purpose of having a budget.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    retryBudget:
      percent: 10
      minRetryConcurrency: 3
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 200
        http1MaxPendingRequests: 50
```

This allows up to 200 active requests and uses a 10% retry budget. When the caller is saturated, retries add about 10% extra concurrent load.

## Combining Retry Budget with VirtualService Retries

The VirtualService `retries` and the DestinationRule `retryBudget` work together. The VirtualService defines the retry policy (how many attempts per request, what to retry on), and the DestinationRule caps the total concurrent retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
    timeout: 10s
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    retryBudget:
      percent: 10
      minRetryConcurrency: 3
    connectionPool:
      http:
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

When the system is healthy, requests rarely fail, so few retries happen and the budget is not a constraint. When the payment service starts failing, retries increase, but the budget caps them relative to active and pending request load. This prevents the retry storm.

## Different Budgets for Different Services

Not every service needs the same retry budget. Apply different policies based on service criticality and capacity:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: catalog-service
  namespace: production
spec:
  host: catalog-service
  trafficPolicy:
    retryBudget:
      percent: 10
      minRetryConcurrency: 3
    connectionPool:
      http:
        http2MaxRequests: 500
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory-service
  namespace: production
spec:
  host: inventory-service
  trafficPolicy:
    retryBudget:
      percent: 5
      minRetryConcurrency: 1
    connectionPool:
      http:
        http2MaxRequests: 100
```

The catalog service is a read-heavy service that can handle retries gracefully, so it gets a larger budget. The inventory service writes to a database and has lower capacity, so it gets a tight budget.

## Pairing with Circuit Breaking

Retry budgets and circuit breaking complement each other. The retry budget limits retry traffic. Circuit breaking removes unhealthy pods from the load balancing pool. Together, they prevent overload from two angles:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    retryBudget:
      percent: 10
      minRetryConcurrency: 3
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 200
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

When a pod starts failing, outlier detection ejects it. Retries go to healthy pods (capped by the budget). The failing pod gets at least 30 seconds to recover before being added back.

## Monitoring Retry Behavior

Track retry rates to understand how your budget is performing:

```bash
# Check retry stats on a specific pod's proxy

kubectl exec deploy/frontend -c istio-proxy -- \
  pilot-agent request GET stats | grep retry
```

Look for these Envoy stats:

- `upstream_rq_retry`: Total retries attempted
- `upstream_rq_retry_success`: Retries that succeeded
- `upstream_rq_retry_overflow`: Retries that were rejected because the retry budget or retry circuit breaker was exhausted
- `upstream_rq_retry_limit_exceeded`: Retries that exceeded per-request retry limits

If you do not see these stats, configure Istio's proxy stats matcher to include `.*upstream_rq_retry.*`.

A high `upstream_rq_retry_overflow` count means your budget is actively preventing retry storms. That is the budget doing its job. But if you see it climbing during normal operations (not during an outage), your budget might be too tight.

## Disabling Retries for Specific Routes

Some operations should never be retried. Non-idempotent operations (like charging a credit card) can cause duplicates if retried. Disable retries for these:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - match:
    - uri:
        prefix: /api/charge
    route:
    - destination:
        host: payment-service
    retries:
      attempts: 0
  - route:
    - destination:
        host: payment-service
    retries:
      attempts: 3
      perTryTimeout: 2s
```

The `/api/charge` endpoint gets zero retries. Everything else gets the standard retry policy.

## Retry Backoff

Envoy adds fully jittered exponential backoff between retries by default, using a 25ms base interval. With the default interval, the first retry is delayed randomly by up to about 25ms, the second by up to about 75ms, and later retries continue increasing up to the configured cap. This helps spread out retry traffic and gives the destination time to recover.

You do not need to configure this - it is the default behavior. But it is worth knowing because it means retries are not all hitting at the same instant.

## Summary

Retry budgets prevent retries from becoming a problem worse than the original failure. Set `retryBudget.percent` in your DestinationRule to a small percentage (5-15%) to cap retry overhead relative to active and pending request load. Combine this with VirtualService retry policies for per-request retry behavior, and outlier detection for circuit breaking. Monitor `upstream_rq_retry_overflow` to see when budgets are being enforced. Disable retries entirely for non-idempotent operations. The goal is to keep retries helpful without letting them amplify failures.
