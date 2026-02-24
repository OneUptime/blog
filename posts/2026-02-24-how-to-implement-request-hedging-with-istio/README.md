# How to Implement Request Hedging with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Hedging, Latency, Resilience, Kubernetes

Description: Learn how to implement request hedging patterns with Istio to reduce tail latency by sending redundant requests to multiple backends simultaneously.

---

Tail latency is the bane of distributed systems. Your service might respond in 10ms at the 50th percentile, but at the 99th percentile, it takes 500ms. That one slow request can ruin the user experience, especially when your frontend makes multiple backend calls and the overall response time is limited by the slowest one.

Request hedging attacks this problem by sending the same request to multiple backends and using whichever response comes back first. The slower responses get discarded. It's a tradeoff - you use more backend resources, but you get consistently low latency.

Istio doesn't have a built-in "hedging" feature as a first-class API, but you can implement hedging-like patterns using a combination of Istio's features: retries with short timeouts, traffic mirroring, and custom Envoy configurations.

## Understanding Request Hedging

There are several flavors of request hedging:

**Aggressive hedging**: Send the request to all backends simultaneously. Use the first response.

**Budget hedging**: Send to one backend. If no response within a threshold, send to a second backend. Use whichever responds first.

**Speculative retries**: Same as budget hedging, but using Istio's retry mechanism with aggressive timeouts.

The speculative retry approach is the most practical with Istio because it uses existing primitives.

## Speculative Retries (Budget Hedging)

This is the closest thing to hedging that Istio supports natively. Set a short per-try timeout and allow retries. If the first attempt is slow, the retry fires quickly and might hit a faster backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: search-service-vs
  namespace: default
spec:
  hosts:
  - search-service
  http:
  - route:
    - destination:
        host: search-service
    timeout: 500ms
    retries:
      attempts: 3
      perTryTimeout: 200ms
      retryOn: 5xx,reset,connect-failure,deadline-exceeded
```

With this configuration:
- First attempt has 200ms to respond
- If it doesn't respond in 200ms, a second attempt goes out (likely to a different pod due to load balancing)
- If the second is also slow, a third attempt fires
- The overall timeout is 500ms

The key is making `perTryTimeout` short enough that retries fire before the user notices, but long enough that normal requests aren't unnecessarily retried.

## Combining with LEAST_REQUEST Load Balancing

To make speculative retries more effective, use LEAST_REQUEST load balancing. This sends retries to the least loaded backend, which is more likely to respond quickly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: search-service-dr
  namespace: default
spec:
  host: search-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      http:
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

Outlier detection helps by removing slow/broken pods from the pool, so retries are less likely to hit the same problematic instance.

## Implementing True Hedging with EnvoyFilter

For true request hedging (sending to multiple backends simultaneously), you can use Envoy's request mirroring combined with application-level logic. However, this approach has limitations because Istio's mirroring discards the mirror response.

A more practical approach uses an EnvoyFilter to configure Envoy's hedge retry policy:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: hedge-retry-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: frontend
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_OUTBOUND
      routeConfiguration:
        vhost:
          name: "search-service.default.svc.cluster.local:8080"
    patch:
      operation: MERGE
      value:
        hedge_policy:
          initial_requests: 1
          additional_requests: 1
        retry_policy:
          retry_on: "5xx,reset"
          num_retries: 2
          per_try_timeout: 0.2s
```

Note that Envoy's hedge policy is still evolving and may not be available in all versions. Check your Envoy version for support.

## Application-Level Hedging with Istio Support

The most reliable way to implement hedging is at the application level, with Istio providing the infrastructure support. Your frontend service sends parallel requests to multiple backends:

```python
import asyncio
import aiohttp

async def hedged_request(url, timeout=0.5):
    """Send request to multiple backends, return first response."""
    async with aiohttp.ClientSession() as session:
        tasks = [
            asyncio.create_task(fetch(session, url)),
            asyncio.create_task(delayed_fetch(session, url, delay=0.1)),
        ]

        done, pending = await asyncio.wait(
            tasks,
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED
        )

        # Cancel pending requests
        for task in pending:
            task.cancel()

        if done:
            return done.pop().result()
        raise TimeoutError("All hedged requests timed out")

async def fetch(session, url):
    async with session.get(url) as response:
        return await response.json()

async def delayed_fetch(session, url, delay):
    await asyncio.sleep(delay)
    async with session.get(url) as response:
        return await response.json()
```

The first request goes immediately. After 100ms (the hedge delay), a second request fires. Whichever responds first wins.

Istio's load balancing ensures the two requests go to different pods:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: search-service-dr
  namespace: default
spec:
  host: search-service
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
```

RANDOM load balancing minimizes the chance that both hedged requests hit the same pod.

## When to Use Hedging

Hedging works best for:

- **Read-only operations**: Search, lookups, data retrieval. These are safe to duplicate.
- **Idempotent operations**: Operations that produce the same result regardless of how many times you execute them.
- **High-percentile latency problems**: When your P99 is much worse than your P50, hedging can bring the P99 closer to the P50.

Hedging is dangerous for:

- **Non-idempotent writes**: Creating orders, processing payments. Sending these twice would cause duplicate actions.
- **Resource-intensive operations**: If each request is expensive, doubling the request rate wastes resources.
- **Already overloaded services**: Hedging adds load. If the backend is struggling, hedging makes it worse.

## Configuring Hedging for Different Services

Apply different hedging strategies per service based on their characteristics:

```yaml
# Search service - aggressive hedging OK (read-only, idempotent)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: search-vs
spec:
  hosts:
  - search-service
  http:
  - route:
    - destination:
        host: search-service
    timeout: 300ms
    retries:
      attempts: 3
      perTryTimeout: 150ms
      retryOn: 5xx,reset,connect-failure,deadline-exceeded
---
# Order service - no hedging (writes, not idempotent)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-vs
spec:
  hosts:
  - order-service
  http:
  - match:
    - method:
        exact: POST
    route:
    - destination:
        host: order-service
    timeout: 10s
    retries:
      attempts: 0
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: order-service
    timeout: 2s
    retries:
      attempts: 2
      perTryTimeout: 800ms
      retryOn: 5xx,reset,connect-failure
```

## Monitoring Hedging Effectiveness

Track how hedging affects your latency distribution:

```bash
# P50 vs P99 latency for hedged service
histogram_quantile(0.50, rate(istio_request_duration_milliseconds_bucket{destination_workload="search-service"}[5m]))
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_workload="search-service"}[5m]))

# Retry rate (indicates how often hedging kicks in)
sum(rate(istio_requests_total{destination_workload="search-service",response_flags=~".*URX.*"}[5m]))
```

The `URX` response flag indicates that the response came from a retry. If you see a high retry rate, your perTryTimeout might be too aggressive. If you see very few retries but high tail latency, increase the retry attempts or shorten the timeout.

## Cost of Hedging

Hedging uses more resources. Monitor the total request rate to understand the overhead:

```bash
# Total requests including retries
sum(rate(istio_requests_total{destination_workload="search-service"}[5m]))

# Compared to unique requests (from the caller's perspective)
sum(rate(istio_requests_total{source_workload="frontend",destination_workload="search-service"}[5m]))
```

If the total is 2x the unique requests, you're effectively hedging every request. Consider increasing the perTryTimeout to reduce unnecessary retries.

Request hedging is a powerful tool for reducing tail latency, but it needs to be applied thoughtfully. Use it for read-only, idempotent operations where tail latency matters. Combine Istio's retry and timeout mechanisms with appropriate load balancing, and monitor the overhead to make sure you're getting the latency improvement you want without overloading your backends.
