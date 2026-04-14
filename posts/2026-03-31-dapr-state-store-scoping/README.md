# How to Secure Dapr State Stores with Scoping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Security, Scoping, Access Control

Description: Learn how to use Dapr state store scoping to restrict which applications can access specific state stores, preventing unauthorized reads and writes across services.

---

## Overview

Multiple services in a Dapr deployment may share the same underlying state store infrastructure. Without scoping, any service can read or write to any state store in its namespace. Dapr state store scoping uses the `scopes` field on the component to create an explicit allowlist of app IDs that can access the store.

## Configuring State Store Scopes

The `scopes` field accepts a list of Dapr app IDs. Only these apps will have the component registered with their sidecar:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: user-profiles-state
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
scopes:
- user-service
- profile-api
```

Only `user-service` and `profile-api` can use the `user-profiles-state` store. Other services' sidecars will not load this component at all.

## Separating State Stores by Domain

Use scoping to enforce domain boundaries. Each domain service gets its own state store with appropriate scopes:

```yaml
# Orders state - only for order domain services
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-state
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: keyPrefix
    value: "name"
scopes:
- order-service
- order-history-service
---
# Inventory state - only for inventory domain
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: inventory-state
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: keyPrefix
    value: "name"
scopes:
- inventory-service
```

The `keyPrefix` metadata set to `name` ensures keys are automatically prefixed with the component name (e.g., `orders-state` or `inventory-state`), providing an additional logical separation even if services share the same Redis instance. Valid `keyPrefix` values are `appid` (default), `name`, `namespace`, and `none`.

## Verifying Scope Enforcement

Check which components are loaded by a specific sidecar:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.components[] | select(.type | startswith("state"))'
```

An app not in the scope list will not see the component in its metadata. Attempting to use it returns an error:

```bash
# From an unauthorized service
curl -X GET "http://localhost:3500/v1.0/state/user-profiles-state/user123"
# Expected: HTTP 400 error - state store not found or misconfigured
```

## Combining Scopes with Encryption

For state stores containing sensitive data, combine scoping with state store encryption:

```yaml
spec:
  metadata:
  - name: primaryEncryptionKey
    secretKeyRef:
      name: state-encryption-key
      key: key
scopes:
- payment-service
```

Even if the Redis instance is accessed directly, the data is encrypted with a key only the authorized service knows.

## Dynamic Scope Changes

When you update the `scopes` field on a component and reapply it, the change is stored in Kubernetes but is not automatically propagated to running sidecars by default. To enable automatic propagation without restarts, you can enable the `HotReload` feature gate (a preview feature). Otherwise, existing sidecars need a restart to pick up the change:

```bash
kubectl apply -f updated-state-component.yaml
kubectl rollout restart deployment/new-authorized-service
```

## Summary

Dapr state store scoping uses a simple `scopes` list on the component definition to ensure only designated services can access a given state store. Combined with key prefixes and encryption, scoping creates strong data isolation boundaries in shared infrastructure without requiring separate physical stores per service.
