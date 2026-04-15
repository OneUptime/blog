# How to Implement Dapr Blue-Green Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Blue-Green Deployment, Kubernetes, Deployment Strategy, Zero Downtime

Description: Implement blue-green deployments for Dapr-enabled microservices on Kubernetes to achieve zero-downtime releases with instant rollback capability.

---

Blue-green deployments run two identical production environments simultaneously. Traffic is switched from the blue (current) to the green (new) version atomically. The Kubernetes Service selector switch controls external traffic (e.g., from an Ingress or LoadBalancer). However, Dapr service invocation uses its own name resolution (`{app-id}-dapr.{namespace}.svc.cluster.local`), so while both deployments are running with the same app ID, Dapr-to-Dapr calls are distributed across pods in both versions. The full Dapr traffic cutover happens when the old deployment is scaled down.

## Blue-Green Deployment Structure

The pattern uses two deployments sharing a single Service selector that you switch:

```yaml
# Blue deployment (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-blue
  labels:
    app: order-service
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: blue
  template:
    metadata:
      labels:
        app: order-service
        version: blue
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:v1.0.0
```

```yaml
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-green
  labels:
    app: order-service
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: green
  template:
    metadata:
      labels:
        app: order-service
        version: green
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:v1.1.0
```

## The Kubernetes Service Switch

The Service uses a `version` label to direct traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
    version: blue  # Switch this to "green" to cut over
  ports:
  - port: 80
    targetPort: 8080
```

## Performing the Cutover

Switch traffic from blue to green:

```bash
# Patch the service selector to point to green
kubectl patch service order-service \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify the service endpoints updated
kubectl get endpoints order-service
```

## Validating the Green Deployment

Before cutting over, smoke test the green deployment directly:

```bash
# Port-forward directly to the green deployment
kubectl port-forward deployment/order-service-green 8081:8080

# Run smoke tests against the new version
curl http://localhost:8081/health
curl http://localhost:8081/v1/orders -X POST \
  -H "Content-Type: application/json" \
  -d '{"item": "test-item"}'
```

## Rollback Procedure

If the green deployment has issues, revert in seconds:

```bash
# Switch back to blue
kubectl patch service order-service \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify rollback
kubectl get endpoints order-service
```

## Dapr App ID Considerations

Both blue and green deployments use the same `dapr.io/app-id`. This means that while both deployments are running, Dapr service invocation distributes calls across pods in both versions. Dapr resolves app IDs through its own name resolution (via the `{app-id}-dapr` Kubernetes Service created by the Dapr operator), not through the user-defined Kubernetes Service. Pub/Sub subscriptions also use the app ID, so both versions share the same subscriptions during the transition window. The complete cutover of Dapr traffic happens when the old deployment is scaled down to zero.

## Cleanup

After validating the green deployment, scale down blue:

```bash
kubectl scale deployment order-service-blue --replicas=0
```

Keep the blue deployment around for a few days before deleting it, in case a delayed issue requires rollback.

## Summary

Blue-green deployments can be combined with Dapr, but it is important to understand that the Kubernetes Service selector switch controls external traffic only. Dapr service invocation uses its own app-ID-based name resolution and routes to all running pods with the matching app ID. By running two deployments simultaneously, validating the new version, and then scaling down the old deployment, teams achieve zero-downtime releases with rollback capability.
