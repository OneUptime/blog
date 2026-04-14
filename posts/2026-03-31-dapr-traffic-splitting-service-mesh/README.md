# How to Implement Traffic Splitting with Dapr and Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Traffic Splitting, Service Mesh, Istio, Kubernetes

Description: Learn how to implement weighted traffic splitting for Dapr services using Istio VirtualService to gradually shift load between versions.

---

Traffic splitting allows you to gradually shift requests between service versions - essential for safe deployments and A/B testing. While Dapr handles the application layer, Istio's VirtualService controls how traffic is weighted at the network layer. This guide shows how to implement percentage-based traffic splitting for Dapr services.

## Prerequisites

Have both Dapr and Istio installed and running with both sidecars injected in your namespace.

## Deploy Two Versions of a Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: checkout
      version: v1
  template:
    metadata:
      labels:
        app: checkout
        version: v1
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "checkout"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: checkout
        image: checkout:1.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-v2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: checkout
      version: v2
  template:
    metadata:
      labels:
        app: checkout
        version: v2
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "checkout"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: checkout
        image: checkout:2.0
```

## Create Istio DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: checkout
spec:
  host: checkout
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Configure Traffic Split

Start with 90% to v1 and 10% to v2:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
spec:
  hosts:
  - checkout
  http:
  - route:
    - destination:
        host: checkout
        subset: v1
      weight: 90
    - destination:
        host: checkout
        subset: v2
      weight: 10
```

## Gradually Shift Traffic

Update the VirtualService weights as confidence grows:

```bash
# Shift to 50/50
kubectl patch virtualservice checkout --type merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "checkout", "subset": "v1"}, "weight": 50},
        {"destination": {"host": "checkout", "subset": "v2"}, "weight": 50}
      ]
    }]
  }
}'
```

## Monitor Error Rates per Version

Watch Istio metrics to compare v1 and v2 error rates:

```bash
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'http://localhost:9090' \
  'sum(rate(istio_requests_total{destination_service="checkout.default.svc.cluster.local",response_code=~"5.."}[5m])) by (destination_version)'
```

## Integrate with Dapr Observability

Track Dapr-level metrics per app version using labels:

```yaml
# PromQL for Dapr invocation success rate by version
sum(rate(dapr_runtime_service_invocation_res_recv_total{app_id="checkout",status="200"}[5m])) by (pod)
```

## Complete the Rollout or Rollback

```bash
# Complete rollout to v2
kubectl patch virtualservice checkout --type merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "checkout", "subset": "v2"}, "weight": 100}
      ]
    }]
  }
}'

# Rollback to v1
kubectl patch virtualservice checkout --type merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "checkout", "subset": "v1"}, "weight": 100}
      ]
    }]
  }
}'
```

## Summary

Traffic splitting with Dapr and Istio uses Istio VirtualService weights to distribute requests across service versions while Dapr handles the application communication layer. Deploy multiple labeled versions, define DestinationRule subsets, and gradually shift VirtualService weights while monitoring Istio and Dapr metrics for error rate regressions before completing the rollout.
