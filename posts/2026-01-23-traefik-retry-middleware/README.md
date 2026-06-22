# How to Implement Retry Middleware in Traefik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traefik, Retry, Resilience, Middleware, Fault Tolerance

Description: Configure retry middleware in Traefik to automatically retry failed requests, handling transient failures and improving application reliability.

---

Network requests fail. Servers restart, connections drop, and temporary overload causes timeouts. Instead of surfacing every transient failure to users, Traefik's retry middleware can automatically retry failed requests, often succeeding on subsequent attempts.

This guide covers configuring retry logic in Traefik, from basic setup to advanced patterns that prevent retry storms and handle different failure scenarios appropriately.

## When to Use Retries

Retries work best for:

- **Transient network failures**: Brief connectivity issues that resolve quickly
- **Server restarts**: Pod replacements during deployments
- **Temporary overload**: Backend briefly unable to accept connections
- **Connection resets**: TCP connections dropped unexpectedly

Retries are not appropriate for:

- **Client errors (4xx)**: Bad requests will not succeed on retry
- **Business logic failures**: Application rejections should not be retried
- **Idempotency issues**: POST requests that create duplicates

## Basic Retry Configuration

Create a retry middleware:

```yaml
# retry-middleware.yaml

apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry
  namespace: default
spec:
  retry:
    # Maximum number of retry attempts
    attempts: 3
    # Initial wait time between retries
    initialInterval: 100ms
    # Retry on upstream server errors
    status:
      - "500-599"
```

Apply it to a route:

```yaml
# retry-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      middlewares:
        - name: retry
      services:
        - name: api-service
          port: 8080
  tls: {}
```

## Understanding Retry Behavior

Traefik retries requests when:

- Network errors occur (connection refused, reset, timeout)
- Backend returns configured status codes, such as 5xx responses

Traefik does NOT retry when:

- Backend returns successful response (2xx)
- Backend returns client error (4xx)
- Backend returns a response status that is not listed in the retry configuration
- A non-idempotent method such as POST, PATCH, or LOCK is used without enabling `retryNonIdempotentMethod`

```mermaid
sequenceDiagram
    participant C as Client
    participant T as Traefik
    participant B as Backend

    C->>T: Request
    T->>B: Forward request
    B-->>T: 503 Service Unavailable
    Note over T: Attempt 1 failed, retry
    T->>B: Retry request
    B-->>T: 503 Service Unavailable
    Note over T: Attempt 2 failed, retry
    T->>B: Retry request
    B-->>T: 200 OK
    T-->>C: 200 OK
```

## Configuring Retry Intervals

Control the timing between retries:

```yaml
# retry-intervals.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-with-backoff
  namespace: default
spec:
  retry:
    attempts: 4
    # Initial interval between retries
    initialInterval: 100ms
    status:
      - "500-599"
```

When `initialInterval` is set, retries use exponential backoff. The maximum interval is calculated as twice the `initialInterval` value:
- First retry: wait ~100ms
- Later retries: increase up to ~200ms

## Limiting Total Retry Duration

Prevent retries from taking too long:

```yaml
# retry-with-timeout.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: bounded-retry
  namespace: default
spec:
  retry:
    attempts: 5
    initialInterval: 200ms
    # Total time allowed for retrying this request
    timeout: 2s
    status:
      - "500-599"
```

Use the retry `timeout` option to cap the time Traefik is allowed to spend retrying the request:

```yaml
# bounded-retry-route.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      middlewares:
        - name: bounded-retry
      services:
        - name: api-service
          port: 8080
  tls: {}
```

## Safe Retries for Idempotent Operations

Only retry operations that are safe to repeat:

```yaml
# idempotent-routes.yaml
# GET requests are safe to retry
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-reads
  namespace: default
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
    status:
      - "500-599"
---
# No retry for POST/PUT operations (might cause duplicates)
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    # Read operations with retry
    - match: Host(`api.example.com`) && Method(`GET`, `HEAD`, `OPTIONS`)
      kind: Rule
      middlewares:
        - name: retry-reads
      services:
        - name: api-service
          port: 8080

    # Write operations without retry
    - match: Host(`api.example.com`) && Method(`POST`, `PUT`, `DELETE`, `PATCH`)
      kind: Rule
      # No retry middleware
      services:
        - name: api-service
          port: 8080
  tls: {}
```

## Retry with Circuit Breaker

Combine retries with circuit breaker to prevent retry storms:

```yaml
# retry-with-breaker.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry
  namespace: default
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
    status:
      - "500-599"
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: circuit-breaker
  namespace: default
spec:
  circuitBreaker:
    expression: NetworkErrorRatio() > 0.50
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: resilient-api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      middlewares:
        # Order: retry handles individual failures
        # Circuit breaker prevents hammering failing service
        - name: retry
        - name: circuit-breaker
      services:
        - name: api-service
          port: 8080
  tls: {}
```

Flow with both middlewares:

