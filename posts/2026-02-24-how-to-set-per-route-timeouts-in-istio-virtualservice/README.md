# How to Set Per-Route Timeouts in Istio VirtualService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Timeouts, VirtualService, Traffic Management, Kubernetes

Description: Learn how to configure different timeout values for different routes in an Istio VirtualService to match the performance characteristics of each endpoint.

---

Not every endpoint in your service has the same performance profile. A search API should respond in milliseconds. A report generation endpoint might take 30 seconds. A file upload could take minutes. Using a single timeout value for all of them means either your fast endpoints don't time out soon enough, or your slow endpoints time out too early.

Istio VirtualService supports per-route timeouts, letting you set appropriate timeout values for each endpoint based on its actual behavior. This post covers how to configure per-route timeouts, strategies for choosing the right values, and common patterns.

## Per-Route Timeout Configuration

Each HTTP route in a VirtualService can have its own timeout. Routes are matched in order, so you put the most specific routes first:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: analytics-service
  namespace: production
spec:
  hosts:
    - analytics-service
  http:
    # Fast endpoint - search should respond quickly
    - match:
        - uri:
            prefix: /api/search
      timeout: 2s
      route:
        - destination:
            host: analytics-service
    # Slow endpoint - report generation takes time
    - match:
        - uri:
            prefix: /api/reports/generate
      timeout: 60s
      route:
        - destination:
            host: analytics-service
    # Medium endpoint - data queries
    - match:
        - uri:
            prefix: /api/data
      timeout: 10s
      route:
        - destination:
            host: analytics-service
    # Default for everything else
    - timeout: 5s
      route:
        - destination:
            host: analytics-service
```

When a request comes in, Istio evaluates the match conditions from top to bottom and applies the timeout from the first matching route.

## Matching Strategies for Per-Route Timeouts

### By URI Prefix

The most common approach. Group endpoints by their path prefix:

```yaml
http:
  - match:
      - uri:
          prefix: /api/v1/fast
    timeout: 1s
    route:
      - destination:
          host: my-service
  - match:
      - uri:
          prefix: /api/v1/slow
    timeout: 30s
    route:
      - destination:
          host: my-service
```

### By Exact URI

For specific endpoints that need special treatment:

```yaml
http:
  - match:
      - uri:
          exact: /api/v1/healthcheck
    timeout: 1s
    route:
      - destination:
          host: my-service
  - match:
      - uri:
          exact: /api/v1/bulk-import
    timeout: 120s
    route:
      - destination:
          host: my-service
```

### By HTTP Method

Different methods on the same path can have different timeouts:

```yaml
http:
  # GET requests should be fast
  - match:
      - method:
          exact: GET
        uri:
          prefix: /api/orders
    timeout: 3s
    route:
      - destination:
          host: order-service
  # POST (create order) might take longer
  - match:
      - method:
          exact: POST
        uri:
          prefix: /api/orders
    timeout: 10s
    route:
      - destination:
          host: order-service
```

### By Headers

Use custom headers to select timeout behavior:

```yaml
http:
  - match:
      - headers:
          x-request-type:
            exact: "batch"
    timeout: 120s
    route:
      - destination:
          host: processing-service
  - match:
      - headers:
          x-request-type:
            exact: "realtime"
    timeout: 2s
    route:
      - destination:
          host: processing-service
  - timeout: 10s
    route:
      - destination:
          host: processing-service
```

## Per-Route Timeouts with Retries

When combining per-route timeouts with retries, each route can have its own retry configuration:

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
    # Fast read operations - aggressive retries, tight timeout
    - match:
        - uri:
            prefix: /api/orders/
          method:
            exact: GET
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 1500ms
        retryOn: 5xx,reset
      route:
        - destination:
            host: order-service
    # Write operations - fewer retries, longer timeout
    - match:
        - uri:
            prefix: /api/orders
          method:
            exact: POST
      timeout: 15s
      retries:
        attempts: 1
        perTryTimeout: 10s
        retryOn: gateway-error,connect-failure
      route:
        - destination:
            host: order-service
```

Read operations get aggressive retries with a tight per-try timeout. Write operations are more careful - only one retry and only on connection failures, to avoid duplicate writes.

## Per-Route Timeouts for Different Backends

When routing to different subsets or versions, each can have its own timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
  namespace: production
