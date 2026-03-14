# How to Monitor etcd Performance in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Kubernetes, Monitoring, Performance

Description: Learn how to monitor etcd performance metrics in Talos Linux to keep your Kubernetes cluster healthy and responsive.

---

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, configuration data, secrets, and service discovery information. When etcd is slow, everything in your cluster feels slow. API calls take longer, pod scheduling stalls, and deployments time out. On Talos Linux, monitoring etcd is especially important because the OS is immutable and you cannot SSH into nodes to poke around. You need to rely on the Talos API and Kubernetes-native tools.

This guide covers how to collect, visualize, and interpret etcd performance metrics on a Talos Linux cluster.

## Why etcd Performance Matters

Every kubectl command, every pod scheduling decision, every service endpoint update - all of these go through etcd. When etcd latency spikes from its normal sub-millisecond range to tens or hundreds of milliseconds, you will notice:

- Slow API server responses
- Delayed pod scheduling
- Failing health checks
- Leader election flapping
- Timeouts during deployments

Catching these issues early through monitoring saves you from the painful experience of debugging them in production.

## Accessing etcd Metrics on Talos Linux

etcd exposes Prometheus metrics on port 2381 by default in Talos Linux. Unlike traditional setups where you might curl the metrics endpoint directly, Talos provides access through its API.

First, check that etcd is running and healthy:

```bash
# Check etcd health using talosctl
talosctl -n 192.168.1.10 etcd status

# Check etcd member list
talosctl -n 192.168.1.10 etcd members

# Get etcd alarms
talosctl -n 192.168.1.10 etcd alarm list
```

To access raw etcd metrics through the Talos API:

```bash
# Fetch etcd metrics endpoint via talosctl
talosctl -n 192.168.1.10 get etcdmembers

# You can also check etcd service status
talosctl -n 192.168.1.10 services etcd
```

## Setting Up Prometheus to Scrape etcd

The most effective way to monitor etcd on Talos Linux is through Prometheus. You will need to configure Prometheus to scrape the etcd metrics endpoint on your control plane nodes.

If you are using the Prometheus Operator (kube-prometheus-stack), create a ServiceMonitor:

```yaml
# etcd-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: monitoring
  labels:
    app: etcd
spec:
  endpoints:
  - port: metrics
    interval: 15s
    scheme: http
  selector:
    matchLabels:
      component: etcd
  namespaceSelector:
    matchNames:
    - kube-system
```

If etcd metrics are not exposed as a Kubernetes Service, you can create one manually:

```yaml
# etcd-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
spec:
  selector:
    # Talos runs etcd as a static pod on control plane nodes
    component: etcd
  ports:
  - name: metrics
    port: 2381
    targetPort: 2381
    protocol: TCP
  clusterIP: None
```

Alternatively, use a PodMonitor if you are scraping etcd pods directly:

```yaml
# etcd-pod-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: etcd
  namespace: monitoring
spec:
  podMetricsEndpoints:
  - port: metrics
    interval: 15s
  selector:
    matchLabels:
      component: etcd
  namespaceSelector:
    matchNames:
    - kube-system
```

## Key Metrics to Watch

Once Prometheus is scraping etcd, here are the critical metrics you should monitor:

### Disk Sync Duration

This is often the most important metric. It measures how long it takes etcd to sync data to disk (fsync). High values indicate slow storage:

```promql
# P99 disk sync latency - should be under 10ms
histogram_quantile(0.99,
  rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
)

# P99 backend commit duration
histogram_quantile(0.99,
  rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
)
```

If WAL fsync latency is consistently above 10ms, you likely have a storage performance problem.

### Request Latency

Track how long etcd takes to process requests:

```promql
# P99 range request latency
histogram_quantile(0.99,
  rate(etcd_request_duration_seconds_bucket{type="Range"}[5m])
)

# P99 put request latency
histogram_quantile(0.99,
  rate(etcd_request_duration_seconds_bucket{type="Put"}[5m])
)
```

### Network Peer Latency

In a multi-node etcd cluster, network latency between members matters:

```promql
# Round-trip time between etcd peers
histogram_quantile(0.99,
  rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
)

# Failed gRPC requests between peers
rate(etcd_network_peer_sent_failures_total[5m])
```

### Database Size

Track etcd database growth:

```promql
# Current database size in bytes
etcd_mvcc_db_total_size_in_bytes

# Database size in use (after compaction)
etcd_mvcc_db_total_size_in_use_in_bytes
```

### Leader Changes

Frequent leader elections indicate instability:

```promql
# Rate of leader changes - should be near 0 in steady state
rate(etcd_server_leader_changes_seen_total[1h])

# Check if this member is the leader (1 = leader)
etcd_server_is_leader
```

## Creating a Grafana Dashboard

If you are using Grafana alongside Prometheus, import a pre-built etcd dashboard or create your own. The etcd project provides an official Grafana dashboard (ID: 3070) that covers all the important metrics.

```bash
# Install kube-prometheus-stack with Grafana
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.enabled=true

# Access Grafana
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80
```

Then import dashboard ID 3070 from the Grafana dashboard marketplace.

## Setting Up Alerts

Configure alerting rules for etcd to catch problems before they become outages:

```yaml
# etcd-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd
    rules:
    - alert: EtcdHighDiskLatency
      expr: histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd WAL fsync latency is high"
        description: "P99 WAL fsync latency is above 10ms for 5 minutes"

    - alert: EtcdDatabaseSizeLarge
      expr: etcd_mvcc_db_total_size_in_bytes > 6442450944
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "etcd database size exceeds 6GB"

    - alert: EtcdFrequentLeaderChanges
      expr: increase(etcd_server_leader_changes_seen_total[1h]) > 3
      labels:
        severity: critical
      annotations:
        summary: "etcd leader changed more than 3 times in the last hour"

    - alert: EtcdHighNumberOfFailedProposals
      expr: increase(etcd_server_proposals_failed_total[1h]) > 5
      labels:
        severity: warning
      annotations:
        summary: "etcd has a high number of failed proposals"
```

## Using talosctl for Quick Checks

For quick diagnostics without a full monitoring stack, talosctl provides direct access to etcd health:

```bash
# Quick health check
talosctl -n 192.168.1.10 etcd status

# Check all control plane nodes at once
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status

# View etcd logs for error messages
talosctl -n 192.168.1.10 logs etcd --tail 100
```

## Summary

Monitoring etcd performance on Talos Linux requires setting up an external metrics collection system like Prometheus since you cannot access the nodes directly. Focus on disk sync latency, request latency, database size, and leader stability. Set up alerts for critical thresholds and use Grafana dashboards for visual monitoring. Healthy etcd means a healthy Kubernetes cluster, and on Talos Linux, proactive monitoring is your best tool for keeping things running smoothly.
