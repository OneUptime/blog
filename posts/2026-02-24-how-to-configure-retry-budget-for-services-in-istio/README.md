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
apiVersion: networking.istio.io/v1beta1
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

This says: retry up to 3 times, give each attempt 2 seconds, and retry on 5xx errors, connection resets, connection failures, and retriable status codes. Simple enough. But without a budget, under high load this can triple the inbound traffic to the payment service.

## The Retry Budget Concept

Envoy supports a retry budget through the `maxRetries` field in DestinationRule. This limits the number of concurrent retries across all requests from a caller to a specific destination. It is not a per-request setting - it is a pool-wide limit.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 100
        maxRetries: 10
```

With `maxRetries: 10`, only 10 retries can be in flight at the same time across all connections from the caller to payment-service. If all 10 retry slots are used, additional retries are not attempted - the original failure response is returned to the caller.

## Sizing Your Retry Budget

The right retry budget depends on your traffic volume and how much additional load the destination can handle. A good starting point is to set `maxRetries` to a small percentage of `http2MaxRequests`.

For example, if you allow 100 concurrent requests (`http2MaxRequests: 100`), setting `maxRetries: 10` means retries can add at most 10% overhead. This is conservative and safe.

If you set `maxRetries` too high (say, 100 when `http2MaxRequests` is also 100), you effectively allow the total load to double - 100 original requests plus 100 retries. That defeats the purpose of having a budget.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 200
        http1MaxPendingRequests: 50
        maxRetries: 20
```

This allows 200 concurrent requests with a retry budget of 20. Retries add at most 10% extra load.

## Combining Retry Budget with VirtualService Retries

The VirtualService `retries` and the DestinationRule `maxRetries` work together. The VirtualService defines the retry policy (how many attempts per request, what to retry on), and the DestinationRule caps the total concurrent retries:

```yaml
apiVersion: networking.istio.io/v1beta1
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
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 200
        maxRetries: 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

When the system is healthy, requests rarely fail, so few retries happen and the budget is not a constraint. When the payment service starts failing, retries increase, but the budget caps them at 20 concurrent retries. This prevents the retry storm.

## Different Budgets for Different Services

Not every service needs the same retry budget. Apply different policies based on service criticality and capacity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: catalog-service
  namespace: production
spec:
  host: catalog-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 500
        maxRetries: 50
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: inventory-service
  namespace: production
spec:
  host: inventory-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 100
        maxRetries: 5
```

The catalog service is a read-heavy service that can handle retries gracefully, so it gets a larger budget. The inventory service writes to a database and has lower capacity, so it gets a tight budget.

## Pairing with Circuit Breaking

Retry budgets and circuit breaking complement each other. The retry budget limits retry traffic. Circuit breaking removes unhealthy pods from the load balancing pool. Together, they prevent overload from two angles:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 200
        http1MaxPendingRequests: 50
        maxRetries: 15
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

When a pod starts failing, outlier detection ejects it. Retries go to healthy pods (capped by the budget). The failing pod gets 30 seconds to recover before being added back.

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
- `upstream_rq_retry_overflow`: Retries that were rejected because the budget was exhausted
- `upstream_rq_retry_limit_exceeded`: Retries that exceeded per-request retry limits

A high `upstream_rq_retry_overflow` count means your budget is actively preventing retry storms. That is the budget doing its job. But if you see it climbing during normal operations (not during an outage), your budget might be too tight.

## Disabling Retries for Specific Routes

Some operations should never be retried. Non-idempotent operations (like charging a credit card) can cause duplicates if retried. Disable retries for these:

```yaml
apiVersion: networking.istio.io/v1beta1
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

Envoy adds jittered exponential backoff between retries by default. The first retry happens after 25ms, the second after 50ms, and so on, with random jitter. This helps spread out retry traffic and gives the destination time to recover.

You do not need to configure this - it is the default behavior. But it is worth knowing because it means retries are not all hitting at the same instant.

## Summary

Retry budgets prevent retries from becoming a problem worse than the original failure. Set `maxRetries` in your DestinationRule to a small percentage (5-15%) of your `http2MaxRequests` to cap retry overhead. Combine this with VirtualService retry policies for per-request retry behavior, and outlier detection for circuit breaking. Monitor `upstream_rq_retry_overflow` to see when budgets are being enforced. Disable retries entirely for non-idempotent operations. The goal is to keep retries helpful without letting them amplify failures.
