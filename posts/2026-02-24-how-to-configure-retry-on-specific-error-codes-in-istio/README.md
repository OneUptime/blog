# How to Configure Retry on Specific Error Codes in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Error Handling, Kubernetes, Envoy

Description: How to configure Istio retries for specific HTTP error codes and conditions using VirtualService retry policies with practical examples and best practices.

---

Retrying failed requests is one of the most effective ways to handle transient errors in a distributed system. But blindly retrying every failed request is a recipe for disaster. You need to be selective about which errors you retry, how many times, and with what backoff. Istio gives you fine-grained control over retry behavior through the VirtualService resource.

## Basic Retry Configuration

The simplest retry configuration in Istio looks like this:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
```

Without specifying `retryOn`, Istio defaults to retrying on `connect-failure,refused-stream,unavailable,cancelled`. That means it retries on connection failures, refused streams, and the listed gRPC status conditions. It does not retry on HTTP 500 or 503 responses by default.

## The retryOn Field

The `retryOn` field is where you specify exactly which errors trigger a retry. It accepts a comma-separated string of Envoy retry policy values:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: 5xx,reset,connect-failure,retriable-4xx,refused-stream
```

Here is what each value means:

**5xx** - Retry on any 5xx response code, or when the upstream does not respond because of a disconnect, reset, or read timeout. This includes 500, 502, 503, 504, etc.

**reset** - Retry when the upstream resets the connection (TCP RST).

**connect-failure** - Retry when the TCP connection fails entirely (connection refused, timeout on connect).

**refused-stream** - Retry when the upstream resets the stream with a REFUSED_STREAM error code.

**retriable-4xx** - Currently only retries 409 Conflict. This is useful for optimistic concurrency scenarios where a retry might succeed.

**gateway-error** - Retry on 502, 503, or 504 responses, or when the upstream does not respond. This is more specific than `5xx` if you only care about gateway errors.

**retriable-status-codes** - Used in Envoy retry policies with `retriable_status_codes` to specify custom status codes. In Istio VirtualService, you can also put numeric status codes directly in `retryOn`, such as `retryOn: "503,reset"`.

## Retrying Only on Specific Status Codes

If you want to retry only on specific HTTP status codes (for example, 503 but not 500), put the numeric status code directly in the VirtualService `retryOn` field:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "503"
```

This only retries when the upstream returns exactly a 503. A 500 or 502 would not trigger a retry.

You can specify multiple status codes:

```yaml
retryOn: "503,429,502"
```

## Combining retryOn with Specific Codes

You can combine the high-level retry policies with specific status codes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: combined-retry
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: "connect-failure,reset,503,429"
```

This retries on connection failures, resets, 503, and 429. It will not retry on 500 or other status codes.

## Retrying on Rate Limit (429)

Retrying on 429 Too Many Requests is a common need, but you have to be careful not to make things worse. If a service is rate limiting you, hammering it with retries is counterproductive. Use a longer per-try timeout and fewer attempts:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: rate-limited-service-vs
  namespace: default
spec:
  hosts:
    - rate-limited-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: rate-limited-service.default.svc.cluster.local
      retries:
        attempts: 2
        perTryTimeout: 5s
        backoff: 1s
        retryOn: "429"
```

Istio supports a `backoff` field in the VirtualService retry policy. If you do not set it, Envoy uses a default jittered exponential backoff with a 25ms base interval.

## Retrying on gRPC Errors

For gRPC services, the retry configuration uses gRPC-specific status codes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-service-vs
  namespace: default
spec:
  hosts:
    - grpc-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: unavailable,resource-exhausted,cancelled
```

gRPC retry values include:
- `cancelled` - gRPC status code 1
- `deadline-exceeded` - gRPC status code 4
- `resource-exhausted` - gRPC status code 8
- `unavailable` - gRPC status code 14
- `internal` - gRPC status code 13

## Setting Different Retry Policies Per Route

You can configure different retry behavior for different endpoints within the same service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service-vs
  namespace: default
spec:
  hosts:
    - api-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /api/read
          method:
            exact: GET
      route:
        - destination:
            host: api-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,connect-failure,reset
    - match:
        - uri:
            prefix: /api/write
      route:
        - destination:
            host: api-service.default.svc.cluster.local
      retries:
        attempts: 0
    - route:
        - destination:
            host: api-service.default.svc.cluster.local
      retries:
        attempts: 1
        perTryTimeout: 3s
        retryOn: connect-failure
```

GET requests get aggressive retries, write endpoints get no retries, and everything else gets one retry only on connection failures.

## Disabling Retries

In some cases, you want to explicitly disable retries. For example, for a service that is not idempotent:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: default
spec:
  hosts:
    - payment-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: payment-service.default.svc.cluster.local
      retries:
        attempts: 0
```

Setting `attempts: 0` disables retries completely.

## Monitoring Retry Behavior

To make sure your retry configuration is working as expected, monitor these metrics:

```promql
# Total retries per service

sum(rate(envoy_cluster_upstream_rq_retry{cluster_name=~"outbound.*my-service.*"}[5m]))

# Retries that succeeded
sum(rate(envoy_cluster_upstream_rq_retry_success{cluster_name=~"outbound.*my-service.*"}[5m]))

# Retries that hit the limit
sum(rate(envoy_cluster_upstream_rq_retry_limit_exceeded{cluster_name=~"outbound.*my-service.*"}[5m]))

# Retry overflow (too many concurrent retries)
sum(rate(envoy_cluster_upstream_rq_retry_overflow{cluster_name=~"outbound.*my-service.*"}[5m]))
```

If `retry_limit_exceeded` is high, your retry budget is too low for the error rate. If `retry_overflow` is high, you have too many concurrent retries and need to look at the underlying issue.

## Best Practices

A few things I have learned the hard way about retries:

1. Only retry idempotent operations. If calling the same endpoint twice could create duplicate resources or charge a customer twice, do not retry it.

2. Always set a perTryTimeout. Without it, a single slow request could consume your entire retry budget.

3. Keep retry counts low (2-3 max). More retries means more load on an already struggling service.

4. Monitor retry rates. If retries are firing constantly, you have a systemic issue that retries will not fix.

5. Combine retries with circuit breakers. Retries handle transient errors; circuit breakers handle sustained failures.

## Summary

Configuring retries on specific error codes in Istio requires understanding the `retryOn` field in VirtualService. Use `5xx` for broad error retries, `gateway-error` for gateway failures, and numeric status codes such as `503` or `429` for individual status codes. Always pair retries with appropriate timeouts and monitor the retry metrics to make sure you are actually improving reliability rather than amplifying failures.
