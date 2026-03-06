# How to Monitor Flux CD Controller Queue Depth

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Monitoring, Queue Depth, Prometheus, Grafana, Performance, Observability

Description: Learn how to monitor Flux CD controller work queue depths to detect bottlenecks, prevent reconciliation delays, and optimize controller performance.

---

## Introduction

Flux CD controllers use internal work queues to process reconciliation requests. When these queues grow too deep, reconciliation latency increases and deployments can stall. Monitoring queue depth is essential for understanding controller health and identifying performance bottlenecks. This guide covers how to expose, monitor, and alert on Flux CD controller queue metrics.

## Understanding Flux CD Controller Queues

Flux CD consists of several controllers, each with its own work queue:

- **source-controller** - Fetches artifacts from Git repositories, Helm repositories, and OCI registries
- **kustomize-controller** - Applies Kustomize overlays and plain Kubernetes manifests
- **helm-controller** - Manages Helm chart installations and upgrades
- **notification-controller** - Handles alerts and webhook receivers
- **image-reflector-controller** - Scans container registries for new tags
- **image-automation-controller** - Updates Git repositories with new image references

Each controller exposes Prometheus metrics including work queue depth, processing latency, and retry counts.

## Enabling Metrics Collection

### Verify Metrics Are Exposed

```bash
# Check that each controller exposes metrics on port 8080
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].ports[*].containerPort}{"\n"}{end}'

# Port-forward to check metrics directly
kubectl port-forward -n flux-system deploy/source-controller 8080:8080 &

# Query the metrics endpoint
curl -s http://localhost:8080/metrics | grep workqueue
```

### Configure ServiceMonitor for Prometheus

```yaml
# flux-service-monitors.yaml
# ServiceMonitor for all Flux CD controllers
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    # Match your Prometheus operator selector
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  namespaceSelector:
    matchNames:
      - flux-system
  endpoints:
    - port: http-prom
      # Scrape every 15 seconds for timely queue monitoring
      interval: 15s
      path: /metrics
      # Relabel to add controller name as a label
      relabelings:
        - sourceLabels: [__meta_kubernetes_pod_label_app]
          targetLabel: controller
```

### PodMonitor Alternative

```yaml
# flux-pod-monitors.yaml
# Use PodMonitor if services are not configured
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-controllers
  namespace: flux-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  podMetricsEndpoints:
    - port: http-prom
      interval: 15s
      path: /metrics
```

## Key Queue Metrics to Monitor

### Work Queue Depth

The primary metric for queue depth:

```promql
# Current queue depth for each controller
workqueue_depth{namespace="flux-system"}

# Queue depth by controller name
workqueue_depth{namespace="flux-system", name=~".*"}
```

### Queue Latency

How long items wait in the queue before processing:

```promql
# Average time items spend in queue (seconds)
rate(workqueue_queue_duration_seconds_sum{namespace="flux-system"}[5m])
/
rate(workqueue_queue_duration_seconds_count{namespace="flux-system"}[5m])

# 95th percentile queue wait time
histogram_quantile(0.95,
  rate(workqueue_queue_duration_seconds_bucket{namespace="flux-system"}[5m])
)
```

### Work Duration

Time spent processing each item:

```promql
# Average processing time per item
rate(workqueue_work_duration_seconds_sum{namespace="flux-system"}[5m])
/
rate(workqueue_work_duration_seconds_count{namespace="flux-system"}[5m])

# 99th percentile processing time
histogram_quantile(0.99,
  rate(workqueue_work_duration_seconds_bucket{namespace="flux-system"}[5m])
)
```

### Queue Additions Rate

How quickly new items are being added:

```promql
# Rate of items added to each queue per second
rate(workqueue_adds_total{namespace="flux-system"}[5m])
```

### Retry Count

Items that failed and were re-queued:

```promql
# Rate of retries per controller
rate(workqueue_retries_total{namespace="flux-system"}[5m])
```

## Setting Up Prometheus Alerting Rules

```yaml
# flux-queue-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-queue-depth-alerts
  namespace: flux-system
  labels:
    release: prometheus
spec:
  groups:
    - name: flux-controller-queues
      rules:
        # Alert when queue depth stays high for sustained period
        - alert: FluxControllerQueueDepthHigh
          expr: |
            workqueue_depth{namespace="flux-system"} > 50
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller queue depth is high"
            description: >
              Controller {{ $labels.name }} in namespace {{ $labels.namespace }}
              has a queue depth of {{ $value }}. This indicates the controller
              cannot keep up with reconciliation requests.

        # Alert when queue depth is critically high
        - alert: FluxControllerQueueDepthCritical
          expr: |
            workqueue_depth{namespace="flux-system"} > 200
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Flux controller queue depth is critically high"
            description: >
              Controller {{ $labels.name }} has {{ $value }} items in queue.
              Immediate action required to prevent reconciliation delays.

        # Alert when queue latency is too high
        - alert: FluxControllerQueueLatencyHigh
          expr: |
            histogram_quantile(0.95,
              rate(workqueue_queue_duration_seconds_bucket{namespace="flux-system"}[5m])
            ) > 60
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller queue latency is high"
            description: >
              Items in {{ $labels.name }} queue are waiting over 60 seconds
              before being processed. P95 latency: {{ $value }}s.

        # Alert on high retry rate (indicates processing errors)
        - alert: FluxControllerHighRetryRate
          expr: |
            rate(workqueue_retries_total{namespace="flux-system"}[5m]) > 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller retry rate is elevated"
            description: >
              Controller {{ $labels.name }} is retrying at {{ $value }} items/s.
              This may indicate upstream errors causing reconciliation failures.

        # Alert when queue is growing faster than draining
        - alert: FluxControllerQueueGrowing
          expr: |
            deriv(workqueue_depth{namespace="flux-system"}[10m]) > 0.5
          for: 20m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller queue is growing"
            description: >
              Queue for {{ $labels.name }} is consistently growing.
              Rate of change: {{ $value }} items/second.
```

