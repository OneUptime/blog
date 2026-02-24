# How to Combine Fault Injection with Retry Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fault Injection, Retry Policy, Resilience, VirtualService

Description: Learn how to combine Istio fault injection with retry policies to validate that your retry configuration actually handles transient failures correctly.

---

Retry policies are one of the most common resilience patterns in distributed systems. When a request fails, you try again. Simple enough in theory, but in practice, retries can cause more problems than they solve if they're not configured correctly. They can amplify load on an already struggling service, create retry storms, or mask persistent failures.

The best way to validate your retry configuration is to combine it with Istio's fault injection. Inject controlled failures, then watch whether the retry policy handles them as expected. This post walks through how to set up this combination and what to look for.

## The Setup: Fault Injection + Retries

Istio evaluates fault injection before retries. Here's the sequence:

1. Request arrives at the sidecar proxy
2. Fault injection is evaluated (delay or abort may be applied)
3. If the request results in a retryable error (either from fault injection or the upstream), the retry policy kicks in
4. Each retry attempt also goes through fault injection evaluation

That last point is important. If you inject a 50% abort rate and have 3 retry attempts, each retry also has a 50% chance of being aborted. The effective success rate for a request with retries is 1 - (0.5^4) = 93.75% (the original request plus 3 retries all failing has a probability of 0.5^4 = 6.25%).

## Basic Example: Retries with Abort Injection

Set up a VirtualService with both fault injection and retries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50.0
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
```

With a 50% abort rate and 3 retries, here's what happens:

- Original request: 50% chance of 503
- Retry 1: 50% chance of 503 (if original failed)
- Retry 2: 50% chance of 503 (if retry 1 failed)
- Retry 3: 50% chance of 503 (if retry 2 failed)

Probability of all 4 attempts failing: 0.5^4 = 6.25%
So the effective error rate as seen by the caller is about 6.25%, even though the underlying failure rate is 50%.

Test it:

```bash
# Run 200 requests and count final status codes
for i in $(seq 1 200); do
  kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "%{http_code}\n" http://order-service:8080/orders
done | sort | uniq -c
```

You should see roughly 94% success and 6% failure.

## Validating Retry Configuration

This combination is great for answering specific questions about your retry setup:

### Question: Are retries actually happening?

Check the proxy access logs:

```bash
kubectl logs deploy/test-client -c istio-proxy -n production | grep "order-service"
```

Look for requests with the `URX` response flag, which means upstream retry limit exceeded. Also check for multiple attempts by looking at the `x-envoy-attempt-count` header in the upstream's access logs:

```bash
kubectl logs deploy/order-service -c istio-proxy -n production | grep "x-envoy-attempt-count"
```

### Question: Are retries respecting the perTryTimeout?

Combine retries with delay injection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - fault:
        delay:
          fixedDelay: 5s
          percentage:
            value: 50.0
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: gateway-error,reset,connect-failure,retriable-status-codes
      route:
        - destination:
            host: order-service
```

With a 5-second delay and a 2-second per-try timeout, each attempt that hits the delay fault will time out. The retry policy should trigger a new attempt.

```bash
# Check total request time - should be around 8s max (4 attempts * 2s timeout each)
time kubectl exec deploy/test-client -n production -- curl -s http://order-service:8080/orders
```

### Question: What happens when retries are exhausted?

Set a high fault percentage to force retry exhaustion:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 100.0
      retries:
        attempts: 3
        perTryTimeout: 1s
      route:
        - destination:
            host: order-service
```

With 100% abort rate, every attempt fails. The caller gets a 503 after all retries are exhausted. Check:

- Does the calling service handle this gracefully?
- What error message does the user see?
- How long did the total request take?

```bash
time kubectl exec deploy/test-client -n production -- curl -v http://order-service:8080/orders
```

## Understanding Retry-On Conditions

The `retryOn` field determines which failures trigger a retry. Make sure your fault injection generates errors that match:

```yaml
retries:
  attempts: 3
  retryOn: 5xx,reset,connect-failure,retriable-status-codes
```

| retryOn Value | What It Matches |
|---|---|
| `5xx` | Any 5xx response code |
| `gateway-error` | 502, 503, 504 |
| `reset` | Connection reset |
| `connect-failure` | Connection failure |
| `retriable-status-codes` | Status codes listed in `x-envoy-retriable-status-codes` header |

If you inject a 500 error but your retryOn is set to `gateway-error`, the 500 won't be retried because `gateway-error` only covers 502, 503, and 504.

```yaml
# This WON'T retry 500 errors
retries:
  attempts: 3
  retryOn: gateway-error

# This WILL retry 500 errors
retries:
  attempts: 3
  retryOn: 5xx
```

## Load Impact of Retries

Retries multiply the load on the target service. With fault injection, you can measure this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50.0
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
```

If you send 100 requests per second with a 50% failure rate and 3 retries:

- 100 original requests
- ~50 first retries (50% of originals fail)
- ~25 second retries (50% of first retries fail)
- ~12 third retries (50% of second retries fail)

Total load on the upstream: about 187 requests per second from 100 original requests. That's an 87% increase in load, which can push an already struggling service further toward failure.

Monitor this:

```bash
# Request rate at the upstream
kubectl exec -n istio-system deploy/prometheus -- curl -s 'localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{destination_service="order-service.production.svc.cluster.local"}[1m]))' | jq '.data.result[0].value[1]'
```

## Retry Budgets and Backoff

Istio doesn't natively support retry budgets (limiting total retries across all clients), but you can use circuit breakers in the DestinationRule to limit the damage:

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
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

The outlier detection works as a circuit breaker. If a specific upstream instance returns 5 consecutive 5xx errors, it gets ejected for 30 seconds. This prevents retries from piling onto a failing instance.

## A Complete Test Scenario

Here's a full example that validates retries against intermittent failures:

```yaml
# DestinationRule with circuit breaker
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
---
# VirtualService with fault injection and retries
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 30.0
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
```

Expected behavior:

- 30% of individual attempts fail with 503
- Retries bring the effective failure rate down to about 2.7% (0.3^3)
- If a specific pod returns too many errors, outlier detection ejects it
- The system remains usable despite a significant underlying failure rate

This is exactly the kind of thing you want to verify before it happens for real.
