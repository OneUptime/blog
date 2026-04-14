# How to Use Dapr with Kubernetes Horizontal Pod Autoscaler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, HPA, Autoscaling, Performance

Description: Configure Kubernetes HPA to autoscale Dapr-enabled applications based on CPU, memory, and custom Dapr metrics exposed via Prometheus.

---

## Autoscaling Dapr Applications

Kubernetes HPA scales your application pods based on metrics. Dapr-enabled pods work normally with HPA - when new pods are created, the Dapr sidecar is automatically injected. Each new pod registers with the Dapr control plane and can immediately participate in pub/sub and state operations.

## Basic CPU-Based HPA

```yaml
# hpa-order-service.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

```bash
kubectl apply -f hpa-order-service.yaml
kubectl get hpa order-service-hpa -w
```

## Enabling Dapr Metrics for Custom HPA

Enable Prometheus metrics on Dapr sidecars:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Scaling Based on Dapr Service Invocation Rate

Use the Prometheus Adapter to expose Dapr metrics to HPA:

```yaml
# prometheus-adapter-config.yaml
rules:
- seriesQuery: 'dapr_http_server_request_count_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    matches: "^(.*)_total"
    as: "${1}_per_second"
  metricsQuery: 'rate(dapr_http_server_request_count_total{<<.LabelMatchers>>}[2m])'
```

```yaml
# HPA using custom Dapr metric
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-rps-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: dapr_http_server_request_count_per_second
      target:
        type: AverageValue
        averageValue: 100
```

## Setting Resource Requests for HPA

HPA requires resource requests to calculate utilization percentages:

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
    spec:
      containers:
      - name: order-service
        resources:
          requests:
            cpu: "200m"
            memory: "128Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

## Monitoring HPA Scaling Events

```bash
# Watch HPA status
kubectl get hpa order-service-hpa -w

# View scaling events
kubectl describe hpa order-service-hpa

# Check pod count changes
kubectl get pods -l app=order-service -w
```

## Summary

Dapr applications work seamlessly with Kubernetes HPA since new pods automatically receive the Dapr sidecar via injection. Always set resource requests on both the app container and Dapr sidecar annotations to enable accurate CPU and memory utilization calculations. For pub/sub-driven workloads, KEDA provides more direct queue-depth-based autoscaling than HPA.
