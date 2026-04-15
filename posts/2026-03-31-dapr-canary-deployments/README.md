# How to Implement Dapr Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Canary Deployment, Kubernetes, Traffic Splitting, Deployment Strategy

Description: Implement canary deployments for Dapr microservices using Kubernetes weighted traffic splitting to gradually roll out new versions with automated rollback.

---

Canary deployments release a new version to a small percentage of traffic, allowing you to validate changes under real load before full rollout. Dapr's service invocation model works with canary patterns via weighted routing at the ingress or service mesh layer.

## Canary with Nginx Ingress

Use Nginx Ingress annotations to split traffic between stable and canary versions:

```yaml
# Stable ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-stable
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: api.company.com
    http:
      paths:
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service-stable
            port:
              number: 80
```

```yaml
# Canary ingress (10% of traffic)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
  - host: api.company.com
    http:
      paths:
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service-canary
            port:
              number: 80
```

## Dapr Deployment for Canary

Deploy the canary version with a different image but the same app ID:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: order-service
      track: canary
  template:
    metadata:
      labels:
        app: order-service
        track: canary
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "order-service-config"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:v1.1.0-canary
```

## Monitoring Canary Health

Compare error rates between stable and canary using deployment labels:

```bash
# Watch resource usage by deployment track
kubectl top pods -l app=order-service --sort-by=cpu

# Query Prometheus for per-version error rates
# (requires custom metric labels with track dimension)
rate(http_requests_total{
  app="order-service",
  track="canary",
  status_code!~"2.."
}[5m])
```

## Automated Canary Analysis with Argo Rollouts

Argo Rollouts automates canary progression with metrics gates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 10m}
      - setWeight: 30
      - pause: {duration: 10m}
      - setWeight: 50
      - pause: {duration: 10m}
      analysis:
        templates:
        - templateName: error-rate-check
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myrepo/order-service:v1.1.0
```

## Rollback the Canary

If the canary shows elevated error rates, roll back immediately:

```bash
# With Argo Rollouts
kubectl argo rollouts abort order-service
kubectl argo rollouts undo order-service

# With plain Kubernetes (remove canary ingress and deployment)
kubectl delete ingress order-service-canary
kubectl delete deployment order-service-canary
```

## Canary for Pub/Sub Consumers

For canary testing pub/sub consumers, ingress-based traffic splitting does not apply since messages are pushed by the broker, not routed through HTTP. With the same app ID, Dapr uses the competing consumers pattern where each message is delivered to only one instance. To test a canary consumer independently, deploy a separate app ID:

```yaml
dapr.io/app-id: "order-processor-canary"
```

And subscribe to the same topic with the canary app ID. Monitor message processing metrics separately before promoting.

## Summary

Dapr canary deployments use Kubernetes ingress weight annotations or Argo Rollouts to route a percentage of traffic to the new version. Since both stable and canary pods share the same Dapr app ID, internal service-to-service calls automatically load balance across both. Automated rollback triggers based on error rate thresholds protect production traffic during canary evaluation.
