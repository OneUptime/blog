# How to Implement Retry and Timeout Patterns with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Timeouts, Resilience, Kubernetes, Service Mesh

Description: A practical guide to configuring retry and timeout policies in Istio to build resilient microservices that handle transient failures gracefully.

---

Transient failures happen all the time in distributed systems. A pod gets rescheduled, a network blip causes a connection reset, or a service temporarily runs out of memory. If your application gives up on the first failure, users see errors that could have been avoided with a simple retry.

The traditional approach is to add retry logic to every service, usually with some library like Polly or resilience4j. This works, but it means every team implements retries differently, timeout values are scattered across codebases, and changing a policy requires a code deploy.

Istio moves retry and timeout logic to the sidecar proxy layer. You configure them with VirtualService resources and can change policies without redeploying your applications.

## Basic Retry Configuration

Here's a straightforward retry setup for a service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: default
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
```

This tells Istio to retry failed requests up to 3 times, with a 2-second timeout for each attempt. Retries are triggered on 5xx responses, connection resets, and connection failures.

### Understanding retryOn Conditions

The `retryOn` field accepts a comma-separated list of conditions:

- `5xx` - retry on any 5xx response code
- `gateway-error` - retry on 502, 503, or 504
- `reset` - retry when the upstream resets the connection
- `connect-failure` - retry when the connection to the upstream fails
- `retriable-4xx` - retry on 409 (conflict) responses
- `refused-stream` - retry when the upstream refuses the stream (RST_STREAM with REFUSED_STREAM)
- `retriable-status-codes` - retry on specific status codes (configured separately)
- `retriable-headers` - retry based on response headers

For most APIs, `5xx,reset,connect-failure` covers the common failure modes.

### Retrying on Specific Status Codes

If you want to retry only on specific HTTP status codes:

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: retriable-status-codes
  retryRemoteLocalities: false
```

Then in the EnvoyFilter, configure which status codes should trigger retries. Alternatively, services can set the `x-envoy-retriable-status-codes` header to specify codes like `503,504`.

## Basic Timeout Configuration

Timeouts prevent your services from waiting forever for a response:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: default
spec:
  hosts:
  - inventory-service
  http:
  - route:
    - destination:
        host: inventory-service
    timeout: 10s
```

This sets a 10-second overall timeout for requests to the inventory service. If the request takes longer, the caller gets a 504 Gateway Timeout.

## Combining Retries and Timeouts

When you use retries and timeouts together, the math matters. The total time a request can take is roughly:

```
total time = attempts * perTryTimeout
```

But there's a catch. The overall `timeout` field on the route acts as a hard cap. If you set `timeout: 10s`, 3 retry attempts, and `perTryTimeout: 5s`, the theoretical max is 15 seconds (3 * 5), but the 10-second overall timeout will cut it short.

Here's a well-thought-out configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: default
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 8s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,reset,connect-failure
```

With 3 attempts at 3 seconds each, the worst case is 9 seconds. The overall timeout of 8 seconds ensures we don't exceed our budget. The third retry might get cut short, but that's fine - you'd rather fail fast than keep the caller waiting.

## Per-Route Timeouts

Different endpoints often need different timeout values. A search endpoint should be fast, while a report generation endpoint might need more time:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: report-service
  namespace: default
spec:
  hosts:
  - report-service
  http:
  - match:
    - uri:
        prefix: /api/reports/generate
    timeout: 60s
    retries:
      attempts: 1
    route:
    - destination:
        host: report-service
  - match:
    - uri:
        prefix: /api/reports
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
    route:
    - destination:
        host: report-service
```

The report generation endpoint gets 60 seconds with no retries (since it's not idempotent), while listing reports gets 5 seconds with retries.

## Timeout Propagation in a Call Chain

Consider a call chain: Frontend -> Order Service -> Payment Service -> Bank API. Each hop needs its own timeout, and they need to decrease down the chain:

```yaml
# Frontend to Order Service: 15s timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
    timeout: 15s
---
# Order Service to Payment Service: 10s timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 10s
---
# Payment Service to Bank API: 5s timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: bank-api
spec:
  hosts:
  - bank-api
  http:
  - route:
    - destination:
        host: bank-api
    timeout: 5s
```

If the bank API takes too long, it times out at 5 seconds. The payment service then has 5 more seconds of its 10-second budget to handle the error and respond. The order service has 5 more seconds of its 15-second budget. This cascading timeout pattern prevents the whole chain from hanging.

## Retry Budgets

Retries can amplify load on an already struggling service. If 1000 requests per second are failing and each one retries 3 times, you're now sending 4000 requests per second to a service that couldn't handle 1000.

Istio doesn't have a built-in retry budget feature, but you can mitigate this with circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

The connection pool limits prevent too many requests from piling up. Outlier detection ejects failing instances, so retries go to healthy pods instead of hammering the same broken one.

## Disabling Retries for Non-Idempotent Operations

Not everything should be retried. If a POST request creates a resource and it might have succeeded before the connection dropped, retrying could create duplicates. Disable retries for these cases:

```yaml
http:
- match:
  - uri:
      prefix: /api/orders
    method:
      exact: POST
  retries:
    attempts: 0
  route:
  - destination:
      host: order-service
- match:
  - uri:
      prefix: /api/orders
    method:
      exact: GET
  retries:
    attempts: 3
    perTryTimeout: 2s
    retryOn: 5xx,reset,connect-failure
  route:
  - destination:
      host: order-service
```

GET requests get retried, POST requests don't.

## Monitoring Retries and Timeouts

Keep an eye on retry and timeout metrics to catch issues early:

```bash
# Check Envoy stats for upstream retries
istioctl proxy-config stats deploy/frontend -n default | grep retry

# Look for timeout stats
istioctl proxy-config stats deploy/frontend -n default | grep timeout
```

In Prometheus, the `istio_requests_total` metric includes a `response_code` label. A spike in 504 responses indicates timeout problems. A spike in 503 responses might indicate circuit breaking is kicking in.

Setting up retries and timeouts properly requires thinking about your service dependencies, response time expectations, and failure modes. Start with conservative values (short timeouts, few retries) and adjust based on what you observe in production. The goal is to handle transient failures without making things worse during sustained outages.
