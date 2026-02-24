# How to Implement Multi-Tenancy with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Kubernetes, Security, Service Mesh

Description: A hands-on guide to implementing multi-tenant isolation in Kubernetes using Istio's namespace-level policies, authorization rules, and traffic management.

---

Multi-tenancy is one of the harder problems in Kubernetes. You need to make sure that tenants can't access each other's data, can't starve each other of resources, and can't interfere with each other's services. Kubernetes has some built-in tools (namespaces, resource quotas, network policies), but they only get you part of the way there.

Istio fills in the gaps with service-level access control, encrypted communication, and traffic isolation. When combined with Kubernetes namespaces, you get a solid multi-tenant architecture where each tenant's services are properly isolated.

## Multi-Tenancy Models

There are two common models:

**Namespace per tenant**: Each tenant gets their own Kubernetes namespace. Services within a tenant's namespace can communicate freely, but cross-namespace communication is restricted. This is the most common and easiest to implement with Istio.

**Shared namespace with labels**: Multiple tenants share a namespace, with labels distinguishing their workloads. This is more complex and harder to secure, so I'll focus on the namespace-per-tenant model.

## Setting Up Tenant Namespaces

Create namespaces for each tenant with Istio sidecar injection enabled:

```bash
kubectl create namespace tenant-a
kubectl create namespace tenant-b
kubectl create namespace tenant-c

kubectl label namespace tenant-a istio-injection=enabled
kubectl label namespace tenant-b istio-injection=enabled
kubectl label namespace tenant-c istio-injection=enabled
```

Add labels to identify tenant namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    istio-injection: enabled
    tenant: tenant-a
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-b
  labels:
    istio-injection: enabled
    tenant: tenant-b
    environment: production
```

## Enforcing mTLS Between Tenants

Enable strict mTLS mesh-wide to ensure all communication is encrypted and authenticated:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This means every service-to-service call within the mesh is encrypted with mutual TLS, and each service's identity is verified through its SPIFFE certificate.

## Isolating Tenants with Authorization Policies

The most important part is preventing Tenant A from calling Tenant B's services. Create a default deny policy in each tenant namespace, then explicitly allow intra-tenant communication:

```yaml
# Default deny for Tenant A's namespace
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: tenant-a
spec:
  {}
---
# Allow intra-namespace communication for Tenant A
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
```

Do the same for every tenant namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: tenant-b
spec:
  {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
  namespace: tenant-b
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-b
```

Now Tenant A's services can only talk to other services in the tenant-a namespace. Any call to tenant-b is denied with a 403.

## Allowing Access to Shared Services

Most multi-tenant setups have shared services that all tenants need (databases proxies, message queues, shared APIs). Create a shared namespace and allow all tenants to access it:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shared-services
  labels:
    istio-injection: enabled
---
apiVersion: security.istio.io/v1beta1
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

Or use a wildcard approach if you label tenant namespaces consistently:

```yaml
apiVersion: security.istio.io/v1beta1
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
    to:
    - operation:
        methods:
        - GET
        - POST
        paths:
        - /api/*
```

## Per-Tenant Rate Limiting

Prevent one tenant from consuming disproportionate resources with per-tenant rate limiting. Using the EnvoyFilter approach with local rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tenant-ratelimit
  namespace: shared-services
spec:
  workloadSelector:
    labels:
      app: shared-api
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
            stat_prefix: tenant_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
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

## Tenant-Specific Routing

Route traffic to different backends based on the tenant. This is useful when tenants have different service tiers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: shared-api-routing
  namespace: shared-services
spec:
  hosts:
  - shared-api
  http:
  - match:
    - headers:
        x-tenant-id:
          exact: "tenant-a"
    route:
    - destination:
        host: shared-api
        subset: premium
  - route:
    - destination:
        host: shared-api
        subset: standard
```

## Sidecar Resource Configuration

By default, each Envoy sidecar is configured with information about all services in the mesh. In a multi-tenant setup, this means Tenant A's sidecars know about Tenant B's services. You can restrict this with the Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: tenant-a-sidecar
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "shared-services/*"
    - "istio-system/*"
```

This limits the sidecar's knowledge to services in the tenant-a namespace and the shared-services namespace. Tenant A's sidecars won't even know that Tenant B's services exist. This improves performance (less configuration to push) and adds another layer of isolation.

## Monitoring Per Tenant

Use Istio's telemetry to monitor per-tenant metrics. Since each tenant is in its own namespace, you can filter metrics by namespace:

```bash
# Requests per tenant
sum(rate(istio_requests_total{source_workload_namespace="tenant-a"}[5m]))
sum(rate(istio_requests_total{source_workload_namespace="tenant-b"}[5m]))

# Error rates per tenant
sum(rate(istio_requests_total{source_workload_namespace="tenant-a",response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{source_workload_namespace="tenant-a"}[5m]))
```

Set up alerts per tenant to catch issues early:

```yaml
groups:
- name: tenant-alerts
  rules:
  - alert: HighErrorRateTenantA
    expr: |
      sum(rate(istio_requests_total{source_workload_namespace="tenant-a",response_code=~"5.."}[5m]))
      /
      sum(rate(istio_requests_total{source_workload_namespace="tenant-a"}[5m]))
      > 0.05
    for: 5m
    labels:
      tenant: tenant-a
```

## Automating Tenant Onboarding

When adding a new tenant, you need to create the namespace, set up authorization policies, configure sidecar scoping, and set up monitoring. Automate this with a script or Kubernetes operator:

```bash
#!/bin/bash
TENANT=$1

kubectl create namespace $TENANT
kubectl label namespace $TENANT istio-injection=enabled tenant=$TENANT

kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: $TENANT
spec:
  {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
  namespace: $TENANT
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - $TENANT
  - from:
    - source:
        namespaces:
        - shared-services
---
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: $TENANT
spec:
  egress:
  - hosts:
    - "./*"
    - "shared-services/*"
    - "istio-system/*"
EOF

echo "Tenant $TENANT onboarded successfully"
```

Multi-tenancy with Istio provides defense in depth. Kubernetes namespaces provide the basic boundary, Istio's mTLS ensures encrypted and authenticated communication, authorization policies enforce access control, and Sidecar resources limit service discovery. Together, these layers give you a solid multi-tenant platform where tenants are isolated from each other but can still access shared infrastructure when needed.