spec:
  hosts:
    - api-service
  http:
    # v2 has optimized queries - shorter timeout
    - match:
        - headers:
            x-api-version:
              exact: "v2"
      timeout: 2s
      route:
        - destination:
            host: api-service
            subset: v2
    # v1 is slower - longer timeout
    - timeout: 8s
      route:
        - destination:
            host: api-service
            subset: v1
```

## Practical Example: E-Commerce Service

Here's a real-world example for an e-commerce API with many different endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ecommerce-api
  namespace: production
spec:
  hosts:
    - ecommerce-api
  http:
    # Health checks - should be instant
    - match:
        - uri:
            exact: /health
      timeout: 1s
      route:
        - destination:
            host: ecommerce-api

    # Product search - users expect speed
    - match:
        - uri:
            prefix: /api/products/search
      timeout: 2s
      retries:
        attempts: 2
        perTryTimeout: 800ms
        retryOn: 5xx
      route:
        - destination:
            host: ecommerce-api

    # Product detail - fast reads
    - match:
        - uri:
            regex: /api/products/[^/]+$
          method:
            exact: GET
      timeout: 3s
      route:
        - destination:
            host: ecommerce-api

    # Cart operations - moderate speed
    - match:
        - uri:
            prefix: /api/cart
      timeout: 5s
      route:
        - destination:
            host: ecommerce-api

    # Checkout - the most critical path, needs time
    - match:
        - uri:
            prefix: /api/checkout
      timeout: 15s
      retries:
        attempts: 1
        perTryTimeout: 10s
        retryOn: gateway-error
      route:
        - destination:
            host: ecommerce-api

    # Admin operations - can be slow
    - match:
        - uri:
            prefix: /admin
      timeout: 30s
      route:
        - destination:
            host: ecommerce-api

    # Data export - very slow
    - match:
        - uri:
            prefix: /api/export
      timeout: 120s
      route:
        - destination:
            host: ecommerce-api

    # Default
    - timeout: 5s
      route:
        - destination:
            host: ecommerce-api
```

## Verifying Per-Route Timeouts

Check that the correct timeout is applied to each route:

```bash
# View the routes configured in the proxy
istioctl proxy-config routes deploy/frontend -n production -o json | jq '.[] | .virtualHosts[].routes[] | {name: .match.prefix, timeout: .route.timeout}'
```

Test with fault injection to confirm timeouts fire correctly:

```bash
# Test the search timeout (2s)
# Inject a 5s delay
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ecommerce-api
  namespace: production
spec:
  hosts:
    - ecommerce-api
  http:
    - match:
        - uri:
            prefix: /api/products/search
      fault:
        delay:
          fixedDelay: 5s
          percentage:
            value: 100.0
      timeout: 2s
      route:
        - destination:
            host: ecommerce-api
    - timeout: 5s
      route:
        - destination:
            host: ecommerce-api
EOF

# Should get 504 in ~2 seconds
time kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "%{http_code}" http://ecommerce-api:8080/api/products/search?q=laptop
```

## Route Order Matters

VirtualService routes are evaluated in order. The first match wins. If you put a catch-all route before a specific route, the specific route never gets hit:

```yaml
# WRONG - the catch-all matches everything first
http:
  - timeout: 5s
    route:
      - destination:
          host: my-service
  - match:
      - uri:
          prefix: /api/slow
    timeout: 30s
    route:
      - destination:
          host: my-service
```

```yaml
# CORRECT - specific routes first, catch-all last
http:
  - match:
      - uri:
          prefix: /api/slow
    timeout: 30s
    route:
      - destination:
          host: my-service
  - timeout: 5s
    route:
      - destination:
          host: my-service
```

Always put your most specific routes first and the default/catch-all route last.

## Updating Timeouts Without Downtime

VirtualService changes take effect within a few seconds without restarting any pods. You can update timeouts on the fly:

```bash
# Update the timeout for the export endpoint
kubectl patch virtualservice ecommerce-api -n production --type='json' \
  -p='[{"op": "replace", "path": "/spec/http/6/timeout", "value": "180s"}]'
```

Or apply an updated YAML file:

```bash
kubectl apply -f ecommerce-api-vs.yaml
```

The changes propagate to all sidecar proxies automatically.

Per-route timeouts give you the granularity to match your timeout configuration to your application's actual behavior. Fast endpoints get tight timeouts that catch problems quickly. Slow endpoints get generous timeouts that don't trigger unnecessarily. Combined with retries and circuit breakers, per-route timeouts form a solid resilience foundation.
