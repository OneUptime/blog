# How to Monitor Longhorn with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Prometheus, Monitoring, Kubernetes, Metric, Grafana, Observability

Description: Learn how to configure Prometheus to scrape Longhorn metrics, set up essential alerting rules for volume health, and visualize storage metrics in Grafana dashboards.

---

Longhorn exposes a Prometheus-compatible metrics endpoint that provides detailed insights into volume health, replica status, backup status, and node storage capacity.

---

## Longhorn Metrics Overview

Longhorn exposes metrics at `http://longhorn-backend.longhorn-system.svc.cluster.local:9500/metrics`. Key metrics include:

| Metric | Description |
|---|---|
| `longhorn_volume_state` | Volume state via the `state` label (`creating`, `attached`, `detached`, etc.); the current state is `1` and the others are `0` |
| `longhorn_volume_robustness` | Volume health via the `state` label (`unknown`, `healthy`, `degraded`, `faulted`); the current state is `1` and the others are `0` |
| `longhorn_node_storage_capacity_bytes` | Total storage per node |
| `longhorn_node_storage_usage_bytes` | Used storage per node |
| `longhorn_backup_state` | Backup state (0=New, 1=Pending, 2=InProgress, 3=Completed, 4=Error, 5=Unknown) |

---

## Step 1: Configure Prometheus to Scrape Longhorn

If using the Prometheus Operator (e.g., via kube-prometheus-stack), create a ServiceMonitor:

```yaml
# longhorn-servicemonitor.yaml

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: longhorn-prometheus-servicemonitor
  namespace: monitoring
  labels:
    # Must match the Prometheus selector
    release: prometheus
spec:
  selector:
    matchLabels:
      app: longhorn-manager
  endpoints:
    - port: manager
      path: /metrics
  namespaceSelector:
    matchNames:
      - longhorn-system
```

```bash
kubectl apply -f longhorn-servicemonitor.yaml
```

---

## Step 2: Create Alerting Rules

```yaml
# longhorn-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: longhorn-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: longhorn.health
      rules:
        - alert: LonghornVolumeDegraded
          expr: longhorn_volume_robustness{state="degraded"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn volume {{ $labels.volume }} is degraded"
            description: "Volume has fewer replicas than desired. Check replica health."

        - alert: LonghornVolumeFaulted
          expr: longhorn_volume_robustness{state="faulted"} == 1
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Longhorn volume {{ $labels.volume }} is FAULTED"
            description: "Volume has no healthy replicas. Data may be at risk."

        - alert: LonghornNodeStorageUsageHigh
          expr: |
            (longhorn_node_storage_usage_bytes / longhorn_node_storage_capacity_bytes) > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn node {{ $labels.node }} storage usage is above 85%"
```

---

## Step 3: Import Grafana Dashboard

Import the official Longhorn Grafana dashboard:

```bash
# Dashboard ID: 17626 (Longhorn Dashboard)
# Import via Grafana UI: Dashboards > Import > Enter ID 17626
```

Or configure it via ConfigMap if using the Grafana operator.

---

## Step 4: Key Queries for Longhorn Monitoring

Useful PromQL queries for investigating Longhorn health:

```promql
# Volume capacity utilization
sum by (volume) (longhorn_volume_actual_size_bytes) / sum by (volume) (longhorn_volume_capacity_bytes)

# Number of degraded volumes
count(longhorn_volume_robustness{state="degraded"} == 1)

# Volumes without a successful backup in the last 24 hours
(time() - longhorn_volume_last_backup_at) > 24 * 60 * 60

# Node storage trend (how fast is storage being consumed)
deriv(longhorn_node_storage_usage_bytes[1h])
```

---

## Best Practices

- Alert on `longhorn_volume_robustness{state!="healthy"} == 1` (not healthy) with a 5-minute buffer to avoid flapping.
- Monitor `longhorn_node_storage_capacity_bytes - longhorn_node_storage_usage_bytes` to predict when to add nodes.
- Set up a `dead man's switch` alert that fires if the Longhorn manager stops sending metrics.
