# How to Use Layer 7 Features in Istio Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Layer 7, Traffic Management, Waypoint

Description: A hands-on guide to using Layer 7 features like HTTP routing, retries, rate limiting, and header-based policies in Istio ambient mode with waypoint proxies.

---

Istio ambient mode splits mesh functionality into two layers. The L4 layer (ztunnel) gives you mTLS and TCP-level policies out of the box. But when you need HTTP-aware features - routing based on paths, manipulating headers, applying retries, or writing policies that match on HTTP methods - you need the L7 layer, which is provided by waypoint proxies.

This guide covers the major L7 features available through waypoint proxies in ambient mode.

## Setting Up L7: Deploy a Waypoint

Before you can use any L7 feature, you need a waypoint proxy. Deploy one for your namespace:

```bash
istioctl waypoint apply -n bookinfo --enroll-namespace
```

Verify it is running:

```bash
kubectl get gateway -n bookinfo
```

```text
NAME                CLASS            ADDRESS       PROGRAMMED   AGE
bookinfo-waypoint   istio-waypoint   10.96.10.50   True         1m
```

Now all L7 features are available for services in the `bookinfo` namespace.

## HTTP Request Routing

Route traffic based on HTTP attributes like path, headers, or URI:

### Path-Based Routing

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-path-routing
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - match:
        - uri:
            prefix: /reviews/v2
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
```

### Header-Based Routing

Route based on custom headers - great for canary deployments or A/B testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-header-routing
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: reviews
            subset: v3
    - route:
        - destination:
            host: reviews
            subset: v1
```

Requests with the header `x-canary: true` go to v3, everything else goes to v1.

### Weighted Routing (Traffic Splitting)

Gradually shift traffic between versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-weighted
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 80
        - destination:
            host: reviews
            subset: v2
          weight: 20
```

80% of traffic goes to v1, 20% to v2. Adjust the weights over time for a gradual rollout.

## Retries and Timeouts

Configure automatic retries for failed requests:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-retries
  namespace: bookinfo
spec:
  hosts:
    - ratings
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: "5xx,reset,connect-failure,retriable-4xx"
      route:
        - destination:
            host: ratings
```

The `retryOn` field accepts a comma-separated list of conditions:
- `5xx`: Retry on any 5xx response
- `reset`: Retry on connection reset
- `connect-failure`: Retry on connection failure
- `retriable-4xx`: Retry on 409 responses

## Request and Response Header Manipulation

Add, remove, or modify headers as requests pass through the waypoint:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: productpage-headers
  namespace: bookinfo
spec:
  hosts:
    - productpage
  http:
    - headers:
        request:
          set:
            x-request-id: "%REQ(X-REQUEST-ID)%"
            x-forwarded-by: "istio-waypoint"
          remove:
            - x-internal-debug
        response:
          set:
            x-served-by: "bookinfo-v1"
            strict-transport-security: "max-age=31536000"
      route:
        - destination:
            host: productpage
```

## Fault Injection

Test your application's resilience by injecting delays and errors:

### Delay Injection

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
  namespace: bookinfo
spec:
  hosts:
    - ratings
  http:
    - fault:
        delay:
          percentage:
            value: 25
          fixedDelay: 5s
      route:
        - destination:
            host: ratings
```

25% of requests to the ratings service will experience a 5-second delay. This is useful for testing timeout handling in upstream services.

### Error Injection

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: bookinfo
spec:
  hosts:
    - ratings
  http:
    - fault:
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: ratings
```

10% of requests return a 503 immediately without reaching the service. This helps test circuit breaker and retry behavior.

## HTTP Authorization Policies

With a waypoint proxy, you can write much more granular authorization policies:

### Method-Based Authorization

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: reviews-methods
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-productpage"
      to:
        - operation:
            methods: ["GET"]
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/admin"
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
```

The productpage can only GET from reviews, but the admin service has full CRUD access.

### Path-Based Authorization

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ratings-paths
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: ratings
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET"]
            paths: ["/ratings/*", "/health"]
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/admin"
      to:
        - operation:
            paths: ["/admin/*"]
```

Everyone can GET ratings and health endpoints. Only the admin service can access admin endpoints.

## Traffic Mirroring

Mirror traffic to a test version for shadow testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-mirror
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
      mirror:
        host: reviews
        subset: v2
      mirrorPercentage:
        value: 100
```

All traffic goes to v1 (and responses come from v1), but a copy of each request is also sent to v2. This lets you test v2 with real production traffic without affecting users.

## CORS Policy

Configure Cross-Origin Resource Sharing through the waypoint:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: productpage-cors
  namespace: bookinfo
spec:
  hosts:
    - productpage
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://example.com"
          - prefix: "https://*.example.com"
        allowMethods:
          - GET
          - POST
        allowHeaders:
          - authorization
          - content-type
        maxAge: "24h"
      route:
        - destination:
            host: productpage
```

## L7 Telemetry

With a waypoint proxy, you get HTTP-level metrics that ztunnel alone cannot provide:

- `istio_requests_total`: Total requests with labels for response code, method, path
- `istio_request_duration_milliseconds`: Request latency histogram
- `istio_request_bytes`: Request body size
- `istio_response_bytes`: Response body size

Query these in Prometheus:

```promql
# Request rate by response code
sum(rate(istio_requests_total{destination_service="reviews.bookinfo.svc.cluster.local"}[5m])) by (response_code)

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="reviews.bookinfo.svc.cluster.local"}[5m])) by (le))
```

These metrics are only available for traffic that flows through a waypoint proxy. Traffic handled by ztunnel alone reports TCP-level metrics only.

## Choosing What Needs L7

Not every service needs L7 features. A practical approach:

- Use ztunnel (L4 only) for: databases, caches, message queues, internal batch services
- Use waypoint proxies (L7) for: API gateways, public-facing services, services that need HTTP routing or method-based auth

You can have multiple waypoints in a namespace, each attached to different services. This gives you precise control over where L7 processing happens and keeps the overhead minimal.
