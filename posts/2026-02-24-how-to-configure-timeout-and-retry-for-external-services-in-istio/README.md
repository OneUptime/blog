# How to Configure Timeout and Retry for External Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Timeout, Retry, VirtualService, External Services, Service Mesh

Description: Configure timeouts and retry policies for external services in Istio using VirtualService to improve resilience without changing application code.

---

External services fail. They time out, return errors, and occasionally just drop connections. Your application should handle these failures gracefully, but implementing retry logic and timeout management in every microservice is tedious and error-prone. Istio lets you configure timeouts and retries at the mesh level using VirtualService resources, so every call to an external service gets automatic resilience.

The beauty of this approach is that your application code stays simple. It makes a call, and if it fails, Istio handles the retry transparently. If the external service is too slow, Istio cuts the connection at the timeout boundary instead of letting your pod hang.

## Setting Up Timeouts

Timeouts prevent your application from waiting forever when an external service is slow. Without them, a slow external API can cascade into your entire system as threads and connections pile up.

First, make sure you have a ServiceEntry for the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: slow-api
spec:
  hosts:
    - api.slow-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Then create a VirtualService with a timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slow-api-timeout
spec:
  hosts:
    - api.slow-service.com
  http:
    - timeout: 5s
      route:
        - destination:
            host: api.slow-service.com
            port:
              number: 443
```

Now if `api.slow-service.com` takes more than 5 seconds to respond, Envoy terminates the connection and returns a 504 Gateway Timeout to your application.

## Setting Up Retries

Retries automatically resend failed requests. This handles transient failures like temporary network blips or brief server overloads:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-retry-policy
spec:
  hosts:
    - api.example.com
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,retriable-4xx
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

Breaking down the retry configuration:

- **attempts: 3** - Retry up to 3 times (so 4 total attempts including the original)
- **perTryTimeout: 2s** - Each individual attempt gets 2 seconds before timing out
- **retryOn** - Which conditions trigger a retry

## Retry Conditions

The `retryOn` field accepts several conditions:

| Condition | Description |
|-----------|-------------|
| `5xx` | Retry on any 5xx response code |
| `gateway-error` | Retry on 502, 503, or 504 |
| `reset` | Retry when the connection is reset |
| `connect-failure` | Retry when the connection fails |
| `retriable-4xx` | Retry on 409 (conflict) responses |
| `refused-stream` | Retry when the stream is refused (HTTP/2) |
| `unavailable` | Retry on gRPC UNAVAILABLE status |
| `cancelled` | Retry on gRPC CANCELLED status |
| `resource-exhausted` | Retry on gRPC RESOURCE_EXHAUSTED |

You can combine multiple conditions with commas:

```yaml
retryOn: 5xx,reset,connect-failure,refused-stream
```

For most external APIs, a good default is:

```yaml
retryOn: 5xx,reset,connect-failure
```

This handles server errors, connection resets, and connection failures without retrying on client errors (4xx), which usually indicate a problem with the request itself.

## Combining Timeout and Retry

Here is where it gets interesting. The overall timeout and per-try timeout interact:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: combined-timeout-retry
spec:
  hosts:
    - api.payment-gateway.com
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: api.payment-gateway.com
            port:
              number: 443
```

With this configuration:
- Each attempt has a 3-second timeout
- Up to 3 retries (4 total attempts)
- The overall timeout is 10 seconds

The overall `timeout` is a hard limit. Even if you have retries remaining, once 10 seconds have passed since the original request, everything stops. So if the first 3 attempts each take 3 seconds (9 seconds total), the fourth attempt only gets 1 second before the overall timeout hits.

A good rule of thumb: set `timeout` to be at least `perTryTimeout * (attempts + 1)` to give all retries a fair chance. In this case, `3s * 4 = 12s` would be ideal.

## Per-Route Timeouts and Retries

Different endpoints on the same external service might need different settings. Use route matching:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: per-route-policy
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /slow-endpoint
      timeout: 30s
      retries:
        attempts: 2
        perTryTimeout: 10s
        retryOn: 5xx
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
    - match:
        - uri:
            prefix: /fast-endpoint
      timeout: 3s
      retries:
        attempts: 5
        perTryTimeout: 500ms
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
    - timeout: 5s
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

The slow endpoint gets a generous 30-second timeout with fewer retries. The fast endpoint gets an aggressive 3-second timeout with more retries. Everything else gets the default 5-second timeout.

## Retry Backoff

Istio supports configuring retry backoff to add delays between retries. This prevents hammering a struggling external service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: retry-with-backoff
spec:
  hosts:
    - api.example.com
  http:
    - retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: 5xx,connect-failure
        retryRemoteLocalities: true
      route:
        - destination:
            host: api.example.com
            port:
              number: 443
```

Envoy adds automatic jittered backoff between retries by default. The base interval is 25ms and doubles with each retry, up to a maximum of 250ms. This is built into Envoy and you do not need to configure it explicitly.

## Timeout for TCP Services

For TCP services (databases, message queues), timeouts work differently. Use DestinationRule instead of VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: db-timeout
spec:
  host: database.external.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
        idleTimeout: 3600s
```

The `connectTimeout` is how long to wait for the TCP connection to establish. The `idleTimeout` is how long an idle connection stays alive before being closed.

## Disabling Timeouts for Long-Running Requests

Some external APIs have long-running operations (file uploads, data exports, report generation). You can disable the timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: no-timeout
spec:
  hosts:
    - api.data-export.com
  http:
    - match:
        - uri:
            prefix: /export
      timeout: 0s
      route:
        - destination:
            host: api.data-export.com
            port:
              number: 443
```

Setting `timeout: 0s` disables the timeout entirely. Use this sparingly and only for endpoints that genuinely need it.

## Monitoring Timeout and Retry Behavior

Check if your timeouts and retries are firing:

```bash
# Look for 504 (timeout) responses
istio_requests_total{
  destination_service="api.slow-service.com",
  response_code="504"
}

# Look at retry attempts
envoy_cluster_upstream_rq_retry{
  cluster_name="outbound|443||api.example.com"
}

# Retry successes (retry worked)
envoy_cluster_upstream_rq_retry_success{
  cluster_name="outbound|443||api.example.com"
}
```

If you see a lot of 504s, your timeouts might be too aggressive. If retries are high but retry successes are low, the external service might have a persistent problem that retries cannot fix.

## Best Practices

**Start with conservative timeouts and tighten over time.** Set timeouts based on the external service's P99 latency plus some buffer. You can find the P99 by looking at `istio_request_duration_milliseconds_bucket` metrics.

**Do not retry non-idempotent requests.** If the external API charges money or creates resources, retrying a timed-out request might double-charge or create duplicates. Use `retryOn` carefully and consider only retrying on `connect-failure` for non-idempotent endpoints.

**Set both timeout and perTryTimeout.** Without an overall timeout, retries can keep going indefinitely. Without perTryTimeout, each retry waits for the full timeout before giving up.

**Monitor and tune.** Timeouts and retries are not set-and-forget configurations. External services change their performance characteristics over time. Review your metrics regularly and adjust settings based on what you see.
