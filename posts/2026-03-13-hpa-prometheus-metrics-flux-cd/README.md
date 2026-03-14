# How to Configure HPA Based on Prometheus Metrics with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HPA, Prometheus, Autoscaling, Kubernetes, GitOps, Prometheus Adapter

Description: Learn how to set up Horizontal Pod Autoscaler with Prometheus metrics via Prometheus Adapter using Flux CD for metrics-driven Kubernetes autoscaling.

---

## Introduction

Prometheus Adapter bridges Prometheus metrics to the Kubernetes custom and external metrics APIs, enabling HPA to scale based on any Prometheus metric. This is especially powerful for scaling on HTTP request rate, error rate, latency percentiles, or any application telemetry that Prometheus collects. Managing the full stack (Prometheus, Adapter, HPA) via Flux CD creates a complete, Git-tracked autoscaling system.

## Prerequisites

- Kubernetes cluster with Prometheus installed via kube-prometheus-stack
- Flux CD bootstrapped
- An application exposing HTTP request metrics (via Istio, NGINX ingress, or application-level instrumentation)

## Step 1: Deploy kube-prometheus-stack via Flux

```yaml
# clusters/production/infrastructure/monitoring.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "58.x.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
    prometheus:
      prometheusSpec:
        retention: 15d
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
    grafana:
      enabled: true
    alertmanager:
      enabled: true
```

## Step 2: Deploy Prometheus Adapter

```yaml
# clusters/production/infrastructure/prometheus-adapter.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus-adapter
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: prometheus-adapter
      version: "4.10.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
    prometheus:
      url: http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local
      port: 9090
    rules:
      # HTTP request rate metric (from Istio or application)
      custom:
        - seriesQuery: 'istio_requests_total{destination_workload_namespace!="",destination_workload!=""}'
          resources:
            overrides:
              destination_workload_namespace:
                resource: namespace
              destination_workload:
                resource: deployment
          name:
            matches: "istio_requests_total"
            as: "http_request_rate"
          metricsQuery: |
            rate(istio_requests_total{<<.LabelMatchers>>}[2m])

        # HTTP error rate
        - seriesQuery: 'istio_requests_total{response_code=~"5..",destination_workload!=""}'
          resources:
            overrides:
              destination_workload_namespace:
                resource: namespace
              destination_workload:
                resource: deployment
          name:
            as: "http_error_rate"
          metricsQuery: |
            rate(istio_requests_total{response_code=~"5..",<<.LabelMatchers>>}[2m])

        # P99 latency
        - seriesQuery: 'istio_request_duration_milliseconds_bucket{destination_workload!=""}'
          resources:
            overrides:
              destination_workload_namespace:
                resource: namespace
              destination_workload:
                resource: deployment
          name:
            as: "http_p99_latency_ms"
          metricsQuery: |
            histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{<<.LabelMatchers>>}[2m]))
```

## Step 3: Create HPA Based on Request Rate

```yaml
# apps/myapp/hpa-rps.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-rps-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 30
  metrics:
    # Scale based on HTTP request rate (Prometheus metric via adapter)
    - type: Object
      object:
        metric:
          name: http_request_rate
        describedObject:
          apiVersion: apps/v1
          kind: Deployment
          name: myapp
        target:
          type: Value
          value: "100"  # Scale to handle 100 RPS per pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
```

## Step 4: Create HPA Based on P99 Latency

```yaml
# apps/myapp/hpa-latency.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-latency-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 30
  metrics:
    - type: Object
      object:
        metric:
          name: http_p99_latency_ms
        describedObject:
          apiVersion: apps/v1
          kind: Deployment
          name: myapp
        target:
          type: Value
          value: "500"  # Scale up if P99 latency exceeds 500ms
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30  # Scale up aggressively on latency breach
```

## Step 5: Deploy with Flux and Validate

```yaml
# clusters/production/apps/myapp-hpa.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-hpa
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp/autoscaling
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: prometheus-adapter
    - name: kube-prometheus-stack
```

```bash
# Verify metrics are available
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/myapp/deployments/myapp/http_request_rate"

# Check HPA
kubectl describe hpa myapp-rps-hpa -n myapp

# Generate load to trigger scaling
hey -n 10000 -c 100 https://myapp.example.com/api/
```

## Best Practices

- Use `rate()` in Prometheus queries to get per-second rates; raw counters are not useful for HPA.
- Set a `[2m]` or shorter window in `rate()` queries for responsive scaling; longer windows smooth out spikes.
- Combine request rate and latency metrics in a single HPA to scale on either condition.
- Monitor Prometheus Adapter's API server request latency; it adds to HPA evaluation time.
- Use KEDA's Prometheus scaler as an alternative if Prometheus Adapter configuration feels overly complex.

## Conclusion

Prometheus-based HPA managed through Flux CD creates a sophisticated, metrics-driven autoscaling system that responds to actual user experience metrics (request rate, latency) rather than infrastructure metrics (CPU, memory). This is the foundation for Service Level Objective-driven autoscaling, where the cluster automatically maintains the performance standards your application promises to users.
