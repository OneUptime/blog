# How to Handle Shared Services in Multi-Tenant Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Shared Services, Service Mesh, Kubernetes

Description: A practical guide to managing shared services in a multi-tenant Istio mesh including access control, traffic routing, and resource isolation.

---

Almost every multi-tenant system has some shared services. Maybe it is a centralized logging service, a shared database proxy, an authentication service, or a message queue. These services need to be accessible by all tenants while still maintaining tenant isolation. Getting this right in Istio requires careful handling of authorization, traffic routing, and resource management.

## Organizing Shared Services

Put all shared services in a dedicated namespace. This keeps them separate from any individual tenant and makes policy management cleaner:

```bash
kubectl create namespace shared-services
kubectl label namespace shared-services istio-injection=enabled
kubectl label namespace shared-services purpose=shared
```

Common shared services might include:

- Authentication/authorization service
- Database connection pooler (like PgBouncer)
- Cache layer (Redis, Memcached)
- Message broker (RabbitMQ, Kafka proxies)
- Logging and monitoring collectors
- Internal API gateway

## Granting Tenant Access to Shared Services

With a deny-all baseline policy at the mesh level, you need to explicitly allow tenant traffic to reach shared services. Create an AuthorizationPolicy in the shared-services namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-tenants
  namespace: shared-services
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
        - tenant-b
        - tenant-c
```

This allows any pod in the listed tenant namespaces to call any service in `shared-services`. If you want more granularity, use selectors to control which shared services each tenant can access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-tenants-to-auth-service
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: auth-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
        - tenant-b
        - tenant-c
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-premium-tenants-to-cache
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: redis-cache
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
        - tenant-c
```

In this setup, all tenants can use the auth service, but only premium tenants (tenant-a and tenant-c) have access to the Redis cache.

## Sidecar Configuration for Shared Service Discovery

Each tenant's Sidecar resource needs to include the shared-services namespace so their proxies can discover the shared services:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
```

Without this, the tenant's Envoy proxies will not have routes to the shared services, and requests will fail with a "no healthy upstream" error.

## Preventing Cross-Tenant Data Leaks Through Shared Services

One subtle risk with shared services is that they can become a channel for cross-tenant communication. If tenant A writes data to a shared message queue and tenant B can read from the same queue, you have a cross-tenant data leak.

Handle this at the application level by requiring tenant identification in all requests to shared services. For HTTP services, use a request header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shared-api-tenant-routing
  namespace: shared-services
spec:
  hosts:
  - shared-api
  http:
  - match:
    - headers:
        x-tenant-id:
          exact: tenant-a
      sourceLabels:
        tenant: tenant-a
    route:
    - destination:
        host: shared-api
        subset: default
  - match:
    - headers:
        x-tenant-id:
          exact: tenant-b
      sourceLabels:
        tenant: tenant-b
    route:
    - destination:
        host: shared-api
        subset: default
```

You can also use Istio to inject tenant identity headers automatically using an EnvoyFilter. This way, the shared service always knows which tenant is calling without relying on the application to set the header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: inject-tenant-header
  namespace: tenant-a
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-tenant-id", "tenant-a")
            end
```

## Shared Service Rate Limiting Per Tenant

Shared services are a natural bottleneck. If one tenant hammers a shared service, all tenants suffer. Implement per-tenant rate limiting on the shared service side.

Use a rate limit descriptor based on the source namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: shared-services
    descriptors:
    - key: source_namespace
      value: tenant-a
      rate_limit:
        unit: minute
        requests_per_unit: 5000
    - key: source_namespace
      value: tenant-b
      rate_limit:
        unit: minute
        requests_per_unit: 2000
    - key: source_namespace
      rate_limit:
        unit: minute
        requests_per_unit: 1000
```

## Traffic Policies for Shared Services

Configure connection pool limits and outlier detection on shared services to prevent cascading failures:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: shared-api-resilience
  namespace: shared-services
spec:
  host: shared-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

These settings prevent a shared service from being overwhelmed by too many concurrent connections and automatically eject unhealthy instances.

## Versioning Shared Services

When you need to update a shared service, you might want to roll it out gradually per tenant. Use Istio's traffic splitting:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: shared-api-versions
  namespace: shared-services
spec:
  host: shared-api
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shared-api-routing
  namespace: shared-services
spec:
  hosts:
  - shared-api
  http:
  - match:
    - sourceNamespace: tenant-a
    route:
    - destination:
        host: shared-api
        subset: v2
  - route:
    - destination:
        host: shared-api
        subset: v1
```

Tenant A gets the new version while all other tenants stay on v1. Once you have validated the new version, route more tenants to it.

## Monitoring Shared Service Usage Per Tenant

Track which tenants are using shared services and how much:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload_namespace="shared-services"
}[5m])) by (source_workload_namespace, destination_workload)
```

This gives you a matrix of tenant-to-shared-service traffic. Build a Grafana dashboard with this query to spot usage patterns and identify tenants that might be abusing shared resources.

## Handling Shared Service Failures

When a shared service goes down, all tenants are affected. Minimize the blast radius with circuit breaking and fallbacks:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: shared-cache-circuit-breaker
  namespace: shared-services
spec:
  host: redis-cache
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
    outlierDetection:
      consecutiveGatewayErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

On the application side, design your tenant services to degrade gracefully when shared services are unavailable. The Istio circuit breaker will return errors quickly rather than waiting for timeouts, so your services can fall back to cached data or alternative code paths.

## Summary

Shared services in a multi-tenant Istio mesh need careful attention to access control, performance isolation, and failure handling. Use authorization policies to control which tenants can access which shared services. Apply rate limiting to prevent noisy tenants from impacting others. Use traffic splitting for safe rollouts. And always monitor per-tenant usage of shared resources so you can spot issues before they become outages.
