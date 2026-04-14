# How to Use State Store Scoping in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Scoping, Security, Microservice

Description: Learn how to restrict Dapr state store access to specific applications using component scoping to enforce least-privilege access in Kubernetes.

---

## Why Scope State Stores?

In a multi-service Dapr deployment, every application can access every component by default. Scoping lets you restrict which Dapr application IDs are allowed to use a given state store. This reduces blast radius if a service is compromised and keeps your data access model explicit and auditable.

## Defining Scoped State Store Components

Scoping is applied at the component level using the `scopes` field. Only apps listed there can access that component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-orders:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
scopes:
- order-service
- shipping-service
```

In this example, only pods with the Dapr app ID `order-service` or `shipping-service` can read or write `orders-statestore`. Any other service that attempts to use it will receive an error indicating the state store is not configured, because Dapr does not load scoped components for apps outside the scope list.

## Setting the Dapr App ID

The app ID is set via an annotation on the Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: order-service
        image: my-registry/order-service:latest
```

## Multiple Stores with Different Scopes

You can run multiple state stores and scope each to different services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: user-statestore
  namespace: production
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-secret
      key: connstr
scopes:
- user-service
- auth-service
```

This separation ensures `order-service` cannot accidentally read or write user data.

## Verifying Scoping Enforcement

After deploying, you can confirm enforcement with a curl command from a pod that is NOT in scope:

```bash
# From a pod with app-id: analytics-service (not in scope)
curl -v http://localhost:3500/v1.0/state/orders-statestore/order-123
# Expected: HTTP 400 — state store orders-statestore is not configured
```

And from an allowed pod:

```bash
# From a pod with app-id: order-service (in scope)
curl http://localhost:3500/v1.0/state/orders-statestore/order-123
# Expected: HTTP 200 with state data
```

## Scoping Across Namespaces

When running Dapr components in a specific namespace, the `namespace` field on the component already provides isolation. Combined with `scopes`, you get both namespace-level and app-level access control:

```bash
kubectl apply -f orders-statestore.yaml -n production
kubectl apply -f user-statestore.yaml -n production
```

Services in other namespaces cannot see these components unless the Dapr control plane is configured for cross-namespace access.

## Summary

Dapr state store scoping uses the `scopes` field on component definitions to restrict which application IDs can access a given store. Combined with Kubernetes namespaces and secret references for credentials, scoping gives you a layered access control model that enforces the principle of least privilege without adding application-layer authorization code.
