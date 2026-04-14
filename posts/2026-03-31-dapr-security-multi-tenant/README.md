# How to Use Dapr Security in Multi-Tenant Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Multi-Tenant, Namespace, Isolation

Description: Learn how to isolate Dapr workloads in multi-tenant Kubernetes environments using namespaces, scoping, trust domains, and access control policies.

---

## Overview

Running multiple tenants on a shared Dapr-enabled Kubernetes cluster requires careful isolation at several layers: network, component access, service invocation, and secret management. Dapr provides built-in primitives to enforce these boundaries without requiring separate clusters for each tenant.

## Namespace-Based Isolation

The foundational isolation unit in Dapr is the Kubernetes namespace. Components, configurations, and secrets defined in one namespace are not accessible from another by default.

Deploy each tenant into its own namespace:

```bash
kubectl create namespace tenant-a
kubectl create namespace tenant-b
```

Dapr components in `tenant-a` are only accessible to sidecars in `tenant-a`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store
  namespace: tenant-a
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-tenant-a:6379"
```

## Component Scoping

Even within a namespace, use component scoping to restrict which app IDs can access a component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-state
  namespace: tenant-a
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-tenant-a:6379"
scopes:
- order-service
- inventory-service
```

Only `order-service` and `inventory-service` within `tenant-a` can use this state store.

## Trust Domains for Cross-Namespace Policies

Dapr uses SPIFFE trust domains to scope mTLS certificates. Assign different trust domains per tenant to prevent cross-tenant service invocation even if namespaces are bridged:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tenant-a-config
  namespace: tenant-a
spec:
  mtls:
    enabled: true
  accessControl:
    defaultAction: deny
    trustDomain: "tenant-a.example.com"
    policies:
    - appId: payment-service
      defaultAction: allow
      trustDomain: "tenant-a.example.com"
      namespace: "tenant-a"
```

A service in `tenant-b` with a different trust domain cannot impersonate `tenant-a` services.

## Isolating Secrets per Tenant

Use separate secret stores or namespace-scoped Kubernetes secrets for each tenant:

```bash
kubectl create secret generic db-credentials \
  --from-literal=password=tenantApass \
  -n tenant-a

kubectl create secret generic db-credentials \
  --from-literal=password=tenantBpass \
  -n tenant-b
```

Reference them in namespace-scoped components so there is no cross-tenant secret leakage.

## Network Policies

Complement Dapr security with Kubernetes NetworkPolicies to block cross-namespace traffic at the network layer:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-tenant
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: "tenant-a"
```

## Summary

Multi-tenant Dapr security relies on layering Kubernetes namespaces, component scoping, SPIFFE trust domains, per-tenant secrets, and network policies. Together these mechanisms ensure tenants cannot access each other's data or services even when sharing the same physical Kubernetes cluster.
