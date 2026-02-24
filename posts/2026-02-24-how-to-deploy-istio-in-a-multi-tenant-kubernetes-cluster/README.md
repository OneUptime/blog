# How to Deploy Istio in a Multi-Tenant Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Tenancy, Kubernetes, Security, Namespace Isolation

Description: How to configure Istio for multi-tenant Kubernetes clusters with proper isolation, security policies, and per-tenant configuration.

---

Running multiple teams or applications on the same Kubernetes cluster is common, but adding a service mesh introduces new challenges. Each tenant needs their own traffic rules, their own security policies, and isolation from other tenants. A misconfigured VirtualService in one namespace should not affect routing in another. Istio provides several mechanisms for multi-tenant isolation, and getting them right is critical for shared clusters.

## Multi-Tenancy Models

There are two main approaches to multi-tenancy with Istio:

**Soft multi-tenancy** - All tenants share the same Istio control plane. Isolation is enforced through Kubernetes RBAC and Istio's namespace-scoped configuration. This is simpler to operate but requires trust between tenants.

**Hard multi-tenancy** - Each tenant gets their own Istio control plane (using revisions). This provides stronger isolation but is more complex to manage.

Most organizations use soft multi-tenancy. Hard multi-tenancy is only needed when tenants are completely untrusted (like in a SaaS platform providing mesh-as-a-service).

## Setting Up Namespace-Based Isolation

The foundation of multi-tenancy in Istio is namespace isolation. Each tenant gets their own namespace, and Istio configuration is scoped to that namespace.

Create tenant namespaces:

```bash
kubectl create namespace tenant-a
kubectl create namespace tenant-b

# Enable sidecar injection per namespace
kubectl label namespace tenant-a istio-injection=enabled
kubectl label namespace tenant-b istio-injection=enabled
```

## Restricting Configuration Scope with exportTo

By default, Istio resources like VirtualService and DestinationRule are visible to all namespaces. In a multi-tenant setup, you want to restrict this. Use the `exportTo` field:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: tenant-a
spec:
  hosts:
  - my-service
  exportTo:
  - "."
  http:
  - route:
    - destination:
        host: my-service
        port:
          number: 8080
```

The `exportTo: ["."]` means this VirtualService is only visible within the `tenant-a` namespace. Without this, tenant-b could be affected by tenant-a's routing rules.

Apply the same to DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: tenant-a
spec:
  host: my-service
  exportTo:
  - "."
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
```

You can also set a mesh-wide default in the MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultVirtualServiceExportTo:
    - "."
    defaultDestinationRuleExportTo:
    - "."
    defaultServiceExportTo:
    - "."
```

This is highly recommended for multi-tenant clusters. It changes the default from "export everywhere" to "export only within the namespace."

## Sidecar Resource for Visibility Control

Use the Sidecar resource to control what each namespace's proxies can see. Without this, every proxy in the mesh knows about every service, which is both a security concern and a resource waste:

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

This tells proxies in `tenant-a` to only know about:
- Services in their own namespace (`./*`)
- Services in `istio-system` (needed for mesh infrastructure)
- Services in a `shared-services` namespace (if you have shared dependencies)

Create similar Sidecar resources for each tenant namespace.

## Authorization Policies for Cross-Tenant Isolation

Even with network policies, you need Istio AuthorizationPolicies to enforce service-to-service access control:

```yaml
# Deny all traffic by default in tenant-a
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: tenant-a
spec:
  {}

---
# Allow traffic only from within the same namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-a
spec:
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
```

Do the same for tenant-b:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: tenant-b
spec:
  {}

---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-b
spec:
  rules:
  - from:
    - source:
        namespaces:
        - tenant-b
```

This ensures tenant-a's services cannot call tenant-b's services and vice versa.

## Allowing Cross-Tenant Access When Needed

Sometimes tenants need to access shared services. Create explicit allow rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-tenants
  namespace: shared-services
spec:
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
        - tenant-b
    to:
    - operation:
        methods:
        - GET
        paths:
        - "/api/shared/*"
```

## RBAC for Configuration Access

Use Kubernetes RBAC to prevent tenants from modifying each other's Istio configuration:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-config-manager
  namespace: tenant-a
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "sidecars"]
  verbs: ["get", "list", "create", "update", "delete"]
- apiGroups: ["security.istio.io"]
  resources: ["authorizationpolicies", "requestauthentications"]
  verbs: ["get", "list", "create", "update", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-istio-admin
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-admins
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-config-manager
  apiGroup: rbac.authorization.k8s.io
```

This gives the `tenant-a-admins` group permission to manage Istio resources only in the `tenant-a` namespace.

## Per-Tenant Resource Limits

Prevent one tenant's proxies from consuming too many resources by setting proxy resource limits per namespace:

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
```

And use pod annotations for specific workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: tenant-a
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

## Per-Tenant Ingress

Each tenant often needs their own ingress point. You can use separate Gateway resources per tenant:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tenant-a-gateway
  namespace: tenant-a
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
      credentialName: tenant-a-cert
    hosts:
    - "tenant-a.example.com"
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tenant-b-gateway
  namespace: tenant-b
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
      credentialName: tenant-b-cert
    hosts:
    - "tenant-b.example.com"
```

## Hard Multi-Tenancy with Revisions

For stronger isolation, give each tenant their own istiod revision:

```bash
# Install istiod for tenant-a
istioctl install --set revision=tenant-a \
  --set values.global.istioNamespace=istio-system \
  --set meshConfig.defaultConfig.discoveryAddress=istiod-tenant-a.istio-system:15012

# Install istiod for tenant-b
istioctl install --set revision=tenant-b \
  --set values.global.istioNamespace=istio-system \
  --set meshConfig.defaultConfig.discoveryAddress=istiod-tenant-b.istio-system:15012
```

Label namespaces to use specific revisions:

```bash
kubectl label namespace tenant-a istio.io/rev=tenant-a
kubectl label namespace tenant-b istio.io/rev=tenant-b
```

Each tenant's proxies connect only to their own istiod instance, providing complete control plane isolation.

## Monitoring Per-Tenant Metrics

Track resource usage and traffic per tenant using namespace labels:

```promql
# Request rate per tenant namespace
sum(rate(istio_requests_total{source_workload_namespace="tenant-a"}[5m]))

# Error rate per tenant
sum(rate(istio_requests_total{
  source_workload_namespace="tenant-a",
  response_code=~"5.*"
}[5m]))
```

## Summary

Multi-tenancy in Istio requires attention at multiple layers: use `exportTo` to restrict configuration visibility, Sidecar resources to limit proxy scope, AuthorizationPolicies for service-to-service isolation, and RBAC for configuration access control. Set mesh-wide defaults for export scope to prevent accidental cross-namespace leakage. For the strongest isolation, use Istio revisions to give each tenant their own control plane. The goal is to make it so that each tenant can only see and affect their own services while still sharing the underlying infrastructure efficiently.
