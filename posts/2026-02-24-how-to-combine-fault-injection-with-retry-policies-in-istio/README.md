# How to Combine Fault Injection with Retry Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fault Injection, Retry Policy, Resilience, VirtualService

Description: Learn how to combine Istio fault injection with retry policies to validate that your retry configuration actually handles transient failures correctly.

---

Retry policies are one of the most common resilience patterns in distributed systems. When a request fails, you try again. Simple enough in theory, but in practice, retries can cause more problems than they solve if they're not configured correctly. They can amplify load on an already struggling service, create retry storms, or mask persistent failures.

The best way to validate your retry configuration is to combine it with controlled fault injection, then watch whether the retry policy handles failures as expected. In Istio, do not put `fault` and `retries` on the same client-side `VirtualService` route. Istio currently does not enable retries or timeouts when faults are enabled on that route. Instead, configure retries on the client-side `VirtualService` and inject the fault on the upstream workload's inbound Envoy proxy with an `EnvoyFilter`.

## The Setup: Fault Injection + Retries

The useful test setup has two separate pieces:

1. Request arrives at the client sidecar proxy
2. The client-side `VirtualService` retry policy is evaluated for the outbound call
3. The request reaches the upstream workload's inbound sidecar
4. The upstream `EnvoyFilter` may inject a delay or abort before the application receives the request
5. If the client sidecar receives a retryable error or a per-try timeout, the retry policy kicks in
6. Each retry attempt reaches the upstream sidecar again, so the fault injection is evaluated again

That last point is important. If you inject a 50% abort rate on the upstream proxy and have 3 retry attempts on the client proxy, each retry also has a 50% chance of being aborted. The effective success rate for a request with retries is 1 - (0.5^4) = 93.75% (the original request plus 3 retries all failing has a probability of 0.5^4 = 6.25%).

## Basic Example: Retries with Abort Injection

Set up a `VirtualService` with retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
```

Then inject the abort on the upstream workload's inbound sidecar:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: order-service-abort-fault
  namespace: production
spec:
  priority: 10
  workloadSelector:
    labels:
      app: order-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.fault
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault
            abort:
              http_status: 503
              percentage:
                numerator: 50
                denominator: HUNDRED
```

With a 50% abort rate and 3 retries, here's what happens:

- Original request: 50% chance of 503
- Retry 1: 50% chance of 503 (if original failed)
- Retry 2: 50% chance of 503 (if retry 1 failed)
- Retry 3: 50% chance of 503 (if retry 2 failed)

Probability of all 4 attempts failing: 0.5^4 = 6.25%
So the effective error rate as seen by the caller is about 6.25%, even though the injected failure rate is 50%.

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

Check the client proxy access logs:

```bash
kubectl logs deploy/test-client -c istio-proxy -n production | grep "order-service"
```

Look for requests with the `URX` response flag, which means upstream retry limit exceeded. Also check for multiple attempts by looking at the `x-envoy-attempt-count` request header in the upstream proxy or application logs. In current Istio, the attempt-count header is enabled by default unless it has been disabled in mesh `proxyHeaders` settings.

```bash
kubectl logs deploy/order-service -c istio-proxy -n production | grep "x-envoy-attempt-count"
```

### Question: Are retries respecting the perTryTimeout?

Keep retries on the `VirtualService` and inject a delay on the upstream sidecar:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: order-service
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: order-service-delay-fault
  namespace: production
spec:
  priority: 10
  workloadSelector:
    labels:
      app: order-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.fault
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault
            delay:
              fixed_delay: 5s
              percentage:
                numerator: 50
                denominator: HUNDRED
```

With a 5-second delay and a 2-second per-try timeout, each attempt that hits the delay fault will time out. The retry policy should trigger a new attempt.

```bash
# Check total request time - should be around 8s max (4 attempts * 2s timeout each)
time kubectl exec deploy/test-client -n production -- curl -s http://order-service:8080/orders
```

### Question: What happens when retries are exhausted?

Set a high fault percentage to force retry exhaustion:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 1s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: order-service-abort-fault
  namespace: production
spec:
  priority: 10
  workloadSelector:
    labels:
      app: order-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.fault
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault
            abort:
              http_status: 503
              percentage:
                numerator: 100
                denominator: HUNDRED
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
| `5xx` | Any upstream 5xx response code, plus disconnects, resets, read timeouts, connection failures, and refused streams |
| `gateway-error` | 502, 503, 504, plus disconnects, resets, and read timeouts |
| `reset` | Disconnect, reset, or read timeout with no upstream response |
| `connect-failure` | TCP-level connection failure or connect timeout |
| `retriable-status-codes` | Status codes listed in the retry policy or in the `x-envoy-retriable-status-codes` header |

If you inject a 500 error but your retryOn is set to `gateway-error`, the 500 won't be retried because `gateway-error` only covers 502, 503, and 504 responses, plus no-response failures such as disconnects and resets.

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

Retries multiply the load on the target service. With fault injection, you can measure this by combining the retry `VirtualService` and upstream abort `EnvoyFilter` from the earlier example.

If you send 100 requests per second with a 50% failure rate and 3 retries:

- 100 original requests
- ~50 first retries (50% of originals fail)
- ~25 second retries (50% of first retries fail)
- ~12 third retries (50% of second retries fail)

Total traffic reaching the upstream proxy: about 187 requests per second from 100 original requests. That's an 87% increase in proxy-level request traffic, which can push an already struggling service further toward failure. If the fault aborts before forwarding to the application, the application itself will not see the aborted attempts, but the upstream sidecar still has to process them.

Monitor this:

```bash
# Request rate at the upstream
kubectl exec -n istio-system deploy/prometheus -- curl -s 'localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{destination_service="order-service.production.svc.cluster.local"}[1m]))' | jq '.data.result[0].value[1]'
```

## Retry Budgets and Backoff

Istio supports retry budgets in `DestinationRule`. A retry budget limits concurrent retries as a percentage of active and pending requests, with a configurable minimum retry concurrency:

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
      percent: 20
      minRetryConcurrency: 3
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

You can also use outlier detection to limit the damage. If a specific upstream instance returns 5 consecutive 5xx errors, it gets ejected for at least 30 seconds. This prevents retries from piling onto a failing instance.

## A Complete Test Scenario

Here's a full example that validates retries against intermittent failures:

```yaml
# DestinationRule with retry budget and outlier detection
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    retryBudget:
      percent: 20
      minRetryConcurrency: 3
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
---
# VirtualService with retries
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: 5xx
      route:
        - destination:
            host: order-service
---
# EnvoyFilter with upstream fault injection
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: order-service-abort-fault
  namespace: production
spec:
  priority: 10
  workloadSelector:
    labels:
      app: order-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.fault
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault
            abort:
              http_status: 503
              percentage:
                numerator: 30
                denominator: HUNDRED
```

Expected behavior:

- 30% of individual attempts fail with 503
- Retries bring the effective failure rate down to about 2.7% (0.3^3)
- If a specific pod returns too many errors, outlier detection ejects it
- The retry budget caps concurrent retries relative to active traffic
- The system remains usable despite a significant injected failure rate

This is exactly the kind of thing you want to verify before it happens for real.