```mermaid
flowchart TB
    R[Request] --> Retry{Retry Middleware}
    Retry -->|Attempt| CB{Circuit Breaker}
    CB -->|Closed| Backend[Backend Service]
    CB -->|Open| Fail503[503 Immediately]

    Backend -->|Success| Success[200 OK]
    Backend -->|Failure| Retry
    Retry -->|Max Attempts| Fail[Return Last Error]
```

## Different Retry Policies per Service

Apply different retry strategies based on service criticality:

```yaml
# tiered-retries.yaml
# Critical service: aggressive retries
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-critical
  namespace: default
spec:
  retry:
    attempts: 5
    initialInterval: 50ms
    timeout: 1s
    status:
      - "500-599"
---
# Standard service: moderate retries
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-standard
  namespace: default
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
    timeout: 1s
    status:
      - "500-599"
---
# Non-critical service: minimal retries
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-minimal
  namespace: default
spec:
  retry:
    attempts: 2
    initialInterval: 200ms
    timeout: 1s
    status:
      - "500-599"
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: services
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`) && PathPrefix(`/payments`)
      kind: Rule
      middlewares:
        - name: retry-critical
      services:
        - name: payment-service
          port: 8080

    - match: Host(`api.example.com`) && PathPrefix(`/users`)
      kind: Rule
      middlewares:
        - name: retry-standard
      services:
        - name: user-service
          port: 8080

    - match: Host(`api.example.com`) && PathPrefix(`/analytics`)
      kind: Rule
      middlewares:
        - name: retry-minimal
      services:
        - name: analytics-service
          port: 8080
  tls: {}
```

## Monitoring Retry Behavior

Track retries through Traefik metrics:

```yaml
# Enable metrics in Traefik
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    metrics:
      prometheus:
        addEntryPointsLabels: true
        addServicesLabels: true
        addRoutersLabels: true
```

Query retry-related metrics:

```promql
# Total requests with retries
sum(rate(traefik_service_retries_total[5m])) by (service)

# Retry ratio - fraction of requests that needed retries
sum(rate(traefik_service_retries_total[5m])) by (service)
/
sum(rate(traefik_service_requests_total[5m])) by (service)

# High retry rate alert
sum(rate(traefik_service_retries_total[5m])) by (service)
/
sum(rate(traefik_service_requests_total[5m])) by (service)
> 0.1
```

## Testing Retry Configuration

Verify retries work as expected:

```bash
# Deploy a service that fails intermittently
kubectl run flaky-app --image=kennethreitz/httpbin --port=80

# Inject failures using httpbin endpoints
# /status/503 returns 503 Service Unavailable

# Test with retries enabled
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
    https://api.example.com/status/503
done

# /status/503 always returns 503, so retries should still end with 503.
# Use metrics to confirm retry attempts, or test against a backend
# that fails intermittently to observe eventual success.
```

Check Traefik logs for retry activity:

```bash
kubectl logs -n traefik deployment/traefik | grep -i retry
```

## Avoiding Retry Storms

When multiple clients retry simultaneously, it can overwhelm a recovering service. Mitigate this:

```yaml
# jitter-and-limits.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: safe-retry
  namespace: default
spec:
  retry:
    # Fewer attempts to reduce amplification
    attempts: 2
    # Longer initial interval to spread retries
    initialInterval: 500ms
    timeout: 2s
    status:
      - "500-599"
```

Additional strategies:

1. **Use circuit breakers**: Stop retries when service is clearly down
2. **Add jitter at clients or callers**: Traefik retry exposes interval and timeout controls, but not a jitter option
3. **Limit concurrent requests**: Use rate limiting before retry
4. **Set reasonable timeouts**: Fast timeouts prevent pile-up

## Retry Headers for Debugging

Add headers to identify routes where retry is enabled:

```yaml
# retry-headers.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry-with-headers
  namespace: default
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
    status:
      - "500-599"
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: add-retry-route-header
  namespace: default
spec:
  headers:
    customRequestHeaders:
      X-Retry-Enabled: "true"
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`)
      kind: Rule
      middlewares:
        - name: retry-with-headers
        - name: add-retry-route-header
      services:
        - name: api-service
          port: 8080
  tls: {}
```

Your backend can log this header to identify requests that passed through a retry-enabled route. Use Traefik metrics to count actual retry attempts.

## Best Practices

1. **Start conservative**: Begin with 2-3 attempts and adjust based on data
2. **Use exponential backoff**: Set `initialInterval` to spread out retries
3. **Combine with circuit breaker**: Prevents retry storms to failing services
4. **Separate read and write operations**: Only retry idempotent operations
5. **Monitor retry rates**: High retry rates indicate underlying issues
6. **Set timeouts**: Prevent retries from extending request duration indefinitely
7. **Test failure scenarios**: Verify retry behavior before production

---

Retry middleware adds significant resilience to your services with minimal configuration. Transient failures become invisible to users, and your system handles temporary disruptions gracefully. Combined with circuit breakers and proper monitoring, retries make your architecture robust against the realities of distributed systems.
