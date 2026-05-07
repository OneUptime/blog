# How to Monitor etcd Health in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, etcd, Prometheus

Description: A practical guide to monitoring etcd cluster health, performance, and storage in Rancher-managed Kubernetes clusters.

etcd is the distributed key-value store that serves as the backbone of Kubernetes, storing all cluster state and configuration data. Monitoring etcd health is critical because etcd failures can bring down the entire cluster. This guide covers how to monitor etcd metrics, set up alerts, and diagnose common etcd issues in Rancher.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- A Rancher-managed RKE or RKE2 cluster (etcd metrics exposure varies by distribution).
- Cluster admin permissions.

## Step 1: Verify etcd Metrics Are Being Scraped

Rancher's monitoring stack should automatically scrape etcd metrics through PushProx. Verify this in the Prometheus UI:

1. Open Prometheus from **Monitoring > Prometheus**.
2. Navigate to **Status > Targets**.
3. Look for a target named `serviceMonitor/cattle-monitoring-system/rancher-monitoring-kube-etcd` or similar.
4. Verify the state is `UP`.

If etcd targets are not showing, check the service endpoint:

```bash
kubectl get endpoints -n kube-system -l component=etcd
```

## Step 2: Use the Built-in etcd Dashboard

Rancher includes a pre-built etcd Grafana dashboard:

1. Open Grafana from **Monitoring > Grafana**.
2. Navigate to **Dashboards > Browse**.
3. Open the **etcd** dashboard.

This dashboard shows:
- Leader elections
- Database size
- Client traffic (gRPC requests)
- Peer traffic
- Disk sync duration
- Raft proposals

## Step 3: Key etcd Metrics to Monitor

### Leader and Election Metrics

```promql
# Whether this member is the leader

etcd_server_is_leader

# Leader changes in the last hour
increase(etcd_server_leader_changes_seen_total[1h])

# Number of failed proposals
rate(etcd_server_proposals_failed_total[5m])
```

### Database Size

```promql
# Current database size in bytes
etcd_mvcc_db_total_size_in_bytes

# Logical database size in use
etcd_mvcc_db_total_size_in_use_in_bytes
```

### Request Latency

```promql
# 99th percentile gRPC request latency
histogram_quantile(0.99, sum(rate(grpc_server_handling_seconds_bucket{grpc_type="unary"}[5m])) by (le, grpc_service, grpc_method))

# Disk WAL sync duration (99th percentile)
histogram_quantile(0.99, sum(rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) by (le, instance))

# Backend commit duration (99th percentile)
histogram_quantile(0.99, sum(rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])) by (le, instance))
```

### Network Metrics

```promql
# Peer network traffic sent
rate(etcd_network_peer_sent_bytes_total[5m])

# Peer network traffic received
rate(etcd_network_peer_received_bytes_total[5m])

# Active peer connections
etcd_network_active_peers
```

### Snapshot and Compaction

```promql
# Snapshot save duration
histogram_quantile(0.99, sum(rate(etcd_debugging_snap_save_total_duration_seconds_bucket[5m])) by (le))

# Keys count
etcd_debugging_mvcc_keys_total
```

## Step 4: Set Up etcd Alerts

Create PrometheusRules for critical etcd conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: etcd-health
      rules:
        - alert: EtcdNoLeader
          expr: |
            etcd_server_has_leader == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd member {{ $labels.instance }} has no leader"
            description: "etcd member {{ $labels.instance }} does not have a leader. The cluster may be unavailable."

        - alert: EtcdFrequentLeaderChanges
          expr: |
            increase(etcd_server_leader_changes_seen_total[1h]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Frequent etcd leader changes"
            description: "etcd has seen {{ $value }} leader changes in the last hour. This may indicate network issues or resource pressure."

        - alert: EtcdHighDiskLatency
          expr: |
            histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High etcd disk latency on {{ $labels.instance }}"
            description: "99th percentile WAL fsync duration is {{ $value }}s. This may indicate disk performance issues."

        - alert: EtcdDatabaseSizeLarge
          expr: |
            etcd_mvcc_db_total_size_in_bytes > 6442450944
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd database size is large on {{ $labels.instance }}"
            description: "etcd database size is {{ $value | humanize1024 }}. Consider running compaction and defragmentation."

        - alert: EtcdHighProposalFailures
          expr: |
            rate(etcd_server_proposals_failed_total[5m]) > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "etcd proposal failures detected on {{ $labels.instance }}"
            description: "etcd is experiencing proposal failures at {{ $value }}/s."

        - alert: EtcdHighCommitDuration
          expr: |
            histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])) > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High etcd backend commit duration on {{ $labels.instance }}"
            description: "99th percentile backend commit duration is {{ $value }}s."
```

Apply the rules:

```bash
kubectl apply -f etcd-alerts.yaml
```

## Step 5: Check etcd Health via CLI

For direct etcd health checks:

```bash
# For RKE clusters
docker exec etcd etcdctl endpoint health --cluster
docker exec etcd etcdctl endpoint status --cluster --write-out=table

# For RKE2 clusters
export ETCDCTL_API=3
export PATH=$PATH:/var/lib/rancher/rke2/bin
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt
export ETCDCTL_CERT=/var/lib/rancher/rke2/server/tls/etcd/client.crt
export ETCDCTL_KEY=/var/lib/rancher/rke2/server/tls/etcd/client.key

etcdctl endpoint health --cluster
etcdctl endpoint status --cluster --write-out=table
```

The `DB SIZE` column in `endpoint status --write-out=table` shows the current database size.

## Step 6: Configure etcd Metrics Exposure

If etcd metrics are not being scraped on RKE2, use the built-in Rancher Monitoring integration instead of creating a standalone etcd `ServiceMonitor`. Rancher Monitoring scrapes etcd on RKE2 through PushProx, so verify the built-in RKE2 etcd component is enabled in your monitoring chart values:

```yaml
rke2Etcd:
  enabled: true
```

If you are scraping etcd outside Rancher Monitoring, enable metrics exposure on the RKE2 server nodes:

```yaml
# /etc/rancher/rke2/config.yaml
etcd-expose-metrics: true
```

Restart `rke2-server` after changing the server configuration. RKE2's dedicated etcd metrics port is `2381`.

## Step 7: Perform etcd Maintenance

When monitoring indicates issues, perform maintenance. Use the same container or `ETCDCTL_*` context from Step 5 for the following commands:

### Compaction

```bash
# Get the current revision
rev=$(etcdctl endpoint status --write-out="json" | jq '.[0].Status.header.revision')

# Compact up to the current revision
etcdctl compact $rev
```

### Defragmentation

```bash
etcdctl defrag --cluster
```

### Check for slow queries

Monitor the `etcd_debugging_mvcc_slow_watcher_total` metric for slow watchers that may be impacting performance.

## Summary

Monitoring etcd in Rancher involves tracking leader status, database size, disk latency, and proposal failures. Use the built-in Grafana dashboard for ongoing visibility and create PrometheusRule alerts for critical conditions like leader loss and high disk latency. Regular maintenance including compaction and defragmentation helps keep etcd healthy and performant.
