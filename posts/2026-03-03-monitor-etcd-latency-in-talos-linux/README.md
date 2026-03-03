# How to Monitor etcd Latency in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Latency, Monitoring, Performance Tuning

Description: A comprehensive guide to monitoring and understanding etcd latency metrics in Talos Linux for optimal Kubernetes performance.

---

etcd latency is one of the most important indicators of Kubernetes cluster health. When etcd is fast, API calls are snappy, pod scheduling is quick, and everything feels responsive. When etcd latency creeps up, the entire cluster slows down in ways that can be hard to diagnose without proper monitoring. On Talos Linux, monitoring etcd latency requires setting up external tools since the OS is immutable and does not allow direct access to nodes.

## Why Latency Matters

Every operation in Kubernetes eventually becomes an etcd operation. When you run `kubectl apply`, the API server writes to etcd. When the scheduler picks a node for a pod, it reads from etcd and writes the binding back. When a controller reconciles state, it reads and writes etcd. All of these operations are sensitive to etcd response time.

Healthy etcd latency for most operations should be under 10 milliseconds. When P99 latency exceeds 50ms, users start noticing. Above 100ms, you are in trouble territory with potential timeouts and cascading failures.

## Types of etcd Latency

There are several distinct latency metrics in etcd, each measuring a different part of the pipeline:

**Request latency** - The time to process a complete client request (read or write). This is what API server users experience.

**WAL fsync latency** - The time to write and sync the write-ahead log to disk. This is the most storage-sensitive metric.

**Backend commit latency** - The time to commit transactions to the backend BoltDB database.

**Network peer latency** - The round-trip time between etcd cluster members. This affects how quickly consensus is reached.

**Raft proposal latency** - The time from when a write is proposed to when it is committed across the cluster.

## Setting Up Prometheus for etcd Metrics

etcd in Talos Linux exposes Prometheus metrics on port 2381. To scrape these, configure a ServiceMonitor or scrape config:

```yaml
# etcd-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd-latency
  namespace: monitoring
  labels:
    release: prometheus
spec:
  endpoints:
  - port: metrics
    interval: 10s
    scheme: http
  selector:
    matchLabels:
      component: etcd
  namespaceSelector:
    matchNames:
    - kube-system
```

If etcd is not exposed as a service, create an Endpoints resource and Service manually:

```yaml
# etcd-metrics-service.yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
subsets:
- addresses:
  - ip: 192.168.1.10
  - ip: 192.168.1.11
  - ip: 192.168.1.12
  ports:
  - name: metrics
    port: 2381
    protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - name: metrics
    port: 2381
    targetPort: 2381
```

## Key Latency PromQL Queries

Once Prometheus is scraping etcd metrics, use these queries to monitor latency:

### Client Request Latency

```promql
# P50 (median) request latency for range queries
histogram_quantile(0.50,
  rate(etcd_request_duration_seconds_bucket{type="Range"}[5m])
)

# P99 request latency for range queries
histogram_quantile(0.99,
  rate(etcd_request_duration_seconds_bucket{type="Range"}[5m])
)

# P99 request latency for put (write) operations
histogram_quantile(0.99,
  rate(etcd_request_duration_seconds_bucket{type="Put"}[5m])
)

# Request rate by type
sum(rate(etcd_request_duration_seconds_count[5m])) by (type)
```

### Disk Latency

```promql
# P99 WAL fsync duration - critical for write performance
histogram_quantile(0.99,
  rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
)

# P99 backend commit duration
histogram_quantile(0.99,
  rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
)

# Average WAL fsync duration
rate(etcd_disk_wal_fsync_duration_seconds_sum[5m])
/
rate(etcd_disk_wal_fsync_duration_seconds_count[5m])
```

### Network Latency Between Peers

```promql
# P99 round-trip time between etcd peers
histogram_quantile(0.99,
  rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
)

# Network bytes sent and received between peers
rate(etcd_network_peer_sent_bytes_total[5m])
rate(etcd_network_peer_received_bytes_total[5m])

# Failed send/receive operations
rate(etcd_network_peer_sent_failures_total[5m])
rate(etcd_network_peer_received_failures_total[5m])
```

