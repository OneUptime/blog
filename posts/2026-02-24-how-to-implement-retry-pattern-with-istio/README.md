# How to Implement Retry Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retry Pattern, Resilience, VirtualService, Envoy

Description: How to configure automatic retries in Istio using VirtualService retry policies to handle transient failures without application code changes.

---

Transient failures happen all the time in distributed systems. A network blip, a brief pod restart, a momentary overload. The retry pattern handles these by automatically re-sending failed requests to give them another chance to succeed. Istio lets you configure retries at the mesh level through VirtualServices, so your application code does not need to implement retry logic itself.

## Basic Retry Configuration

The simplest retry configuration retries failed requests a fixed number of times:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
  namespace: default
spec:
  hosts:
  - service-b
  http:
  - route:
    - destination:
        host: service-b
    retries:
      attempts: 3
      perTryTimeout: 2s
```

**attempts: 3** - Retry up to 3 times after the initial request fails (so the total number of attempts is 4: 1 original + 3 retries).

**perTryTimeout: 2s** - Each individual attempt (including the original) has a 2-second timeout. If the upstream does not respond within 2 seconds, Envoy treats it as a failure and retries.

## What Gets Retried by Default

Istio has default retry behavior that applies even without explicit configuration. By default, Envoy retries requests that fail with:

- `connect-failure` - Connection to upstream failed
- `refused-stream` - Upstream reset the stream (e.g., RST_STREAM in HTTP/2)
- `unavailable` - Upstream returned a 503 (for gRPC)
- `cancelled` - gRPC status code CANCELLED
- `retriable-status-codes` - Configurable HTTP status codes

The default is 2 retry attempts with a 25ms+ base interval between retries.

## Controlling What Gets Retried

You can explicitly control which conditions trigger a retry using the `retryOn` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
  - service-b
  http:
  - route:
    - destination:
        host: service-b
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: "5xx,reset,connect-failure,retriable-4xx"
```

Available retry conditions:

- **5xx** - Retry on any 5xx response code
- **gateway-error** - Retry on 502, 503, or 504
- **reset** - Retry if the upstream resets the connection
- **connect-failure** - Retry if the connection to upstream fails
- **retriable-4xx** - Retry on 409 (Conflict)
- **refused-stream** - Retry if the upstream refuses the stream
- **retriable-status-codes** - Retry on specific HTTP status codes (configured separately)
- **retriable-headers** - Retry based on response headers

Multiple conditions are comma-separated.

For retrying specific status codes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
  - service-b
  http:
  - route:
    - destination:
        host: service-b
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: "retriable-status-codes"
      retryRemoteLocalities: true
```

## Retry Backoff

Envoy uses exponential backoff between retries. The base interval is 25ms, and each subsequent retry doubles the wait time (25ms, 50ms, 100ms, etc.) with jitter added. The maximum interval is 250ms by default.

You cannot directly configure the backoff in the VirtualService API, but the default behavior is usually fine for most use cases.

## Retries with Timeouts

It is important to set `perTryTimeout` in conjunction with the overall route timeout. If you do not set a per-try timeout, each retry will use the full route timeout, which means retries at the end might not have enough time to complete.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
  - service-b
  http:
  - route:
    - destination:
        host: service-b
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
```

In this example:
- Each attempt has a 3-second timeout
- The overall request has a 10-second timeout
- If the first attempt takes 3 seconds and fails, the second attempt starts. If it also takes 3 seconds and fails, the third attempt starts. It has 4 seconds of the overall timeout remaining (10 - 3 - 3 = 4), but the per-try timeout caps it at 3 seconds.

## Retrying Only Idempotent Requests

Retries are dangerous for non-idempotent requests. If you retry a POST that creates a record, you might create duplicate records. By default, Istio only retries on connection-level failures (where the request probably never reached the server). But if you set `retryOn: "5xx"`, even completed POST requests that returned a 500 will be retried.

One approach is to configure retries only for GET requests using match conditions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
  - service-b
  http:
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: service-b
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: "5xx,connect-failure,refused-stream"
  - route:
    - destination:
        host: service-b
    retries:
      attempts: 2
      perTryTimeout: 2s
      retryOn: "connect-failure,refused-stream"
```

GET requests get retried on 5xx errors (since GETs are idempotent), while other methods only retry on connection-level failures.

## Preventing Retry Storms

When a service is already struggling, retries can make things worse. If 100 clients each retry 3 times, the failing service sees 400 requests instead of 100. This is called a retry storm.

Istio has a built-in mechanism to limit retries at the connection pool level:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    connectionPool:
      http:
        maxRetries: 10
```

The `maxRetries` field in the DestinationRule limits the total number of concurrent outstanding retries to the service. This is different from the per-request `attempts` in the VirtualService. Even if each request is configured for 3 retries, if there are already 10 retries in flight across all requests, additional retries will not be attempted.

## Monitoring Retries

Track retry metrics to understand how often retries are happening and whether they are helping:

```promql
# Retry rate
rate(envoy_cluster_upstream_rq_retry{cluster_name=~"outbound.*service-b.*"}[5m])

# Successful retries (the retry worked)
rate(envoy_cluster_upstream_rq_retry_success{cluster_name=~"outbound.*service-b.*"}[5m])

# Retry overflow (retries that were not attempted due to limits)
rate(envoy_cluster_upstream_rq_retry_overflow{cluster_name=~"outbound.*service-b.*"}[5m])
```

If `retry_success` is high, retries are handling transient failures well. If `retry_overflow` is high, you may need to increase the retry budget. If retries are high but success rate is low, the downstream service has a persistent problem that retries will not fix.

Set up alerts:

```yaml
groups:
- name: retry-monitoring
  rules:
  - alert: HighRetryRate
    expr: |
      rate(envoy_cluster_upstream_rq_retry[5m])
      / rate(envoy_cluster_upstream_rq_total[5m])
      > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "More than 10% of requests to {{ $labels.cluster_name }} are being retried"
```

## Disabling Retries for Specific Routes

Sometimes you want to disable retries for specific routes, even if the default configuration includes them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
  - service-b
  http:
  - match:
    - uri:
        prefix: /webhook
    route:
    - destination:
        host: service-b
    retries:
      attempts: 0
  - route:
    - destination:
        host: service-b
    retries:
      attempts: 3
      perTryTimeout: 2s
```

The webhook endpoint gets no retries (because webhook delivery should only happen once), while all other routes get 3 retries.

## Retries for gRPC Services

gRPC retries work similarly but use gRPC status codes instead of HTTP status codes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-service
spec:
  hosts:
  - grpc-service
  http:
  - route:
    - destination:
        host: grpc-service
    retries:
      attempts: 3
      perTryTimeout: 1s
      retryOn: "unavailable,resource-exhausted,internal"
```

The gRPC retry conditions map to gRPC status codes: `unavailable` (UNAVAILABLE), `resource-exhausted` (RESOURCE_EXHAUSTED), `internal` (INTERNAL), `cancelled` (CANCELLED), and `deadline-exceeded` (DEADLINE_EXCEEDED).

Retries are a powerful tool for handling transient failures, but they need to be configured thoughtfully. Always consider idempotency, set appropriate timeouts, limit retry budgets to prevent storms, and monitor retry metrics to make sure they are helping rather than hurting.
