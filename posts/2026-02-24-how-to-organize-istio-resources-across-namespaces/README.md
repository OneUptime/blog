# How to Organize Istio Resources Across Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Namespace, Kubernetes, Resource Organization, Service Mesh

Description: Practical strategies for organizing Istio VirtualServices, DestinationRules, Gateways, and security policies across Kubernetes namespaces for better maintainability.

---

As your Istio mesh grows, the question of where to put things becomes surprisingly important. Should VirtualServices live in the same namespace as the service they route to? Where do shared Gateways go? Who owns the AuthorizationPolicies? If you get the namespace organization wrong early on, refactoring later is a real headache.

This guide covers practical patterns for organizing Istio resources across namespaces, based on what actually works in production environments with dozens of teams and hundreds of services.

## The Core Principle

Istio resources have specific scoping rules. Some resources are namespace-scoped (they affect traffic within or targeting a specific namespace), while others have broader effects. Understanding these scoping rules is the foundation for good organization.

- **VirtualServices**: Can be in any namespace. They route traffic based on the hosts they claim.
- **DestinationRules**: Should be in the same namespace as the service they target, or in the root namespace.
- **Gateways**: Typically in `istio-system` or a dedicated gateway namespace, since they bind to specific load balancers.
- **AuthorizationPolicies**: Apply to the namespace they are created in. A policy in namespace `foo` applies to workloads in `foo`.
- **PeerAuthentication**: Namespace-scoped. A mesh-wide policy goes in `istio-system`.
- **Sidecar**: Namespace-scoped. Controls the egress behavior of sidecars in that namespace.

## Pattern 1: Co-locate with the Service

The simplest approach is to put Istio resources in the same namespace as the workload they configure. Each team owns their namespace and all the Istio resources within it.

```text
namespaces/
  team-a/
    deployment.yaml
    service.yaml
    virtualservice.yaml
    destinationrule.yaml
    authorizationpolicy.yaml
  team-b/
    deployment.yaml
    service.yaml
    virtualservice.yaml
    destinationrule.yaml
    authorizationpolicy.yaml
```

Example VirtualService in the same namespace as the service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-service
  namespace: team-a
spec:
  hosts:
    - orders-service
  http:
    - route:
        - destination:
            host: orders-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
```

This works well when teams are autonomous and services are relatively independent. The downside is that cross-namespace routing gets complicated.

## Pattern 2: Centralized Gateway, Distributed Routes

A common production pattern uses a centralized Gateway resource in `istio-system` (or a dedicated `istio-gateways` namespace), with VirtualServices distributed across application namespaces. This works because multiple VirtualServices can bind to the same Gateway.

Gateway in the central namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
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
        credentialName: wildcard-cert
      hosts:
        - "*.example.com"
```

VirtualService in the application namespace referencing the central Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-routes
  namespace: team-a
spec:
  hosts:
    - orders.example.com
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/orders
      route:
        - destination:
            host: orders-service
            port:
              number: 8080
```

The key here is the `istio-system/main-gateway` reference, which uses the `namespace/name` format to point to the Gateway in the central namespace.

## Pattern 3: Namespace per Environment

If you run multiple environments in the same cluster (which many teams do for cost reasons), organize by environment:

```text
namespaces/
  dev/
    orders-vs.yaml
    orders-dr.yaml
  staging/
    orders-vs.yaml
    orders-dr.yaml
  production/
    orders-vs.yaml
    orders-dr.yaml
```

Use the Sidecar resource to limit cross-namespace visibility:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: staging
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "staging/*"
```

This prevents staging workloads from accidentally discovering and calling production services.

## Pattern 4: Shared Infrastructure Namespace

For resources that are truly shared across teams, create a dedicated namespace:

```yaml
# Namespace for shared Istio resources
apiVersion: v1
kind: Namespace
metadata:
  name: istio-shared
  labels:
    istio-injection: enabled
```

Put shared resources there:

```yaml
# Shared external service entry
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-api
  namespace: istio-shared
spec:
  hosts:
    - api.payment-provider.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Teams reference the shared resources from their own namespaces:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-routing
  namespace: team-a
spec:
  hosts:
    - api.payment-provider.com
  http:
    - route:
        - destination:
            host: api.payment-provider.com
      timeout: 30s
```

## RBAC for Namespace-Based Organization

Once you have a namespace strategy, enforce it with Kubernetes RBAC. Give teams permission to manage Istio resources only in their own namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-resource-manager
  namespace: team-a
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["virtualservices", "destinationrules", "serviceentries"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
  - apiGroups: ["security.istio.io"]
    resources: ["authorizationpolicies", "requestauthentications"]
    verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-istio-manager
  namespace: team-a
subjects:
  - kind: Group
    name: team-a-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-resource-manager
  apiGroup: rbac.authorization.k8s.io
```

Lock down the `istio-system` namespace so that only platform engineers can modify shared Gateways and mesh-wide policies.

## Avoiding Common Pitfalls

There are a few things that trip people up with namespace organization:

**Host conflicts**: If two VirtualServices in different namespaces claim the same host, Istio will merge them. This can cause unexpected routing behavior. Use `exportTo` to limit the scope:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-routes
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
```

The `exportTo: ["."]` means this VirtualService is only visible within the `team-a` namespace.

**DestinationRule scope**: A DestinationRule for a service should live in the same namespace as the service, or you need to use the fully qualified hostname:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
  namespace: team-a
spec:
  host: orders-service.team-a.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

**Mesh-wide policies**: PeerAuthentication and AuthorizationPolicy in `istio-system` apply mesh-wide. Be very careful about what goes there, since a mistake affects every namespace.

## Practical Directory Structure

For your Git repository, mirror the namespace structure:

```text
istio-configs/
  istio-system/
    main-gateway.yaml
    mesh-peer-auth.yaml
  istio-shared/
    external-services/
      payment-api.yaml
      analytics-api.yaml
  team-a/
    orders-vs.yaml
    orders-dr.yaml
    orders-authz.yaml
  team-b/
    users-vs.yaml
    users-dr.yaml
    users-authz.yaml
```

This makes it clear who owns what and makes code reviews straightforward. When someone on team-a submits a PR, they should only be changing files under the `team-a/` directory.

## Summary

Good namespace organization for Istio comes down to clear ownership, proper scoping with `exportTo`, and RBAC enforcement. Start with co-locating resources with their services, centralize Gateways and mesh-wide policies, and use the Sidecar resource to limit cross-namespace visibility. The exact pattern depends on your team structure, but these building blocks will get you to a maintainable setup.
