# How to Configure Istio for CQRS Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CQRS, Architecture, Traffic Routing, Service Mesh, Kubernetes

Description: Configure Istio to support CQRS architecture by routing read and write operations to separate services with optimized traffic policies for each path.

---

CQRS stands for Command Query Responsibility Segregation. The idea is simple: separate your read operations (queries) from your write operations (commands) into different services, data models, or even different databases. Reads and writes have fundamentally different characteristics. Reads are typically high-volume, cacheable, and latency-sensitive. Writes are lower volume, need strong consistency, and can tolerate slightly higher latency.

Istio is a great tool for implementing CQRS at the infrastructure level. You can use VirtualService routing to split traffic by HTTP method, with GET requests going to read-optimized services and POST/PUT/DELETE requests going to write services. Each side gets its own traffic policies, timeouts, retries, and scaling configuration.

## The CQRS Architecture with Istio

The architecture looks like this:

- A single API endpoint that clients interact with
- Istio routes reads and writes to different backend services
- The read service is optimized for fast queries (read replicas, caching)
- The write service is optimized for consistency (primary database, validation)
- An event system synchronizes state between the two

## Setting Up the Services

Deploy separate read and write services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-query-service
  namespace: production
  labels:
    app: order-service
    role: query
spec:
  replicas: 5
  selector:
    matchLabels:
      app: order-service
      role: query
  template:
    metadata:
      labels:
        app: order-service
        role: query
    spec:
      containers:
      - name: query
        image: my-registry/order-query:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres-read-replica"
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-command-service
  namespace: production
  labels:
    app: order-service
    role: command
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
      role: command
  template:
    metadata:
      labels:
        app: order-service
        role: command
    spec:
      containers:
      - name: command
        image: my-registry/order-command:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres-primary"
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
```

The query service runs 5 replicas with lighter resources and connects to a read replica. The command service runs 2 replicas with heavier resources and connects to the primary database.

## Creating Kubernetes Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-query
  namespace: production
spec:
  selector:
    app: order-service
    role: query
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-command
  namespace: production
spec:
  selector:
    app: order-service
    role: command
  ports:
  - port: 80
    targetPort: 8080
```

## Routing Reads and Writes with VirtualService

The core of the CQRS setup - route by HTTP method:

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
  # Commands: POST, PUT, PATCH, DELETE go to command service
  - match:
    - method:
        exact: POST
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 15s
    retries:
      attempts: 0
  - match:
    - method:
        exact: PUT
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 15s
    retries:
      attempts: 0
  - match:
    - method:
        exact: PATCH
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 15s
    retries:
      attempts: 0
  - match:
    - method:
        exact: DELETE
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 15s
    retries:
      attempts: 0
  # Queries: GET requests go to query service
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: order-query
        port:
          number: 80
    timeout: 3s
    retries:
      attempts: 2
      perTryTimeout: 1s
      retryOn: 5xx,reset,connect-failure
```

Notice the different traffic policies:

- Commands get longer timeouts (15s) and zero retries (because retrying a write could cause duplicates)
- Queries get short timeouts (3s) and retries (reads are idempotent and safe to retry)

## Different DestinationRules for Read and Write

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-query
  namespace: production
spec:
  host: order-query
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 15s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-command
  namespace: production
spec:
  host: order-command
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

The query service gets much larger connection pools because it handles high-volume read traffic. The command service gets smaller pools with stricter circuit breaking because writes are more sensitive.

## Exposing Through the Gateway

If this is an external-facing API, route through the Istio gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-api
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  # Write operations
  - match:
    - uri:
        prefix: /api/orders
      method:
        regex: "POST|PUT|PATCH|DELETE"
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 15s
  # Read operations
  - match:
    - uri:
        prefix: /api/orders
      method:
        exact: GET
    route:
    - destination:
        host: order-query
        port:
          number: 80
    timeout: 3s
    retries:
      attempts: 2
      perTryTimeout: 1s
```

## Handling Eventual Consistency

The biggest challenge with CQRS is eventual consistency. After a write, the read model might not be updated yet. A user creates an order (hits the command service) and immediately views their orders (hits the query service), but the new order might not show up because the event has not been processed yet.

You can handle this at the routing level by sending specific read-after-write requests to the command service:

```yaml
  http:
  # Reads with "prefer-consistent" header go to command service
  - match:
    - method:
        exact: GET
      headers:
        x-consistency:
          exact: "strong"
    route:
    - destination:
        host: order-command
        port:
          number: 80
    timeout: 10s
  # Normal reads go to query service
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: order-query
        port:
          number: 80
```

The client can request strong consistency when needed by adding the `x-consistency: strong` header. Most reads go to the fast query service, but critical reads can go to the command service which has the most up-to-date data.

## Rate Limiting Writes

Protect the write service with stricter rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: command-rate-limit
  namespace: production
spec:
  workloadSelector:
    labels:
      app: order-service
      role: command
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: command_rate_limiter
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 50
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
            status:
              code: TooManyRequests
```

This limits each command service pod to 50 writes per minute. The query service can handle much higher volumes without rate limiting.

## Monitoring the Split

Track reads versus writes separately:

```text
# Read request rate
sum(rate(istio_requests_total{destination_service="order-query.production.svc.cluster.local"}[5m]))

# Write request rate
sum(rate(istio_requests_total{destination_service="order-command.production.svc.cluster.local"}[5m]))

# Read latency (P99)
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="order-query.production.svc.cluster.local"}[5m])) by (le))

# Write latency (P99)
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="order-command.production.svc.cluster.local"}[5m])) by (le))
```

## Scaling Independently

One of the main benefits of CQRS is independent scaling. If reads spike (Black Friday browsing), scale the query service without touching the command service:

```bash
kubectl scale deployment order-query-service --replicas=20 -n production
```

If writes spike (order rush), scale the command service:

```bash
kubectl scale deployment order-command-service --replicas=10 -n production
```

You can also configure Horizontal Pod Autoscalers with different thresholds for each:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-query-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-query-service
  minReplicas: 5
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

## Summary

Istio enables CQRS at the infrastructure level by routing read and write traffic to separate services based on HTTP method. Configure different traffic policies for each path: reads get fast timeouts and retries, writes get longer timeouts and no retries. Use separate DestinationRules for different connection pool sizes and circuit breaking thresholds. Handle eventual consistency through a consistency header that routes specific reads to the write service. Rate limit writes to protect the command service, and scale each side independently based on its own load patterns.
