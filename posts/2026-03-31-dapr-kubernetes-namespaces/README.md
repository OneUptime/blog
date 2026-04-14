# How to Use Dapr with Kubernetes Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Namespace, Isolation, Multi-Tenant

Description: Use Dapr with Kubernetes namespaces to provide service isolation, scoped components, and controlled cross-namespace service invocation for multi-tenant environments.

---

## Dapr and Kubernetes Namespaces

Dapr respects Kubernetes namespaces for component scoping and service discovery. Each Dapr application has a unique ID that is namespace-scoped, meaning `order-service` in `team-a` namespace is distinct from `order-service` in `team-b`.

## Enabling Dapr in Multiple Namespaces

By default, Dapr's sidecar injector operates cluster-wide. Ensure your namespaces allow injection:

```bash
# Create application namespaces
kubectl create namespace team-a
kubectl create namespace team-b

# Deploy applications in separate namespaces
kubectl apply -f order-service.yaml -n team-a
kubectl apply -f payment-service.yaml -n team-b
```

The sidecar injector operates cluster-wide and injects into any namespace where pods have `dapr.io/enabled: "true"`.

## Deploying Namespace-Scoped Applications

```yaml
# team-a/order-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: team-a
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
```

## Cross-Namespace Service Invocation

To call a service in another namespace, use the `appId.namespace` format in the invocation URL:

```bash
# From team-a, invoke payment-service in team-b
curl "http://localhost:3500/v1.0/invoke/payment-service.team-b/method/pay" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}'
```

Or with the Go SDK:

```go
resp, err := client.InvokeMethod(ctx, "payment-service.team-b", "pay", "post")
```

## Namespace-Scoped Access Control

Use Dapr's access control policies to restrict which apps can invoke each other:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
  namespace: team-b
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: order-service
      defaultAction: allow
      namespace: "team-a"
      operations:
      - name: /pay
        httpVerb: ["POST"]
        action: allow
```

## Isolating Components to Namespaces

Scope a state store component to a specific namespace:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: team-a
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-team-a:6379
```

This component is only available to pods in the `team-a` namespace.

## Summary

Dapr integrates naturally with Kubernetes namespaces, scoping application IDs, components, and access control policies to specific namespaces. Cross-namespace service invocation uses the `appId.namespace` syntax, and access control configurations can restrict which namespaces are allowed to invoke specific methods, enabling secure multi-tenant microservice architectures.
