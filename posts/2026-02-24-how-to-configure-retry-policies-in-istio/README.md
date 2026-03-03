# How to Configure Retry Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retry Policy, VirtualService, Traffic Management, Resilience

Description: A comprehensive guide to configuring retry policies in Istio VirtualService, covering retry conditions, timeouts, and best practices for production use.

---

Transient failures are a fact of life in distributed systems. A pod gets restarted, a network blip drops a packet, or an upstream service briefly returns errors during a deployment. Retries are the standard defense against these short-lived failures. Instead of returning an error to the user immediately, you try again - and more often than not, the second attempt succeeds.

Istio handles retries at the sidecar proxy level, which means you get retry behavior without changing your application code. The proxy detects failed requests and automatically retries them based on your configured policy. This post covers how to configure retries in Istio, what conditions trigger them, and how to avoid the common pitfalls.

## Basic Retry Configuration

Retries are configured in the VirtualService under the HTTP route:

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
    - retries:
        attempts: 3
        perTryTimeout: 2s
      route:
        - destination:
            host: order-service
```

This configuration says:

- **attempts: 3** - Retry up to 3 times after the initial attempt fails (so 4 total attempts)
- **perTryTimeout: 2s** - Each attempt gets 2 seconds before it's considered failed

## Retry Conditions (retryOn)

The `retryOn` field determines which failures trigger a retry. If you don't specify it, Istio uses a default of `connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes`.

You can configure specific conditions:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: 5xx,reset,connect-failure,retriable-status-codes
```

Available retry conditions:

| Condition | What It Matches |
|---|---|
| `5xx` | Any 5xx response code from upstream |
| `gateway-error` | 502, 503, or 504 from upstream |
| `reset` | Upstream resets the connection |
| `connect-failure` | Connection to upstream fails |
| `retriable-4xx` | Retryable 4xx (409 Conflict) |
| `refused-stream` | Upstream refuses the HTTP/2 stream |
| `retriable-status-codes` | Specific status codes from `x-envoy-retriable-status-codes` header |
| `retriable-headers` | Based on response headers |
| `cancelled` | gRPC CANCELLED status |
| `deadline-exceeded` | gRPC DEADLINE_EXCEEDED status |
| `unavailable` | gRPC UNAVAILABLE status |
| `resource-exhausted` | gRPC RESOURCE_EXHAUSTED status |

### Common Retry Condition Combinations

For HTTP APIs:

```yaml
retries:
  attempts: 3
  retryOn: 5xx,reset,connect-failure
```

For gRPC services:

```yaml
retries:
  attempts: 3
  retryOn: cancelled,deadline-exceeded,unavailable,resource-exhausted
```

For conservative retries (only on connection issues):

```yaml
retries:
  attempts: 2
  retryOn: connect-failure,refused-stream,reset
```

## Per-Try Timeout

The `perTryTimeout` sets how long each individual retry attempt can take before being considered failed:

```yaml
retries:
  attempts: 3
  perTryTimeout: 1500ms
```

If the upstream doesn't respond within 1.5 seconds, that attempt is aborted and the next retry begins.

Without a perTryTimeout, each attempt can take as long as the overall route timeout allows. This means your retries might consume all the available time on the first slow attempt, leaving no time for subsequent retries.

A good rule: set `perTryTimeout` shorter than the overall route timeout divided by the number of attempts:

```yaml
timeout: 10s  # Overall timeout
retries:
  attempts: 3
  perTryTimeout: 3s  # 3 attempts * 3s = 9s, within the 10s overall timeout
```

## Retry with Backoff

Istio supports retry backoff to add a delay between retry attempts. This prevents hammering a struggling upstream:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: 5xx,connect-failure
  retryRemoteLocalities: true
```

Envoy automatically adds a jittered backoff between retries. The base interval is 25ms, and it increases exponentially up to 250ms. You don't have a direct configuration option for the backoff duration in Istio's VirtualService, but this built-in backoff provides reasonable spacing between attempts.

## Retries Across Different Hosts

By default, Envoy tries to send retries to a different upstream instance than the one that failed. This is a smart default because if one pod is failing, sending the retry to the same pod will likely fail again.

If you want retries to also try pods in different zones or regions:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryRemoteLocalities: true
```

