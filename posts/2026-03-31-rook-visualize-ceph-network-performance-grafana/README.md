# How to Visualize Ceph Network Performance in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Network, Performance, Monitoring, Prometheus

Description: Build Grafana dashboards to visualize Ceph network throughput, latency, and error rates using Prometheus metrics from the Rook operator.

---

## Why Network Performance Matters for Ceph

Ceph is a network-intensive distributed storage system. OSD replication, client I/O, and recovery traffic all compete for bandwidth. Without visibility into network performance, slow storage is difficult to diagnose. Grafana dashboards built on Ceph's Prometheus metrics give you real-time and historical network insights.

## Key Ceph Network Metrics

Rook exposes network-related metrics through the Ceph manager's Prometheus module:

| Metric | Description |
|--------|-------------|
| `ceph_osd_op_r_out_bytes` | Bytes sent to clients for reads |
| `ceph_osd_op_w_in_bytes` | Bytes received from clients for writes |
| `ceph_osd_recovery_bytes` | Bytes moved during recovery |
| `ceph_mon_num_sessions` | Number of active monitor client sessions |
| `ceph_osd_op_latency_sum` | OSD operation latency total |

## Building a Network Throughput Panel

In Grafana, create a Time series panel with two queries:

```promql
# Client read throughput (bytes/sec)
rate(ceph_osd_op_r_out_bytes{namespace="rook-ceph"}[5m])

# Client write throughput (bytes/sec)
rate(ceph_osd_op_w_in_bytes{namespace="rook-ceph"}[5m])
```

Set the unit to **bytes/sec** and alias the series as "Read" and "Write" for clarity.

## Recovery Network Traffic Panel

Recovery traffic can saturate links during OSD failures:

```promql
# Recovery bytes sent per second
rate(ceph_osd_recovery_bytes{namespace="rook-ceph"}[5m])
```

Add a threshold at your network link's 50% capacity (e.g., 500 MB/s for a 10 GbE link) to visualize when recovery is saturating the network.

## OSD Latency Heatmap

Use a heatmap panel to visualize latency distribution across OSDs:

```promql
# Per-OSD average operation latency in milliseconds
(
  rate(ceph_osd_op_latency_sum{namespace="rook-ceph"}[5m]) /
  rate(ceph_osd_op_latency_count{namespace="rook-ceph"}[5m])
) * 1000
```

Group by `ceph_daemon` label to see which OSD is the latency outlier.

## Network Error Rate Panel

Monitor OSD read operation rates and network errors. A sudden drop in operation rate can signal connectivity problems:

```promql
# OSD read operation rate (drops may indicate network issues)
rate(ceph_osd_op_r_latency_count{namespace="rook-ceph"}[5m])
```

Combine with node exporter metrics for raw NIC statistics:

```promql
# NIC receive errors on storage nodes
rate(node_network_receive_errs_total{job="node-exporter"}[5m])
```

## Dashboard Layout Example

Organize panels into rows for clarity:

```text
Row 1: Client Network
  - Read Throughput (Time series)
  - Write Throughput (Time series)
  - Client Connections (Stat)

Row 2: Internal Cluster Network
  - Recovery Throughput (Time series)
  - Replication Bandwidth (Time series)

Row 3: Latency
  - OSD Op Latency Heatmap
  - P99 Latency by OSD (Bar chart)
```

## Provisioning the Dashboard

Export your dashboard as JSON and provision it via a ConfigMap:

```bash
kubectl create configmap ceph-network-dashboard \
  --from-file=dashboard.json=/path/to/ceph-network-dashboard.json \
  -n monitoring

# Label for Grafana sidecar discovery
kubectl label configmap ceph-network-dashboard grafana_dashboard=1 -n monitoring
```

## Summary

Grafana dashboards built on Ceph's Prometheus metrics provide deep visibility into network throughput, recovery traffic, and OSD latency. By separating client I/O from replication and recovery traffic, you can quickly identify whether network saturation is client-driven or caused by background Ceph operations. Provisioning dashboards via ConfigMaps keeps your observability setup reproducible.
