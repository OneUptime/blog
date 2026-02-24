# How to Configure Istio for REST API Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, REST API, Kubernetes, Service Mesh, Traffic Management

Description: Complete guide to configuring Istio service mesh for REST API services with routing, retries, circuit breaking, and security best practices.

---

REST APIs are the most common workload type running on Kubernetes, and they also happen to be what Istio was originally designed for. That said, there is still a lot of room to get the configuration wrong. Default settings work for basic cases, but production REST APIs need careful tuning of timeouts, retries, circuit breakers, and authorization policies.

This guide goes through the key Istio configurations for running REST APIs reliably in production.

## Deploying a REST API with Istio

Start by preparing the namespace:

```bash
kubectl create namespace api-services
kubectl label namespace api-services istio-injection=enabled
```

Here is a sample REST API deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: api-services
  labels:
    app: orders-api
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api
      version: v1
  template:
    metadata:
      labels:
        app: orders-api
        version: v1
    spec:
      containers:
      - name: orders-api
        image: myregistry/orders-api:1.0
        ports:
        - containerPort: 8080
          name: http
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
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
  name: orders-api
  namespace: api-services
spec:
  selector:
    app: orders-api
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

## Path-Based Routing

REST APIs have well-defined URL structures. You can use Istio's VirtualService to route different paths to different services or versions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-api-vs
  namespace: api-services
spec:
  hosts:
  - orders-api
  http:
  - match:
    - uri:
        prefix: /api/v1/orders
      method:
        exact: GET
    route:
    - destination:
        host: orders-api
        subset: v1
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
  - match:
    - uri:
        prefix: /api/v1/orders
      method:
        exact: POST
    route:
    - destination:
        host: orders-api
        subset: v1
    timeout: 10s
    retries:
      attempts: 1
      perTryTimeout: 10s
      retryOn: connect-failure
```

Notice the different timeout and retry settings per HTTP method. GET requests are safe to retry multiple times because they are idempotent. POST requests should only be retried on connection failures (not on 5xx) to avoid creating duplicate resources.

## Canary Deployments for API Versions

When rolling out a new API version, route a percentage of traffic to it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-api-dr
  namespace: api-services
spec:
  host: orders-api
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
  name: orders-api-canary
  namespace: api-services
spec:
  hosts:
  - orders-api
  http:
  - route:
    - destination:
        host: orders-api
        subset: v1
      weight: 95
    - destination:
        host: orders-api
        subset: v2
      weight: 5
```

## Circuit Breaking

Protect your REST API from cascading failures:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-api-circuit-breaker
  namespace: api-services
spec:
  host: orders-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
        maxRequestsPerConnection: 100
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
    loadBalancer:
      simple: LEAST_REQUEST
```

The `LEAST_REQUEST` load balancer is generally better than round robin for REST APIs because it routes traffic to the pod with the fewest active requests, which naturally handles varying request processing times.

## Exposing the API via Istio Ingress

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
  namespace: api-services
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
      credentialName: api-tls-cert
    hosts:
    - "api.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-api-external
  namespace: api-services
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1/orders
    route:
    - destination:
        host: orders-api
        port:
          number: 8080
    timeout: 15s
    corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
      allowHeaders:
      - authorization
      - content-type
      maxAge: "24h"
```

## Authorization Policies

Restrict which services can access your API:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: orders-api-auth
  namespace: api-services
spec:
  selector:
    matchLabels:
      app: orders-api
  rules:
  - from:
    - source:
        namespaces:
        - "frontend"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/orders", "/api/v1/orders/*"]
  - from:
    - source:
        namespaces:
        - "admin-services"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/api/v1/orders", "/api/v1/orders/*"]
```

This gives the frontend namespace read-only access while admin services get full CRUD access.

## Request Mirroring for Testing

Before fully deploying a new version, mirror production traffic to it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-api-mirror
  namespace: api-services
spec:
  hosts:
  - orders-api
  http:
  - route:
    - destination:
        host: orders-api
        subset: v1
    mirror:
      host: orders-api
      subset: v2
    mirrorPercentage:
      value: 10.0
```

This sends a copy of 10% of production traffic to v2. The responses from v2 are discarded, so there is no impact on users.

## Fault Injection for Resilience Testing

Test how upstream services handle errors from your API:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-api-fault
  namespace: api-services
spec:
  hosts:
  - orders-api
  http:
  - fault:
      delay:
        percentage:
          value: 5
        fixedDelay: 3s
      abort:
        percentage:
          value: 1
        httpStatus: 500
    route:
    - destination:
        host: orders-api
```

This adds a 3-second delay to 5% of requests and returns a 500 error for 1% of requests. Use this in staging environments to verify that callers handle errors gracefully.

## mTLS for Service-to-Service Security

Enforce strict mTLS for all traffic to your REST API:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: api-mtls
  namespace: api-services
spec:
  mtls:
    mode: STRICT
```

## Monitoring REST API Metrics

Istio automatically tracks key metrics for your REST API:

```bash
# Request rate by response code
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_requests_total{destination_service="orders-api.api-services.svc.cluster.local"}[5m])) by (response_code)'

# P95 latency
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="orders-api.api-services.svc.cluster.local"}[5m])) by (le))'
```

## Summary

REST APIs are the bread and butter of Istio configuration. The key things to get right are: method-aware routing with appropriate retry policies (retry GETs liberally, be careful with POSTs), circuit breaking with outlier detection, path-level authorization policies, and proper CORS configuration for browser clients. Istio's traffic management features map naturally to REST API patterns, making it straightforward to implement canary deployments, traffic mirroring, and fault injection without touching your application code.