Setting `retryRemoteLocalities: true` allows retries to be sent to upstream instances in different localities.

## Full Configuration Example

Here's a production-ready retry configuration for a typical API service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: production
spec:
  hosts:
    - product-service
  http:
    # Read endpoints - aggressive retries
    - match:
        - uri:
            prefix: /api/products
          method:
            exact: GET
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 1500ms
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: product-service
    # Write endpoints - conservative retries
    - match:
        - uri:
            prefix: /api/products
          method:
            exact: POST
      timeout: 10s
      retries:
        attempts: 1
        perTryTimeout: 8s
        retryOn: connect-failure,refused-stream
      route:
        - destination:
            host: product-service
    # Default
    - timeout: 5s
      retries:
        attempts: 2
        perTryTimeout: 2s
        retryOn: 5xx,connect-failure
      route:
        - destination:
            host: product-service
```

Read operations get more retries because they're idempotent. Write operations only retry on connection failures (not 5xx responses) to avoid duplicate writes.

## Monitoring Retries

Track retry behavior with Istio metrics:

```bash
# Check for retry exhaustion (all retries failed)
kubectl logs deploy/frontend -c istio-proxy -n production | grep "URX"
```

The `URX` response flag in access logs means upstream retry limit exceeded - all attempts failed.

You can also check the retry stats in Envoy:

```bash
kubectl exec deploy/frontend -c istio-proxy -n production -- curl -s localhost:15000/stats | grep "retry"
```

Output includes:

```text
cluster.outbound|8080||product-service.production.svc.cluster.local.upstream_rq_retry: 47
cluster.outbound|8080||product-service.production.svc.cluster.local.upstream_rq_retry_success: 41
cluster.outbound|8080||product-service.production.svc.cluster.local.upstream_rq_retry_overflow: 0
cluster.outbound|8080||product-service.production.svc.cluster.local.upstream_rq_retry_limit_exceeded: 6
```

These stats tell you:
- 47 total retries happened
- 41 of those retries succeeded (the second or third attempt worked)
- 0 retries were rejected due to circuit breaker overflow
- 6 requests exhausted all retries and still failed

## The Retry Amplification Problem

Retries multiply the load on your upstream service. If you send 100 requests/second with a 30% failure rate and 3 retries:

- 100 original requests
- ~30 first retries
- ~9 second retries
- ~3 third retries
- Total: ~142 requests/second hitting the upstream

That's a 42% increase in load. If the upstream is already struggling, the extra load from retries can push it further into failure. This is the retry storm problem.

Mitigation strategies:

1. **Limit retry attempts**: 2-3 is usually enough. More than that rarely helps.
2. **Use circuit breakers**: A circuit breaker prevents retries from flooding a failing upstream.
3. **Set retry budgets implicitly**: Keep max pending requests low in the DestinationRule connection pool.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: production
spec:
  host: product-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Retries and Idempotency

Only retry operations that are safe to repeat. A GET request is naturally idempotent - calling it twice gives the same result. A POST that creates an order is not - retrying it could create duplicate orders.

Best practices:

- Retry all GET, HEAD, OPTIONS, and DELETE requests freely
- Retry POST and PUT only on connection failures (the request never reached the server)
- For non-idempotent operations, use application-level idempotency keys

```yaml
# Safe: retry on any 5xx for GET
- match:
    - method:
        exact: GET
  retries:
    attempts: 3
    retryOn: 5xx,connect-failure

# Careful: only retry connection failures for POST
- match:
    - method:
        exact: POST
  retries:
    attempts: 1
    retryOn: connect-failure
```

Retry policies in Istio are straightforward to configure and provide real value in production. They mask transient failures, improve user experience, and reduce the need for application-level retry logic. But they need to be configured thoughtfully - the wrong retry policy can amplify failures instead of absorbing them.
