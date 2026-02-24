# How to Configure Retry on Specific Error Codes in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Error Handling, Kubernetes, Envoy

Description: How to configure Istio retries for specific HTTP error codes and conditions using VirtualService retry policies with practical examples and best practices.

---

Retrying failed requests is one of the most effective ways to handle transient errors in a distributed system. But blindly retrying every failed request is a recipe for disaster. You need to be selective about which errors you retry, how many times, and with what backoff. Istio gives you fine-grained control over retry behavior through the VirtualService resource.

## Basic Retry Configuration

The simplest retry configuration in Istio looks like this:

```yaml
apiVersion: networking.istio.io/v1beta1
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

Without specifying `retryOn`, Istio defaults to retrying on `connect-failure,refused-stream`. That means it only retries when the connection fails entirely or the server refuses the stream. It does not retry on 500 or 503 errors by default.

## The retryOn Field

The `retryOn` field is where you specify exactly which errors trigger a retry. It accepts a comma-separated string of Envoy retry policy values:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: 5xx,reset,connect-failure,retriable-4xx,refused-stream
```

Here is what each value means:

**5xx** - Retry on any 5xx response code. This includes 500, 502, 503, 504, etc.

**reset** - Retry when the upstream resets the connection (TCP RST).

**connect-failure** - Retry when the TCP connection fails entirely (connection refused, timeout on connect).

**refused-stream** - Retry when the upstream resets the stream with a REFUSED_STREAM error code.

**retriable-4xx** - Currently only retries 409 Conflict. This is useful for optimistic concurrency scenarios where a retry might succeed.

**gateway-error** - Retry on 502, 503, or 504 responses. This is more specific than `5xx` if you only care about gateway errors.

**retriable-status-codes** - Used with `retryRemoteLocalities` to specify custom status codes.

## Retrying Only on Specific Status Codes

If you want to retry only on specific HTTP status codes (for example, 503 but not 500), you need to use an EnvoyFilter because the VirtualService retryOn does not support individual status codes directly:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: retry-on-503
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-client-service
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_OUTBOUND
        routeConfiguration:
          vhost:
            route:
              name: default
      patch:
        operation: MERGE
        value:
          route:
            retry_policy:
              retry_on: "retriable-status-codes"
              retriable_status_codes:
                - 503
              num_retries: 3
              per_try_timeout: 2s
```

This only retries when the upstream returns exactly a 503. A 500 or 502 would not trigger a retry.

You can specify multiple status codes:

```yaml
retriable_status_codes:
  - 503
  - 429
  - 502
```

## Combining retryOn with Specific Codes

You can combine the high-level retry policies with specific status codes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: combined-retry
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-client-service
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          route:
            retry_policy:
              retry_on: "connect-failure,reset,retriable-status-codes"
              retriable_status_codes:
                - 503
                - 429
              num_retries: 3
              per_try_timeout: 5s
```

This retries on connection failures, resets, 503, and 429. It will not retry on 500 or other status codes.

## Retrying on Rate Limit (429)

Retrying on 429 Too Many Requests is a common need, but you have to be careful not to make things worse. If a service is rate limiting you, hammering it with retries is counterproductive. Use a longer per-try timeout and fewer attempts:

```yaml
apiVersion: networking.istio.io/v1beta1
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
        retryOn: retriable-4xx
```

Unfortunately, Istio does not support retry backoff configuration directly in the VirtualService. Envoy uses a default jittered exponential backoff starting at 25ms. If you need longer backoff (which you do for rate limiting), you would need to handle that in your application code.

## Retrying on gRPC Errors

For gRPC services, the retry configuration uses gRPC-specific status codes:

```yaml
apiVersion: networking.istio.io/v1beta1
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
apiVersion: networking.istio.io/v1beta1
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
        - headers:
            ":method":
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
apiVersion: networking.istio.io/v1beta1
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

Configuring retries on specific error codes in Istio requires understanding the `retryOn` field in VirtualService and knowing when to use EnvoyFilter for more granular control. Use `5xx` for broad error retries, `gateway-error` for just 502/503/504, and `retriable-status-codes` via EnvoyFilter for individual status codes. Always pair retries with appropriate timeouts and monitor the retry metrics to make sure you are actually improving reliability rather than amplifying failures.
