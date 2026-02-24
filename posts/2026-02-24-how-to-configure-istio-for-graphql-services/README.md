# How to Configure Istio for GraphQL Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GraphQL, Kubernetes, Service Mesh, API Gateway

Description: How to configure Istio service mesh for GraphQL APIs with proper routing, timeout settings, and observability for GraphQL-specific traffic patterns.

---

GraphQL services have some unique characteristics that require special attention when running behind Istio. Unlike REST APIs where each endpoint maps to a path, GraphQL typically uses a single endpoint for all queries and mutations. This means path-based routing is less useful, and you need different strategies for traffic management, rate limiting, and observability.

This guide covers practical Istio configurations for running GraphQL services effectively in a service mesh.

## Why GraphQL Needs Special Istio Configuration

With REST, Istio can route traffic based on URL paths, and you can set different timeouts for different endpoints. GraphQL breaks this pattern because everything goes to `/graphql` (or a similar single endpoint). A simple query might return in 5 milliseconds while a complex nested query could take 10 seconds. Istio does not understand GraphQL query semantics by default, so you need to work around this limitation.

Also, GraphQL subscriptions use WebSocket connections, which need specific Istio configuration to work properly.

## Basic GraphQL Service Setup

```bash
kubectl create namespace graphql-services
kubectl label namespace graphql-services istio-injection=enabled
```

Deploy a GraphQL service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-api
  namespace: graphql-services
  labels:
    app: graphql-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-api
  template:
    metadata:
      labels:
        app: graphql-api
    spec:
      containers:
      - name: graphql-api
        image: myregistry/graphql-api:1.0
        ports:
        - containerPort: 4000
          name: http-graphql
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: graphql-api
  namespace: graphql-services
spec:
  selector:
    app: graphql-api
  ports:
  - name: http-graphql
    port: 4000
    targetPort: 4000
```

## VirtualService Configuration for GraphQL

Since all GraphQL traffic hits a single endpoint, set timeouts that accommodate your slowest expected queries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graphql-api-vs
  namespace: graphql-services
spec:
  hosts:
  - graphql-api
  http:
  - match:
    - uri:
        exact: /graphql
    route:
    - destination:
        host: graphql-api
        port:
          number: 4000
    timeout: 30s
    retries:
      attempts: 2
      perTryTimeout: 15s
      retryOn: 5xx,reset,connect-failure
  - match:
    - uri:
        exact: /health
    route:
    - destination:
        host: graphql-api
        port:
          number: 4000
    timeout: 5s
```

## Handling GraphQL Subscriptions (WebSockets)

GraphQL subscriptions use WebSocket connections. Istio supports WebSockets, but you need to make sure the upgrade is allowed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graphql-api-ws
  namespace: graphql-services
spec:
  hosts:
  - graphql-api
  http:
  - match:
    - uri:
        exact: /graphql
      headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: graphql-api
        port:
          number: 4000
    timeout: 0s
  - match:
    - uri:
        exact: /graphql
    route:
    - destination:
        host: graphql-api
        port:
          number: 4000
    timeout: 30s
```

Setting `timeout: 0s` for WebSocket connections disables the timeout, which is necessary because subscription connections are meant to stay open indefinitely.

## Exposing GraphQL Through Istio Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: graphql-gateway
  namespace: graphql-services
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: graphql-api-cert
    hosts:
    - "api.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graphql-api-external
  namespace: graphql-services
spec:
  hosts:
  - "api.example.com"
  gateways:
  - graphql-gateway
  http:
  - match:
    - uri:
        exact: /graphql
    route:
    - destination:
        host: graphql-api
        port:
          number: 4000
    timeout: 30s
    corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      allowMethods:
      - POST
      - GET
      - OPTIONS
      allowHeaders:
      - content-type
      - authorization
      maxAge: "24h"
```

The CORS policy is important for GraphQL because browser-based clients like Apollo Client or Relay will make cross-origin requests.

## Connection Pooling and Circuit Breaking

GraphQL servers often fan out to multiple backend services. A single GraphQL query might trigger requests to several microservices. Protect the GraphQL service with circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: graphql-api-dr
  namespace: graphql-services
spec:
  host: graphql-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

## Header-Based Routing for GraphQL Versions

If you are testing a new version of your GraphQL schema, you can use header-based routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: graphql-api-versions
  namespace: graphql-services
spec:
  host: graphql-api
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graphql-api-canary
  namespace: graphql-services
spec:
  hosts:
  - graphql-api
  http:
  - match:
    - headers:
        x-schema-version:
          exact: "v2"
    route:
    - destination:
        host: graphql-api
        subset: v2
  - route:
    - destination:
        host: graphql-api
        subset: v1
```

## Authorization Policies for GraphQL

You can restrict which services are allowed to call your GraphQL API:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: graphql-api-auth
  namespace: graphql-services
spec:
  selector:
    matchLabels:
      app: graphql-api
  rules:
  - from:
    - source:
        namespaces:
        - "frontend"
        - "mobile-bff"
    to:
    - operation:
        methods: ["POST", "GET"]
        paths: ["/graphql"]
  - from:
    - source:
        namespaces:
        - "monitoring"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/health"]
```

## Rate Limiting GraphQL Requests

Since all GraphQL requests go to the same endpoint, you cannot use path-based rate limiting. Instead, use Istio's local rate limiting based on client IP or headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: graphql-rate-limit
  namespace: graphql-services
spec:
  workloadSelector:
    labels:
      app: graphql-api
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
```

## Monitoring GraphQL with Istio Metrics

Istio metrics will show you overall traffic patterns for the GraphQL endpoint. Since everything goes to `/graphql`, look at latency distributions to spot slow queries:

```bash
# P99 latency for GraphQL endpoint
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="graphql-api.graphql-services.svc.cluster.local"}[5m])) by (le))'
```

For deeper GraphQL-specific observability, you will still need application-level tracing that tracks individual queries and resolvers. Istio gives you the service-to-service view, while tools like Apollo Studio or GraphQL-specific middleware give you the query-level view.

## Summary

Running GraphQL services behind Istio requires thinking about single-endpoint routing, WebSocket support for subscriptions, and per-pod rate limiting instead of path-based approaches. The key configurations are setting appropriate timeouts for varying query complexity, enabling WebSocket upgrades for subscriptions, and using header-based routing for schema versioning. With these in place, you get all the security, observability, and traffic management benefits of Istio while keeping your GraphQL API performant.