## Building a Grafana Dashboard

### Queue Depth Overview Panel

```json
{
  "title": "Flux Controller Queue Depths",
  "type": "timeseries",
  "datasource": "Prometheus",
  "targets": [
    {
      "expr": "workqueue_depth{namespace=\"flux-system\"}",
      "legendFormat": "{{ name }}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          { "value": 0, "color": "green" },
          { "value": 50, "color": "yellow" },
          { "value": 200, "color": "red" }
        ]
      }
    }
  }
}
```

### Complete Dashboard ConfigMap

```yaml
# grafana-flux-queue-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-queue-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  flux-queue-depth.json: |
    {
      "dashboard": {
        "title": "Flux CD Controller Queue Monitoring",
        "panels": [
          {
            "title": "Queue Depth by Controller",
            "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
            "type": "timeseries",
            "targets": [
              {
                "expr": "workqueue_depth{namespace='flux-system'}",
                "legendFormat": "{{ name }}"
              }
            ]
          },
          {
            "title": "Queue Latency P95 (seconds)",
            "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
            "type": "timeseries",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(workqueue_queue_duration_seconds_bucket{namespace='flux-system'}[5m]))",
                "legendFormat": "{{ name }}"
              }
            ]
          },
          {
            "title": "Items Added per Second",
            "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
            "type": "timeseries",
            "targets": [
              {
                "expr": "rate(workqueue_adds_total{namespace='flux-system'}[5m])",
                "legendFormat": "{{ name }}"
              }
            ]
          },
          {
            "title": "Retry Rate per Second",
            "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
            "type": "timeseries",
            "targets": [
              {
                "expr": "rate(workqueue_retries_total{namespace='flux-system'}[5m])",
                "legendFormat": "{{ name }}"
              }
            ]
          },
          {
            "title": "Processing Duration P99 (seconds)",
            "gridPos": { "x": 0, "y": 16, "w": 12, "h": 8 },
            "type": "timeseries",
            "targets": [
              {
                "expr": "histogram_quantile(0.99, rate(workqueue_work_duration_seconds_bucket{namespace='flux-system'}[5m]))",
                "legendFormat": "{{ name }}"
              }
            ]
          },
          {
            "title": "Current Queue Depth (Gauge)",
            "gridPos": { "x": 12, "y": 16, "w": 12, "h": 8 },
            "type": "gauge",
            "targets": [
              {
                "expr": "workqueue_depth{namespace='flux-system'}",
                "legendFormat": "{{ name }}"
              }
            ]
          }
        ]
      }
    }
```

## Diagnosing Queue Depth Issues

### Check Controller Resource Utilization

```bash
# Check CPU and memory usage of Flux controllers
kubectl top pods -n flux-system

# Check if controllers are being throttled
kubectl describe pod -n flux-system -l app=source-controller | grep -A 5 "Resources:"

# Check for OOMKills or restarts
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

### Scale Controller Resources

```yaml
# flux-controller-resources.yaml
# Patch Flux controllers with increased resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Increase CPU to process queue items faster
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          args:
            # Increase concurrent reconciliations to drain queue faster
            - --concurrent=10
            # Set events per second rate limit for the controller
            - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
            - --watch-all-namespaces=true
```

### Increase Controller Concurrency

```yaml
# kustomization-patch-concurrency.yaml
# Apply this via Flux bootstrap kustomization
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Increase source-controller concurrency
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=10
  # Increase kustomize-controller concurrency
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=10
  # Increase helm-controller concurrency
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=10
```

## Automating Queue Depth Response

### Horizontal Pod Autoscaling for Controllers

```yaml
# flux-controller-hpa.yaml
# Note: HPA for Flux controllers requires careful consideration
# Only use if queue depth is consistently high
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: source-controller
  namespace: flux-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: source-controller
  minReplicas: 1
  maxReplicas: 3
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on custom queue depth metric
    - type: Pods
      pods:
        metric:
          name: workqueue_depth
        target:
          type: AverageValue
          averageValue: "50"
```

## Best Practices Summary

1. **Set up ServiceMonitors** - Ensure all Flux controllers are scraped by Prometheus
2. **Monitor queue depth continuously** - Use dashboards to visualize queue trends
3. **Alert on sustained high depth** - Brief spikes are normal; sustained growth is not
4. **Increase concurrency** - Use the `--concurrent` flag to process more items in parallel
5. **Allocate sufficient resources** - CPU-starved controllers process queues slowly
6. **Watch retry rates** - High retries indicate upstream issues, not just load
7. **Correlate with reconciliation intervals** - Shorter intervals create more queue pressure
8. **Review during scale events** - Adding many new resources will spike queue depth

## Conclusion

Monitoring Flux CD controller queue depth provides critical visibility into the health and performance of your GitOps pipeline. By setting up Prometheus metrics collection, building Grafana dashboards, and configuring alerting rules, you can detect bottlenecks early and take corrective action before reconciliation delays impact your deployments. The key is to treat queue depth as a leading indicator of controller health and respond proactively to sustained growth trends.
