# How to Monitor Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Monitoring, Prometheus, Grafana, Hard Way

Description: A guide to monitoring Typha's health, connection counts, and policy propagation latency using Prometheus and Grafana in a manually installed Calico cluster.

---

## Introduction

Monitoring Typha in a hard way installation requires instrumenting the Typha process itself (via Prometheus metrics), setting up alerting for connection drops and high propagation latency, and creating dashboards that give operators a clear view of Typha's health relative to cluster size. Without monitoring, a degraded Typha is invisible until Felix agents start reporting stale policy state - by which time network policy may already be incorrectly enforced.

## Step 1: Enable Typha Prometheus Metrics

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_PROMETHEUSMETRICSENABLED=true \
  TYPHA_PROMETHEUSMETRICSPORT=9093
```

Expose the metrics port as a named port in the Typha Service.

```bash
kubectl patch service calico-typha -n calico-system --patch '{
  "spec": {
    "ports": [
      {"name": "calico-typha", "port": 5473, "targetPort": 5473},
      {"name": "metrics", "port": 9093, "targetPort": 9093}
    ]
  }
}'
```

## Step 2: Key Typha Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `typha_connections_active` | Current Felix connections | Should equal node count |
| `typha_connections_accepted` | Total connections accepted | Rate should be stable |
| `typha_connections_dropped` | Dropped connections | Alert if > 0 |
| `typha_updates_sent` | Policy updates fanned out | Rate tracks policy change rate |
| `typha_ping_latency` | Round-trip latency to Felix | Alert if p99 > 5s |
| `typha_snapshot_send_latency_seconds` | Time to send initial snapshot | Alert if p99 > 10s |

## Step 3: Configure Prometheus Scrape

If using Prometheus Operator:

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-typha
  namespace: calico-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      k8s-app: calico-typha
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
EOF
```

If using Prometheus with scrape configs directly:

```yaml
# prometheus.yml scrape_config addition
- job_name: 'calico-typha'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names: [calico-system]
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    regex: calico-typha
    action: keep
  - source_labels: [__address__]
    target_label: __address__
    regex: (.+):.*
    replacement: ${1}:9093
```

## Step 4: Configure Alerting Rules

```yaml
# typha-alerts.yml
groups:
- name: typha
  rules:
  - alert: TyphaConnectionDropped
    expr: increase(typha_connections_dropped[5m]) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Typha dropped Felix connections"
      description: "{{ $value }} Felix connections dropped in the last 5 minutes"

  - alert: TyphaConnectionCountLow
    expr: typha_connections_active < (kube_node_info * 0.9)
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Fewer Felix agents connected to Typha than expected"

  - alert: TyphaPingLatencyHigh
    expr: histogram_quantile(0.99, rate(typha_ping_latency_seconds_bucket[5m])) > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Typha ping latency is high"
```

## Step 5: Grafana Dashboard Key Panels

Create a Grafana dashboard with these panels:

- Active Felix connections vs. node count (target: equal)
- Policy update rate (updates/sec fanned out by Typha)
- Snapshot send latency histogram
- Connection drop rate (target: 0)
- Typha pod CPU and memory usage

Query for active connections panel:

```promql
typha_connections_active
```

Query for update rate:

```promql
rate(typha_updates_sent[5m])
```

## Step 6: Manual Health Check

```bash
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep -E "typha_connections_active|typha_connections_dropped"
```

## Conclusion

Monitoring Typha requires enabling its Prometheus metrics endpoint, scraping it with Prometheus, and alerting on connection drops, low connection counts, and high latency. These signals catch Typha degradation before it affects policy enforcement across the cluster. A Grafana dashboard combining Typha metrics with node count provides operators with an at-a-glance health view for the fan-out layer of the Calico architecture.
