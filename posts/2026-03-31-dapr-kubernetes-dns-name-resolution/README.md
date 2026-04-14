# How to Configure Kubernetes DNS Name Resolution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, DNS, Name Resolution, Service Discovery

Description: Learn how Dapr uses Kubernetes DNS for service-to-service name resolution and how to configure it for cross-namespace and cross-cluster communication.

---

## How Dapr Uses Kubernetes DNS

When running in Kubernetes, Dapr uses the built-in Kubernetes DNS name resolution by default. The `nameResolution` component type `nameresolution.kubernetes` resolves app IDs to Kubernetes service DNS names. This requires no extra configuration for same-namespace communication.

Dapr translates an app ID like `order-service` to the Kubernetes DNS name `order-service-dapr.default.svc.cluster.local`, which points to the headless service created by the Dapr operator.

## Default Behavior: No Extra Config Required

For apps running in the same namespace, Kubernetes DNS resolution works out of the box. When you invoke a service:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Dapr resolves `order-service` using Kubernetes DNS automatically. No `nameResolution` component needs to be defined explicitly.

## Cross-Namespace Service Invocation

To invoke services in a different namespace, include the namespace in the app ID using the `<app-id>.<namespace>` format:

```bash
curl http://localhost:3500/v1.0/invoke/order-service.production/method/orders
```

Or in code using the Dapr Go SDK:

```go
resp, err := client.InvokeMethod(ctx, "order-service.production", "orders", "GET")
```

Ensure RBAC allows cross-namespace access. You may need a NetworkPolicy or Dapr access control policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
      - appId: order-service
        defaultAction: allow
        trustDomain: "cluster.local"
        namespace: production
```

## Explicit Kubernetes Name Resolution Component

You can explicitly define the Kubernetes name resolution component to customize behavior:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
  namespace: default
spec:
  nameResolution:
    component: "kubernetes"
    configuration:
      clusterDomain: "cluster.local"
```

Apply it:

```bash
kubectl apply -f kubernetes-name-resolution.yaml
```

## Troubleshooting DNS Resolution

If name resolution fails, verify the Dapr headless service exists:

```bash
kubectl get service -n default | grep dapr
```

Check DNS resolution from within the cluster:

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup order-service-dapr.default.svc.cluster.local
```

Check Dapr sidecar logs for name resolution errors:

```bash
kubectl logs myapp-pod -c daprd | grep -i "name resolution\|resolve"
```

## Verify Dapr Services Are Registered

Dapr creates a Kubernetes service for each app. Confirm your app is registered:

```bash
kubectl get svc -l dapr.io/app-id=order-service -n default
```

If the service is missing, check that the Dapr sidecar is running:

```bash
kubectl get pod myapp-pod -o jsonpath='{.spec.containers[*].name}'
```

You should see `daprd` in the container list.

## Summary

Dapr uses Kubernetes DNS name resolution by default when deployed on Kubernetes, requiring no explicit configuration for same-namespace invocations. Cross-namespace calls use the `<app-id>.<namespace>` format. Explicit component definitions allow customizing the cluster domain. Troubleshoot issues by verifying Dapr headless services exist and using `nslookup` from within the cluster.
