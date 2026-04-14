# How to Share Dapr Components Across Polyglot Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Polyglot, Kubernetes, Configuration

Description: Learn how to define and share Dapr components across services written in different languages using namespace scoping, component versioning, and scopes.

---

Dapr components define the infrastructure bindings your services use - state stores, pub/sub brokers, secret stores, and bindings. When running polyglot microservices, sharing components correctly ensures consistency and avoids duplicated configuration.

## How Component Sharing Works

In Kubernetes mode, Dapr reads all `Component` resources in the namespace where the application runs. Any service with a matching `dapr.io/app-id` annotation can use any component in its namespace unless scoped otherwise.

## Namespace-Level Sharing

Deploy shared components to the same namespace as your services:

```yaml
# shared-components.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production  # Available to ALL services in production namespace
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis.production.svc.cluster.local:6379
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis.production.svc.cluster.local:6379
```

Apply once, used by all services in the namespace regardless of language.

## Restricting Components with Scopes

Use `scopes` to limit which app IDs can access a component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: https://vault:8200
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
scopes:
- payment-service-dotnet
- fraud-service-go
# Python and Java services cannot access this component
```

## Environment-Specific Component Overrides

Use Kustomize overlays to provide different component configurations per environment:

```yaml
# base/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

```yaml
# overlays/production/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
  - name: redisHost
    value: redis-cluster.production.svc.cluster.local:6379
  - name: enableTLS
    value: "true"
```

## Component Versioning for Safe Upgrades

When updating a component (e.g., changing the Redis version), deploy both old and new:

```yaml
# Keep v1 for stable services
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-v1
spec:
  type: state.redis
  version: v1
scopes:
- order-service-node   # Still on old version
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-v2
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-v2:6379
scopes:
- order-service-java   # Migrated to new instance
```

Services reference the component by name in their code, so `statestore-v1` and `statestore-v2` are independent.

## Verifying Component Loading

Check which components are loaded per service:

```bash
# List all components in the production namespace
dapr components -k --namespace production

# Check if a specific app loaded its components
kubectl logs -l dapr.io/app-id=order-service-node \
  -c daprd | grep "component loaded"
```

## GitOps Component Management

Store all component definitions in Git and apply with ArgoCD or Flux:

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components
spec:
  source:
    repoURL: https://github.com/company/infra
    path: dapr/components/production
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Summary

Dapr components are shared across polyglot services by deploying them to a shared Kubernetes namespace. Use `scopes` to restrict sensitive components to specific services, Kustomize overlays for environment-specific configuration, and versioned component names for safe migrations. GitOps tools ensure component changes are reviewed and auditable.
