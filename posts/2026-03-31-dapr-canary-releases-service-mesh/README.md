# How to Implement Canary Releases with Dapr and Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Canary Release, Service Mesh, Istio, Deployment

Description: Learn how to implement canary deployments for Dapr microservices using Istio header-based routing and weighted traffic splitting.

---

Canary releases route a small percentage of production traffic to a new service version, letting you validate changes with real users before full rollout. When using Dapr, the service mesh handles the network-level routing while Dapr manages application communication. This guide walks through a complete canary deployment workflow.

## What Makes Dapr Canary Deployments Different

With Dapr, service invocation uses the app-id rather than the Kubernetes service name. This means both canary and stable versions must share the same `dapr.io/app-id` so callers do not need to change. Istio then splits traffic between pods based on version labels.

## Deploy Stable and Canary Versions

```yaml
# Stable deployment (v1)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-stable
spec:
  replicas: 4
  selector:
    matchLabels:
      app: inventory
      track: stable
  template:
    metadata:
      labels:
        app: inventory
        track: stable
        version: v1
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: inventory
        image: inventory:1.5.0
```

```yaml
# Canary deployment (v2)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inventory
      track: canary
  template:
    metadata:
      labels:
        app: inventory
        track: canary
        version: v2
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: inventory
        image: inventory:2.0.0
```

## Route 20% to Canary

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: inventory
spec:
  hosts:
  - inventory
  http:
  - route:
    - destination:
        host: inventory
        subset: stable
      weight: 80
    - destination:
        host: inventory
        subset: canary
      weight: 20
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory
spec:
  host: inventory
  subsets:
  - name: stable
    labels:
      track: stable
  - name: canary
    labels:
      track: canary
```

## Use Header-Based Canary Routing for Internal Testing

Route specific users (such as internal testers) to the canary using a header:

```yaml
http:
- match:
  - headers:
      x-canary:
        exact: "true"
  route:
  - destination:
      host: inventory
      subset: canary
- route:
  - destination:
      host: inventory
      subset: stable
```

Pass the header through Dapr service invocation:

```bash
curl http://localhost:3500/v1.0/invoke/inventory/method/check \
  -H "x-canary: true"
```

## Monitor Canary Health

Watch error rate difference between tracks:

```bash
# Canary error rate
kubectl exec deploy/prometheus -n monitoring -- \
  promtool query instant 'http://localhost:9090' \
  'sum(rate(istio_requests_total{destination_version="v2",response_code=~"5.."}[5m]))'
```

Set up an automatic rollback alert:

```yaml
- alert: CanaryHighErrorRate
  expr: |
    sum(rate(istio_requests_total{destination_version="v2",response_code=~"5.."}[5m])) /
    sum(rate(istio_requests_total{destination_version="v2"}[5m])) > 0.05
  annotations:
    summary: "Canary error rate above 5%, consider rollback"
```

## Roll Back Instantly

```bash
kubectl patch virtualservice inventory --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"inventory","subset":"stable"},"weight":100}]}]}}'
```

## Summary

Canary releases with Dapr and Istio use shared Dapr app-ids across stable and canary versions, with Istio VirtualService rules controlling the traffic split. Start with a small canary percentage or header-based routing for internal testing, monitor error rates per version, and automate rollback via Prometheus alerts when canary error rates exceed thresholds.