### Raft Proposal Latency

```promql
# Rate of committed proposals (healthy indicator)
rate(etcd_server_proposals_committed_total[5m])

# Rate of applied proposals
rate(etcd_server_proposals_applied_total[5m])

# Rate of failed proposals (should be near zero)
rate(etcd_server_proposals_failed_total[5m])

# Pending proposals (should be near zero in steady state)
etcd_server_proposals_pending
```

## Building a Grafana Dashboard

Create a Grafana dashboard with panels for each latency category. Here is a layout suggestion:

```
Row 1: Overview
- Current leader (single stat)
- Member count (single stat)
- Database size (gauge)
- Request rate (graph)

Row 2: Client Latency
- Range request P50/P99 (graph)
- Put request P50/P99 (graph)
- Request error rate (graph)

Row 3: Disk Latency
- WAL fsync P50/P99 (graph)
- Backend commit P50/P99 (graph)

Row 4: Network Latency
- Peer round-trip P50/P99 (graph)
- Peer traffic (bytes/sec) (graph)
- Peer failures (graph)

Row 5: Raft
- Proposals committed/applied rate (graph)
- Failed proposals (graph)
- Pending proposals (graph)
```

You can import the official etcd Grafana dashboard (ID 3070) as a starting point and customize it.

## Setting Up Latency Alerts

Configure alerting for latency thresholds:

```yaml
# etcd-latency-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-latency-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd-latency
    rules:
    - alert: EtcdHighWalFsyncLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
        ) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd WAL fsync P99 latency exceeds 10ms"
        description: "Instance {{ $labels.instance }} has P99 WAL fsync latency of {{ $value }}s"

    - alert: EtcdHighRequestLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_request_duration_seconds_bucket[5m])
        ) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd request P99 latency exceeds 50ms"

    - alert: EtcdHighPeerLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
        ) > 0.025
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd peer round-trip P99 latency exceeds 25ms"

    - alert: EtcdHighPendingProposals
      expr: etcd_server_proposals_pending > 5
      for: 3m
      labels:
        severity: warning
      annotations:
        summary: "etcd has more than 5 pending proposals"
```

## Quick Checks with talosctl

For ad-hoc latency checks without a full monitoring stack:

```bash
# Check etcd status (includes basic health indicators)
talosctl -n 192.168.1.10 etcd status

# Look for slow request warnings in etcd logs
talosctl -n 192.168.1.10 logs etcd | grep -i "slow\|took too long"

# Check for apply latency warnings
talosctl -n 192.168.1.10 logs etcd | grep "apply request took"

# Monitor etcd logs in real time for latency issues
talosctl -n 192.168.1.10 logs etcd -f | grep -i "slow\|latency\|timeout"
```

## Common Causes of High Latency

When latency alerts fire, investigate these common causes:

**Slow storage**: The number one cause. etcd needs fast storage for its WAL. If you are running on spinning disks, network-attached storage with high latency, or overprovisioned cloud volumes, etcd will be slow. Solution: move etcd to faster storage (NVMe SSD recommended).

**Network congestion**: High latency between etcd peers delays consensus. Solution: ensure etcd members are on a low-latency network, ideally the same rack or availability zone.

**Large requests**: Storing large objects in etcd (like very large ConfigMaps or Secrets) causes latency spikes. Solution: keep individual objects small and use external storage for large data.

**Too many watchers**: A large number of active watchers increases etcd memory usage and can cause garbage collection pauses. Solution: identify and reduce unnecessary watchers.

**CPU starvation**: If the etcd process does not get enough CPU time, it cannot process requests promptly. Solution: ensure etcd has dedicated CPU resources or runs on nodes with available capacity.

## Summary

Monitoring etcd latency in Talos Linux centers on setting up Prometheus to scrape the etcd metrics endpoint and building dashboards and alerts around key metrics. Focus on WAL fsync latency (storage health), request latency (user experience), and peer latency (cluster communication). When latency increases, investigate storage performance, network conditions, and resource availability. Consistent monitoring keeps you ahead of problems and ensures your Kubernetes cluster on Talos Linux stays responsive.
