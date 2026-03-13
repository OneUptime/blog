# How to Monitor Shard Controller Queue Depth in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Monitoring, Prometheus, Grafana

Description: Learn how to monitor Flux shard controller queue depth using Prometheus metrics and Grafana dashboards to ensure balanced workloads.

---

## Introduction

When running multiple Flux controller shards, monitoring queue depth is essential for detecting imbalances and ensuring each shard is processing its workload efficiently. Queue depth indicates how many resources are waiting to be reconciled. A growing queue suggests the controller cannot keep up with its assigned workload.

## Prerequisites

- A running Kubernetes cluster with Flux bootstrapped
- Multiple controller shard instances deployed
- Prometheus installed in the cluster
- Grafana installed (optional, for dashboards)

## Understanding Controller Metrics

Flux controllers expose Prometheus metrics on port 8080 at the `/metrics` endpoint. The key metrics for queue monitoring are:

- `controller_runtime_reconcile_total` - Total number of reconciliations
- `controller_runtime_reconcile_time_seconds` - Time spent on reconciliations
- `workqueue_depth` - Current number of items in the work queue
- `workqueue_adds_total` - Total items added to the work queue
- `workqueue_queue_duration_seconds` - Time items spend waiting in the queue

## Step 1: Expose Metrics from Shard Controllers

Ensure each shard deployment has the Prometheus annotations and the metrics port configured.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard-1
  namespace: flux-system
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: manager
          ports:
            - containerPort: 8080
              name: http-prom
              protocol: TCP
```

## Step 2: Configure Prometheus ServiceMonitor

If using the Prometheus Operator, create ServiceMonitors for each shard.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-controller-shards
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux-shards
  endpoints:
    - port: http-prom
      interval: 15s
      path: /metrics
---
apiVersion: v1
kind: Service
metadata:
  name: kustomize-controller-shard-1-metrics
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux-shards
spec:
  selector:
    app: kustomize-controller-shard-1
  ports:
    - name: http-prom
      port: 8080
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: kustomize-controller-shard-2-metrics
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux-shards
spec:
  selector:
    app: kustomize-controller-shard-2
  ports:
    - name: http-prom
      port: 8080
      targetPort: 8080
```

## Step 3: Query Queue Depth Metrics

Use PromQL to query queue depth across all shards.

```promql
# Current queue depth per shard controller
workqueue_depth{namespace="flux-system", job=~".*shard.*"}

# Queue depth by controller name
workqueue_depth{namespace="flux-system"} > 0

# Rate of items added to the queue per second
rate(workqueue_adds_total{namespace="flux-system"}[5m])

# Average queue wait time per shard
rate(workqueue_queue_duration_seconds_sum{namespace="flux-system"}[5m])
/
rate(workqueue_queue_duration_seconds_count{namespace="flux-system"}[5m])
```

## Step 4: Create Prometheus Alerting Rules

Set up alerts to notify you when queue depth exceeds acceptable thresholds.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-shard-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-shard-queue
      rules:
        - alert: FluxShardQueueDepthHigh
          expr: workqueue_depth{namespace="flux-system"} > 50
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux shard controller queue depth is high"
            description: "Controller {{ $labels.pod }} has a queue depth of {{ $value }} for more than 10 minutes."

        - alert: FluxShardQueueDepthCritical
          expr: workqueue_depth{namespace="flux-system"} > 100
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux shard controller queue depth is critical"
            description: "Controller {{ $labels.pod }} has a queue depth of {{ $value }}. Consider adding more shards."

        - alert: FluxShardReconciliationSlow
          expr: |
            histogram_quantile(0.99,
              rate(controller_runtime_reconcile_time_seconds_bucket{namespace="flux-system"}[5m])
            ) > 300
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux shard reconciliation is slow"
            description: "99th percentile reconciliation time for {{ $labels.pod }} exceeds 5 minutes."

        - alert: FluxShardQueueImbalanced
          expr: |
            max(workqueue_depth{namespace="flux-system", job=~".*shard.*"})
            /
            (avg(workqueue_depth{namespace="flux-system", job=~".*shard.*"}) + 1)
            > 3
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux shard queue depths are imbalanced"
            description: "One shard has 3x the queue depth of the average. Consider rebalancing."
```

## Step 5: Create a Grafana Dashboard

Build a dashboard to visualize shard performance.

```json
{
  "dashboard": {
    "title": "Flux Controller Shards",
    "panels": [
      {
        "title": "Queue Depth by Shard",
        "type": "timeseries",
        "targets": [
          {
            "expr": "workqueue_depth{namespace='flux-system'}",
            "legendFormat": "{{ pod }}"
          }
        ]
      },
      {
        "title": "Reconciliation Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(controller_runtime_reconcile_total{namespace='flux-system'}[5m])",
            "legendFormat": "{{ pod }} - {{ result }}"
          }
        ]
      },
      {
        "title": "Reconciliation Duration (p99)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(controller_runtime_reconcile_time_seconds_bucket{namespace='flux-system'}[5m]))",
            "legendFormat": "{{ pod }}"
          }
        ]
      },
      {
        "title": "Queue Wait Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(workqueue_queue_duration_seconds_sum{namespace='flux-system'}[5m]) / rate(workqueue_queue_duration_seconds_count{namespace='flux-system'}[5m])",
            "legendFormat": "{{ pod }}"
          }
        ]
      }
    ]
  }
}
```

## Step 6: Monitor from the Command Line

For quick checks without Grafana, query metrics directly.

```bash
# Port-forward to a shard controller's metrics endpoint
kubectl port-forward deployment/kustomize-controller-shard-1 \
  -n flux-system 8080:8080 &

# Query queue depth
curl -s http://localhost:8080/metrics | grep workqueue_depth

# Query reconciliation counts
curl -s http://localhost:8080/metrics | grep controller_runtime_reconcile_total

# Kill the port-forward
kill %1
```

## Key Metrics to Watch

| Metric | Healthy Value | Action When Exceeded |
|--------|--------------|---------------------|
| `workqueue_depth` | < 20 | Increase `--concurrent` or add shards |
| Queue wait time | < 30s | Increase `--concurrent` |
| Reconciliation duration (p99) | < 5m | Check resource constraints, network |
| Reconciliation errors | < 5% | Investigate failing resources |
| Queue depth ratio (max/avg) | < 2x | Rebalance shard assignments |

## Best Practices

- Set up alerts before deploying shards to production
- Monitor queue depth trends over time, not just point-in-time values
- Compare shard metrics side by side to detect imbalances early
- Include shard metrics in your on-call runbooks
- Review queue depth after adding or removing resources from shards

## Conclusion

Monitoring queue depth across Flux shard controllers is essential for maintaining healthy reconciliation performance. By combining Prometheus metrics, alerting rules, and Grafana dashboards, you can proactively detect overloaded shards and rebalance workloads before they impact deployment velocity. Regular monitoring ensures your sharding strategy continues to work as your cluster grows.
