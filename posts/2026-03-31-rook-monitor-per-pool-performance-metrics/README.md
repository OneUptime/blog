# How to Monitor Per-Pool Performance Metrics in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Pool, Prometheus, Metric, Kubernetes

Description: Learn how to collect and analyze per-pool performance metrics in Ceph using built-in commands, Prometheus exporters, and Grafana dashboards.

---

## Why Per-Pool Metrics Matter

Monitoring at the cluster level tells you if something is wrong, but per-pool metrics tell you which workload is causing the problem. A single noisy tenant or misbehaving application can saturate I/O without it being obvious at the cluster level. Per-pool metrics give you the visibility needed to pinpoint and remediate issues quickly.

## Built-in Ceph Pool Statistics

The simplest way to check pool performance is directly via the Ceph tools pod:

```bash
# Show I/O statistics per pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool stats

# Show detailed per-pool storage usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

For continuous monitoring, watch the stats:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 2 ceph osd pool stats
```

## Enable the Ceph Prometheus Exporter

Rook ships with a Prometheus metrics endpoint on the MGR. Enable monitoring in the CephCluster:

```yaml
spec:
  monitoring:
    enabled: true
```

Verify the metrics endpoint:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr
curl http://<mgr-svc-ip>:9283/metrics | grep ceph_pool
```

## Key Per-Pool Prometheus Metrics

Important metrics to track:

| Metric | Description |
|---|---|
| `ceph_pool_rd` | Total read operations (counter) |
| `ceph_pool_wr` | Total write operations (counter) |
| `ceph_pool_rd_bytes` | Total bytes read (counter) |
| `ceph_pool_wr_bytes` | Total bytes written (counter) |
| `ceph_pool_bytes_used` | Space used by the pool |
| `ceph_pool_max_avail` | Available space in pool |
| `ceph_pool_objects` | Number of objects in pool |

## Sample Prometheus Queries

Track write throughput per pool over time:

```promql
rate(ceph_pool_wr_bytes[5m])
```

Alert when a pool uses more than 80% of its space:

```promql
(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) > 0.8
```

Compare read IOPS across all pools:

```promql
topk(5, rate(ceph_pool_rd[1m]))
```

## Importing the Rook Grafana Dashboard

Rook provides prebuilt Grafana dashboards for pool monitoring:

```bash
# Clone the Rook repository for dashboard JSON
git clone https://github.com/rook/rook.git
ls rook/deploy/examples/monitoring/grafana/
```

Import the `Ceph Pools Dashboard.json` dashboard into your Grafana instance. Key panels include per-pool IOPS, latency, throughput, and capacity utilization.

## Setting Up Pool-Level Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-pool-alerts
  namespace: rook-ceph
spec:
  groups:
  - name: pool-capacity
    rules:
    - alert: CephPoolNearFull
      expr: |
        (ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) > 0.75
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Ceph pool {{ $labels.name }} is {{ $value | humanizePercentage }} full"
```

## Summary

Per-pool performance monitoring in Ceph combines built-in CLI tools for immediate inspection with Prometheus metrics for long-term trending and alerting. Tracking IOPS, throughput, latency, and capacity per pool lets you quickly identify which workloads are consuming resources and prevent capacity surprises before they impact production services.
