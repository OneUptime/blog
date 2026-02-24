# How to Set Up Request Prioritization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Rate Limiting, Service Mesh, Kubernetes

Description: Learn how to implement request prioritization in Istio to ensure critical traffic gets served first using routing rules, rate limits, and connection pooling.

---

Not all requests are created equal. A health check from your load balancer is way less important than a payment processing call. An internal analytics event should not compete with a user-facing API response. When your services are under load, you want to make sure the important requests get through, even if that means lower-priority traffic has to wait or get rejected.

Istio does not have a built-in "priority" field you can set on requests. But you can achieve effective request prioritization through a combination of header-based routing, separate connection pools, rate limiting, and circuit breaking. The strategy is to classify traffic into priority tiers and apply different resource allocations and policies to each tier.

## Classification Strategy

The first step is deciding how to classify requests. Common approaches:

1. **Header-based**: Add a priority header (e.g., `x-priority: high`) at the API gateway or upstream service
2. **Path-based**: Different API paths map to different priorities (e.g., `/api/payments` is high priority)
3. **Source-based**: Requests from certain services are higher priority

Header-based classification is the most flexible. You add the header at the edge and use Istio routing rules to handle each priority tier differently.

## Setting Up Priority Headers at the Gateway

Configure your Istio Gateway and VirtualService to add priority headers based on the incoming path:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # High priority routes
  - match:
    - uri:
        prefix: /api/payments
    - uri:
        prefix: /api/auth
    headers:
      request:
        set:
          x-priority: "high"
    route:
    - destination:
        host: api-service
        subset: default
  # Medium priority routes
  - match:
    - uri:
        prefix: /api/users
    - uri:
        prefix: /api/orders
    headers:
      request:
        set:
          x-priority: "medium"
    route:
    - destination:
        host: api-service
        subset: default
  # Low priority (everything else)
  - headers:
      request:
        set:
          x-priority: "low"
    route:
    - destination:
        host: api-service
        subset: default
```

## Separate Connection Pools per Priority

The real power comes from using different DestinationRule settings for different priority levels. Create separate subsets with different connection pool and outlier detection settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-service
  namespace: production
spec:
  host: backend-service
  subsets:
  - name: high-priority
    labels:
      app: backend-service
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 200
        http:
          h2UpgradePolicy: DEFAULT
          http1MaxPendingRequests: 200
          http2MaxRequests: 200
      outlierDetection:
        consecutive5xxErrors: 10
        interval: 30s
        baseEjectionTime: 15s
  - name: medium-priority
    labels:
      app: backend-service
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          h2UpgradePolicy: DEFAULT
          http1MaxPendingRequests: 100
          http2MaxRequests: 100
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 30s
        baseEjectionTime: 30s
  - name: low-priority
    labels:
      app: backend-service
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
        http:
          h2UpgradePolicy: DEFAULT
          http1MaxPendingRequests: 30
          http2MaxRequests: 50
      outlierDetection:
        consecutive5xxErrors: 3
        interval: 30s
        baseEjectionTime: 60s
```

High priority gets more connections (200), a larger pending request queue (200), and is more tolerant of errors before circuit breaking kicks in. Low priority gets a tighter connection pool (50), a smaller queue (30), and circuit breaks faster. This means under load, low priority requests start getting rejected (503) while high priority requests still have room.

## Routing by Priority Header

Now route traffic to the correct subset based on the priority header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-service
  namespace: production
spec:
  hosts:
  - backend-service
  http:
  - match:
    - headers:
        x-priority:
          exact: "high"
    route:
    - destination:
        host: backend-service
        subset: high-priority
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
      retryOn: 5xx,reset,connect-failure
  - match:
    - headers:
        x-priority:
          exact: "medium"
    route:
    - destination:
        host: backend-service
        subset: medium-priority
    timeout: 15s
    retries:
      attempts: 2
      perTryTimeout: 7s
      retryOn: 5xx,reset,connect-failure
  - route:
    - destination:
        host: backend-service
        subset: low-priority
    timeout: 10s
    retries:
      attempts: 1
      perTryTimeout: 10s
```

Notice the different timeout and retry configurations. High priority gets longer timeouts and more retries. Low priority gets shorter timeouts and only one attempt. This gives critical requests the best chance of succeeding.

## Rate Limiting by Priority

For more explicit control, add rate limiting using Istio's local rate limiting via EnvoyFilter. This limits the requests per second for each priority tier:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: low-priority-rate-limit
  namespace: production
spec:
  workloadSelector:
    labels:
      app: backend-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 100
              tokens_per_fill: 100
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 100
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 100
                denominator: HUNDRED
            response_headers_to_add:
            - append_action: OVERWRITE_IF_EXISTS_OR_ADD
              header:
                key: x-rate-limited
                value: "true"
```

## Dedicated Pods for Priority Tiers

For maximum isolation, run separate pod pools for each priority level:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service-high
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend-service
      priority: high
  template:
    metadata:
      labels:
        app: backend-service
        priority: high
    spec:
      containers:
      - name: backend
        image: my-registry/backend:latest
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service-low
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-service
      priority: low
  template:
    metadata:
      labels:
        app: backend-service
        priority: low
    spec:
      containers:
      - name: backend
        image: my-registry/backend:latest
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

Then update your DestinationRule subsets to target these specific label sets.

## Monitoring Priority Traffic

Track how each priority tier is performing using Prometheus queries:

```bash
# Request rate by priority
sum(rate(istio_requests_total{destination_service="backend-service.production.svc.cluster.local"}[5m])) by (request_headers_x_priority)

# Error rate by priority
sum(rate(istio_requests_total{destination_service="backend-service.production.svc.cluster.local",response_code=~"5.*"}[5m])) by (request_headers_x_priority)
```

Note that custom request headers are not captured in Istio metrics by default. You need to configure Istio telemetry to include them. This is done through the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: production
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        request_priority:
          operation: UPSERT
          value: request.headers['x-priority']
```

## Summary

Request prioritization in Istio is built by layering several features together. Use header-based classification at the gateway level, separate connection pools through DestinationRule subsets, different timeout and retry policies through VirtualService routing, and optionally rate limiting through EnvoyFilter. For maximum isolation, deploy separate pod pools per priority tier. This setup ensures that when your system is under stress, the most important requests get the resources they need while less critical traffic gracefully degrades.
