# How to Apply VirtualService Rules per Namespace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Namespace, Multi-tenancy, Kubernetes

Description: Learn how to scope Istio VirtualService routing rules to specific namespaces for multi-team environments and namespace isolation.

---

In a multi-team Kubernetes cluster, different namespaces often need different routing rules. The production namespace might need strict canary deployment controls, while the staging namespace gets more experimental configurations. Istio gives you several ways to scope VirtualService rules per namespace, including namespace placement, exportTo, and Sidecar resources.

## VirtualService Namespace Scope

By default, a VirtualService applies to all sidecars in the mesh that can see it. The namespace where you create the VirtualService does not limit its scope - it affects any pod that calls the target host.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: team-a
spec:
  hosts:
    - my-service.team-a.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.team-a.svc.cluster.local
            subset: v2
```

Even though this VirtualService is in the `team-a` namespace, it affects calls to `my-service.team-a` from any namespace in the mesh. A pod in `team-b` calling `my-service.team-a` will follow these routing rules.

## Limiting Visibility with exportTo

To restrict a VirtualService to specific namespaces, use the `exportTo` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: team-a
spec:
  exportTo:
    - "."
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v2
```

The `"."` means this VirtualService is only visible within the `team-a` namespace. Pods in other namespaces calling `my-service.team-a` will not see these routing rules.

`exportTo` options:
- `"."` - Current namespace only
- `"*"` - All namespaces (default)
- `"team-b"` - Specific namespace by name

You can list multiple namespaces:

```yaml
exportTo:
  - "."
  - "team-b"
  - "monitoring"
```

## Different Rules per Namespace

Each namespace can have its own VirtualService for the same host:

```yaml
# In the team-a namespace - team-a's view of the service
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: shared-api
  namespace: team-a
spec:
  exportTo:
    - "."
  hosts:
    - shared-api.shared.svc.cluster.local
  http:
    - timeout: 10s
      retries:
        attempts: 5
        perTryTimeout: 2s
      route:
        - destination:
            host: shared-api.shared.svc.cluster.local
            port:
              number: 80
---
# In the team-b namespace - team-b's view of the same service
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: shared-api
  namespace: team-b
spec:
  exportTo:
    - "."
  hosts:
    - shared-api.shared.svc.cluster.local
  http:
    - timeout: 5s
      retries:
        attempts: 2
        perTryTimeout: 2s
      route:
        - destination:
            host: shared-api.shared.svc.cluster.local
            port:
              number: 80
```

Team A gets 10-second timeouts with 5 retries. Team B gets 5-second timeouts with 2 retries. Each team's configuration only applies to calls originating from their namespace.

## Using Sidecar Resource for Namespace Isolation

The Sidecar resource provides another layer of namespace scoping by controlling what each sidecar can see:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: team-a
spec:
  egress:
    - hosts:
        - "./*"                           # All services in team-a namespace
        - "shared/*"                      # All services in shared namespace
        - "istio-system/*"                # Istio system services
```

This limits pods in `team-a` to only see services in their own namespace, the shared namespace, and istio-system. They cannot accidentally call services in `team-b`.

## Namespace-Specific Canary Deployments

Different namespaces can have different canary configurations:

```yaml
# Production namespace - conservative 5% canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  exportTo:
    - "."
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: stable
          weight: 95
        - destination:
            host: my-app
            subset: canary
          weight: 5
---
# Staging namespace - aggressive 50% canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: staging
spec:
  exportTo:
    - "."
  hosts:
    - my-app
  http:
    - route:
        - destination:
            host: my-app
            subset: stable
          weight: 50
        - destination:
            host: my-app
            subset: canary
          weight: 50
```

## Gateway Routing per Namespace

For ingress traffic, you can route to different namespaces based on the path:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ingress-routing
  namespace: istio-system
spec:
  hosts:
    - "api.example.com"
  gateways:
    - shared-gateway
  http:
    - match:
        - uri:
            prefix: "/team-a"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: api-service.team-a.svc.cluster.local
            port:
              number: 80
    - match:
        - uri:
            prefix: "/team-b"
      rewrite:
        uri: "/"
      route:
        - destination:
            host: api-service.team-b.svc.cluster.local
            port:
              number: 80
```

## Delegated VirtualServices per Namespace

Istio supports delegation where a root VirtualService delegates to child VirtualServices in different namespaces:

```yaml
# Root VirtualService in istio-system
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: root-vs
  namespace: istio-system
spec:
  hosts:
    - "api.example.com"
  gateways:
    - shared-gateway
  http:
    - match:
        - uri:
            prefix: "/team-a"
      delegate:
        name: team-a-routes
        namespace: team-a
    - match:
        - uri:
            prefix: "/team-b"
      delegate:
        name: team-b-routes
        namespace: team-b
---
# Team A's delegated VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: team-a-routes
  namespace: team-a
spec:
  http:
    - match:
        - uri:
            prefix: "/team-a/users"
      rewrite:
        uri: "/users"
      route:
        - destination:
            host: user-service.team-a.svc.cluster.local
            port:
              number: 80
    - match:
        - uri:
            prefix: "/team-a/orders"
      rewrite:
        uri: "/orders"
      route:
        - destination:
            host: order-service.team-a.svc.cluster.local
            port:
              number: 80
```

Each team manages their own routing rules independently, while the platform team controls the top-level path delegation.

## sourceNamespace Matching

You can match on the source namespace directly:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: shared-service
  namespace: shared
spec:
  hosts:
    - shared-service
  http:
    - match:
        - sourceNamespace: "production"
      route:
        - destination:
            host: shared-service
            subset: stable
      timeout: 30s
    - match:
        - sourceNamespace: "staging"
      route:
        - destination:
            host: shared-service
            subset: latest
      timeout: 10s
    - route:
        - destination:
            host: shared-service
            subset: stable
```

Calls from the production namespace get the stable version with a long timeout. Calls from staging get the latest version with a shorter timeout.

## Verifying Namespace Scoping

```bash
# Check VirtualService visibility
kubectl get vs -n team-a -o yaml | grep -A 2 exportTo

# Check what a specific pod can see
istioctl proxy-config routes deploy/my-app -n team-a

# Verify Sidecar configuration
kubectl get sidecar -n team-a -o yaml

# Check for cross-namespace conflicts
istioctl analyze --all-namespaces
```

## Common Mistakes

1. **Forgetting exportTo** - Without `exportTo`, your VirtualService affects all namespaces. Always set it when you want namespace-scoped rules.

2. **Conflicting VirtualServices** - If two namespaces create VirtualServices for the same host without `exportTo: ["."]`, they conflict and behavior is unpredictable.

3. **Missing Sidecar resource** - Without a Sidecar resource, every pod gets configuration for every service in the mesh. This wastes memory and can cause confusion.

4. **Cross-namespace destination without FQDN** - When routing to a service in another namespace, always use the FQDN: `my-service.other-namespace.svc.cluster.local`.

Namespace-scoped VirtualService rules give each team control over their own traffic management without affecting other teams. The combination of `exportTo`, Sidecar resources, and namespace-aware matching covers most multi-tenant scenarios.
