# How to Invoke Services Across Different Namespaces in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Namespace, Service Invocation, Multi-Tenant

Description: Learn how to invoke Dapr services running in different Kubernetes namespaces using namespace-qualified app IDs and proper RBAC configuration.

---

## Default Namespace Behavior

By default, Dapr service invocation resolves app IDs within the same namespace. An app with `dapr.io/app-id: order-service` in namespace `production` is not reachable from namespace `staging` without additional configuration.

## Cross-Namespace Invocation Syntax

To invoke a service in a different namespace, use the fully qualified name format:

```text
{app-id}.{namespace}
```

HTTP example:

```bash
curl http://localhost:3500/v1.0/invoke/order-service.production/method/orders
```

This tells Dapr to resolve `order-service` in the `production` namespace.

## Calling from Go SDK

```go
client, _ := dapr.NewClient()
defer client.Close()

// Invoke service in a different namespace
resp, err := client.InvokeMethod(
    context.Background(),
    "order-service.production",
    "orders",
    "GET",
)
```

## Required Network Policies

Ensure network policies allow cross-namespace traffic. A permissive example:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-staging
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: staging
```

## Component Scoping for Cross-Namespace Access

If your app uses shared components (state stores, pub/sub), scope them to allow access from both namespaces:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
scopes:
  - order-service
  - staging-client-app
```

## Namespace-Scoped Dapr Installations

For stronger isolation, install separate Dapr control planes per namespace using:

```bash
dapr init -k --namespace production
dapr init -k --namespace staging
```

Note that services managed by separate Dapr control planes cannot discover each other by default. Use this approach when you need strict isolation between namespaces, not when you need cross-namespace invocation.

## Summary

Invoke Dapr services across namespaces by using the fully qualified app ID format `{app-id}.{namespace}`. Ensure network policies allow cross-namespace traffic and that shared components are scoped to include the calling app. For maximum isolation, consider deploying separate Dapr control planes per namespace, but note that this prevents cross-namespace service discovery.
