# How to Configure gRPC Retries with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC, Retries, Kubernetes, Resilience

Description: Configure gRPC retry policies in Istio using VirtualService resources, with real examples covering retry conditions, backoff, and gRPC status codes.

---

Retries are one of those things that seem simple until you actually implement them. Retry too aggressively and you create a thundering herd. Do not retry at all and a single transient failure takes down a request. With gRPC services running behind Istio, you get retry capabilities built into the Envoy proxy without changing your application code.

## How Istio Retries Work for gRPC

When you configure retries in Istio, the Envoy sidecar on the client side handles them. If a request to a backend fails with a retryable condition, Envoy resends the request automatically. The application never knows this happened. It just sees a successful response (or a final failure after retries are exhausted).

For gRPC, retries are configured in a VirtualService using the `retries` field inside an `http` route. Even though gRPC uses HTTP/2, Istio routes it under the `http` section because Envoy treats gRPC as HTTP/2.

## Basic Retry Configuration

Here is a simple retry policy for a gRPC service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: unavailable,resource-exhausted
```

This tells Envoy to retry up to 3 times, with each attempt timing out after 2 seconds. It only retries on `unavailable` and `resource-exhausted` gRPC status codes.

## Understanding retryOn for gRPC

The `retryOn` field supports both HTTP retry conditions and gRPC-specific status codes. For gRPC services, the most useful conditions are:

**gRPC status codes** (use lowercase, hyphenated names):
- `cancelled` - the call was cancelled
- `deadline-exceeded` - deadline expired before the operation completed
- `resource-exhausted` - the server is out of resources (like rate limiting)
- `unavailable` - the service is temporarily unavailable
- `internal` - internal server error

**HTTP-level conditions** (also applicable to gRPC):
- `connect-failure` - connection to the upstream failed
- `refused-stream` - the upstream reset the stream with a REFUSED_STREAM error
- `retriable-status-codes` - retry on specific HTTP status codes
- `reset` - upstream reset with no status code
- `retriable-headers` - retry based on response headers

You can combine them with commas:

```yaml
retries:
  attempts: 3
  perTryTimeout: 5s
  retryOn: connect-failure,refused-stream,unavailable,cancelled,resource-exhausted
```

## Configuring Retry Backoff

By default, Envoy uses an exponential backoff starting at 25ms with a maximum of 250ms. You can configure the base interval:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: unavailable,resource-exhausted
      timeout: 10s
```

The overall `timeout` on the route sets a ceiling for the total time including all retries. If you set `perTryTimeout: 2s` and `attempts: 3`, the total time could be up to ~6 seconds plus backoff delays. The `timeout` at the route level caps the entire operation.

## Per-Method Retry Policies

Not all gRPC methods should be retried. Unary calls that are idempotent are great candidates. Streaming calls or non-idempotent mutations are risky to retry. You can apply different policies per method using match rules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - match:
        - headers:
            ":path":
              prefix: "/mypackage.MyService/GetItem"
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: unavailable,resource-exhausted
    - match:
        - headers:
            ":path":
              prefix: "/mypackage.MyService/CreateItem"
      route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 0
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 2
        retryOn: unavailable
```

gRPC methods appear as HTTP/2 paths in the format `/<package>.<service>/<method>`. You can match on these to apply different retry behavior.

## Disabling Retries

Istio actually has a default retry policy (2 retries on connect-failure and refused-stream). If you want to disable retries entirely:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
      retries:
        attempts: 0
```

Setting `attempts: 0` turns off retries for that route.

## Retry Budgets with Circuit Breaking

Retries can amplify failures. If every client retries 3 times, one failing backend gets 3x the traffic. To prevent this, pair retries with circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRetries: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

The `maxRetries` field in the connection pool limits the total number of concurrent retries to the upstream. If this limit is reached, additional retries are not attempted. This prevents retry storms.

## Verifying Retries Are Working

Check the Envoy stats to see if retries are happening:

```bash
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_retry"
```

You will see counters like:
- `upstream_rq_retry` - total number of retries
- `upstream_rq_retry_success` - retries that succeeded
- `upstream_rq_retry_overflow` - retries that were not attempted because the retry budget was exhausted

If `upstream_rq_retry` is 0 and you expect retries, check that your `retryOn` conditions match the actual errors your service is returning.

## A Complete Example

Here is a full working configuration for a gRPC service with sensible retry settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: default
spec:
  hosts:
    - payment-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: payment-service.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: connect-failure,refused-stream,unavailable,resource-exhausted
      timeout: 15s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: default
spec:
  host: payment-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
        maxRetries: 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

This gives you retries with a safety net. The circuit breaker ejects unhealthy pods so retries go to healthy ones. The retry budget prevents amplification. And the overall timeout keeps the client from waiting forever.

The important takeaway is that retries in Istio work well for gRPC, but you should always think about idempotency and pair them with circuit breaking to avoid making outages worse.
