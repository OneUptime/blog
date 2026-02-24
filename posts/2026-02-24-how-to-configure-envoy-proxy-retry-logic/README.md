# How to Configure Envoy Proxy Retry Logic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Retries, Resilience, Kubernetes, Service Mesh

Description: Learn how to configure retry logic in Istio using VirtualService retry policies, including retry conditions, backoff, and per-try timeouts to build resilient services.

---

Transient failures are a fact of life in distributed systems. A pod gets restarted, a node has a brief network hiccup, or a service runs out of memory for a second. Retries can paper over these temporary blips without the caller ever knowing something went wrong. In Istio, retry logic lives in VirtualService resources and gets enforced by the Envoy sidecar proxy.

## Default Retry Behavior

Istio actually configures retries by default. Without any VirtualService, Envoy retries failed requests twice with a 25ms base interval. The default retry condition is `connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes`.

You can see this in action by checking the route config:

```bash
istioctl proxy-config route <pod-name> -n <namespace> -o json
```

Look for the `retryPolicy` section in the output.

## Basic Retry Configuration

To customize retries, create a VirtualService with a retry policy:

```yaml
apiVersion: networking.istio.io/v1
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
      retryOn: "5xx,reset,connect-failure,retriable-status-codes"
```

**attempts** - The total number of retry attempts. Setting this to 3 means the original request plus 3 retries, for a total of 4 attempts.

**perTryTimeout** - The timeout for each individual attempt. If a single attempt takes longer than 2 seconds, it's cancelled and the next retry kicks in.

**retryOn** - A comma-separated list of conditions that trigger a retry.

## Retry Conditions Explained

The `retryOn` field accepts several conditions. Here are the most commonly used ones:

**5xx** - Retry on any 5xx response code from the upstream service.

**gateway-error** - Retry only on 502, 503, or 504 responses.

**connect-failure** - Retry when Envoy can't establish a connection to the upstream.

**refused-stream** - Retry when the upstream resets the stream with a REFUSED_STREAM error (HTTP/2).

**retriable-4xx** - Retry on 409 Conflict responses.

**reset** - Retry if the upstream connection is reset (TCP RST) before a response is received.

**retriable-status-codes** - Retry on specific status codes. You need to pair this with the `retriable-status-codes` header or configure it via EnvoyFilter.

**retriable-headers** - Retry based on response headers.

A practical combination for most services:

```yaml
retryOn: "connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes"
```

## Retry Backoff

By default, Envoy uses an exponential backoff for retries. The base interval is 25ms and it doubles with each retry, capped at 250ms. You can customize this through an EnvoyFilter if the defaults don't work for you:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: retry-backoff
  namespace: production
spec:
  workloadSelector:
    labels:
      app: frontend
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
          retryPolicy:
            retryBackOff:
              baseInterval: 100ms
              maxInterval: 1s
```

This changes the backoff to start at 100ms and cap at 1 second.

## Per-Route Retry Configuration

Different routes within the same service might need different retry settings. You can set retries per route in a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service
  namespace: production
spec:
  hosts:
  - api-service
  http:
  - match:
    - uri:
        prefix: /api/payments
    route:
    - destination:
        host: api-service
    retries:
      attempts: 5
      perTryTimeout: 5s
      retryOn: "5xx,connect-failure"
  - match:
    - uri:
        prefix: /api/notifications
    route:
    - destination:
        host: api-service
    retries:
      attempts: 2
      perTryTimeout: 1s
      retryOn: "connect-failure"
  - route:
    - destination:
        host: api-service
    retries:
      attempts: 3
      perTryTimeout: 2s
```

Payment endpoints get more retries with longer timeouts (because payments are critical), while notification endpoints get fewer retries (because they're less important and you don't want to spam notification systems).

## Disabling Retries

Sometimes you want to explicitly disable retries for certain services. Maybe the operation isn't idempotent, or maybe the service has its own retry logic at the application level and you don't want double retries.

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
  - route:
    - destination:
        host: order-service
    retries:
      attempts: 0
```

Setting `attempts: 0` disables retries entirely.

## Retries and Timeouts Working Together

You need to think about how retries interact with the overall request timeout. If your per-try timeout is 2s and you allow 3 retries, the total time could be up to 8s (original + 3 retries). Make sure your overall timeout accommodates this:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catalog-service
  namespace: production
spec:
  hosts:
  - catalog-service
  http:
  - route:
    - destination:
        host: catalog-service
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: "5xx,connect-failure"
```

If the overall `timeout` of 10s is reached before all retries complete, the request fails regardless of remaining retry attempts.

## Retries and Circuit Breakers

Retries can interact badly with circuit breakers if you're not careful. Each retry is an additional request, so a burst of retries can push you over your circuit breaker connection limits.

The `maxRetries` field in DestinationRule connection pool settings limits the total number of concurrent retries across all requests:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: catalog-service
  namespace: production
spec:
  host: catalog-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRetries: 10
```

This means at most 10 retries can be in-flight simultaneously. If more retries are attempted, they're rejected immediately.

## Monitoring Retries

Track retry metrics to understand if your retry configuration is helping or causing problems:

```bash
# Check retry stats from Envoy
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep retry
```

Key metrics:

- `envoy_cluster_upstream_rq_retry` - Total number of retries
- `envoy_cluster_upstream_rq_retry_success` - Retries that succeeded
- `envoy_cluster_upstream_rq_retry_overflow` - Retries rejected because the retry budget was exceeded

In Prometheus, you can query:

```promql
rate(envoy_cluster_upstream_rq_retry_success{cluster_name="outbound|80||catalog-service.production.svc.cluster.local"}[5m])
```

If `retry_success` is high, retries are doing their job - recovering from transient failures. If `retry_overflow` is high, you might need to increase your retry budget in the DestinationRule.

## Verifying Configuration

Confirm that your retry configuration is actually applied to the Envoy proxy:

```bash
istioctl proxy-config route <pod-name> -n <namespace> -o json | python3 -m json.tool
```

Search the output for `retryPolicy` to see the actual retry settings Envoy is using.

## Practical Advice

**Only retry idempotent operations.** Retrying a POST that creates a resource could create duplicates. GET, PUT, and DELETE are usually safe to retry.

**Keep retry counts low.** 2-3 retries is usually enough. More than that and you're probably dealing with a real outage, not a transient failure.

**Use per-try timeouts.** Without per-try timeouts, a single slow attempt could eat up your entire timeout budget, leaving no room for retries.

**Watch for retry amplification.** If service A retries 3 times to service B, and service B retries 3 times to service C, a single failure at C generates up to 16 requests. Keep the retry chain shallow.

Retries are powerful but need to be configured thoughtfully. The goal is to smooth over transient hiccups without making things worse during a real failure.
