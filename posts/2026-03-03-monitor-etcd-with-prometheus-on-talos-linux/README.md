# How to Monitor etcd with Prometheus on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Prometheus, Monitoring, Kubernetes, Grafana

Description: A complete guide to monitoring etcd health and performance using Prometheus on Talos Linux Kubernetes clusters.

---

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, configuration data, and secrets. When etcd is slow or unhealthy, everything in your cluster suffers - from scheduling delays to API server timeouts. On Talos Linux, etcd runs as a system service managed by the OS itself, which makes monitoring it slightly different from clusters where etcd runs as a static pod or external deployment. This guide covers how to get etcd metrics into Prometheus and build meaningful dashboards and alerts for your Talos Linux cluster.

## Why etcd Monitoring is Critical

etcd problems are some of the hardest to debug in Kubernetes because the symptoms show up everywhere else first. API calls become slow, pods fail to schedule, config changes do not propagate. By the time you realize the root cause is etcd, you have already spent hours chasing ghosts. Proactive monitoring solves this by giving you early warnings about disk latency, leader elections, and compaction backlogs.

## How etcd Runs on Talos Linux

On Talos Linux, etcd is not a Kubernetes pod. It runs as a system service managed by Talos directly. This means you cannot just describe a pod to check its health. Instead, etcd metrics are exposed on each control plane node, typically on port 2379.

You can verify etcd is running and check its health using talosctl:

```bash
# Check etcd service status on a control plane node
talosctl service etcd --nodes 10.0.0.10

# Check etcd member list
talosctl etcd members --nodes 10.0.0.10

# Get etcd health status
talosctl etcd status --nodes 10.0.0.10
```

## Step 1: Enable etcd Metrics in Talos Configuration

By default, Talos Linux exposes etcd metrics on the listen-metrics-urls endpoint. You can verify and configure this in your Talos machine configuration:

```yaml
# talos-controlplane-patch.yaml
cluster:
  etcd:
    extraArgs:
      # Enable metrics endpoint (usually already enabled by default)
      listen-metrics-urls: http://0.0.0.0:2381
```

Apply the configuration:

```bash
# Apply patch to control plane nodes
talosctl patch machineconfig --patch @talos-controlplane-patch.yaml --nodes 10.0.0.10,10.0.0.11,10.0.0.12
```

## Step 2: Create a Service and Endpoints for etcd Metrics

Since etcd is not a Kubernetes workload, you need to create a headless Service and Endpoints resource that points to your control plane node IPs. This lets Prometheus discover and scrape etcd metrics using standard Kubernetes service discovery.

```yaml
# etcd-monitoring-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    app: etcd
    component: metrics
spec:
  clusterIP: None
  ports:
    - name: metrics
      port: 2381
      targetPort: 2381
      protocol: TCP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    app: etcd
    component: metrics
subsets:
  - addresses:
      # Replace with your control plane node IPs
      - ip: 10.0.0.10
      - ip: 10.0.0.11
      - ip: 10.0.0.12
    ports:
      - name: metrics
        port: 2381
        protocol: TCP
```

Apply these resources:

```bash
kubectl apply -f etcd-monitoring-service.yaml
```

## Step 3: Create a ServiceMonitor for Prometheus

Now create a ServiceMonitor so Prometheus Operator knows to scrape the etcd metrics endpoint:

```yaml
# etcd-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd-metrics
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      app: etcd
      component: metrics
  endpoints:
    - port: metrics
      interval: 15s
      # etcd metrics endpoint does not use TLS on the metrics port
      scheme: http
```

Apply it:

```bash
kubectl apply -f etcd-service-monitor.yaml
```

## Step 4: Verify Metrics Are Flowing

Wait a minute or two, then check Prometheus to confirm etcd metrics are being scraped:

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prometheus-prometheus 9090:9090
```

Open http://localhost:9090 and run these queries:

```promql
# Check that etcd targets are up
up{job="etcd-metrics"}

# Query etcd leader
etcd_server_is_leader

# Check total number of keys
etcd_debugging_mvcc_keys_total
```

If you see data, your etcd monitoring pipeline is working.

## Step 5: Key etcd Metrics to Track

Here are the most important etcd metrics and what they tell you:

### Cluster Health Metrics

```promql
# Is this member the leader? Should be 1 on exactly one node
etcd_server_is_leader

# Number of leader changes in the last hour (should be near zero)
increase(etcd_server_leader_changes_seen_total[1h])

# Number of active peers
etcd_server_has_leader
```

### Performance Metrics

```promql
# WAL fsync duration (disk write latency) - should be under 10ms
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# Backend commit duration - should be under 25ms
histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))

# gRPC request latency to etcd
histogram_quantile(0.99, rate(grpc_server_handling_seconds_bucket{grpc_type="unary"}[5m]))
```

### Storage Metrics

```promql
# Database size in bytes
etcd_mvcc_db_total_size_in_bytes

# Total number of keys
etcd_debugging_mvcc_keys_total

# Number of pending proposals (should stay near zero)
etcd_server_proposals_pending
```

## Step 6: Create Alerting Rules for etcd

```yaml
# etcd-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: etcd-health
      rules:
        # Alert on frequent leader elections
        - alert: EtcdHighLeaderChanges
          expr: increase(etcd_server_leader_changes_seen_total[1h]) > 3
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "etcd cluster experiencing frequent leader elections"
            description: "etcd has seen {{ $value }} leader changes in the last hour. This indicates instability, possibly due to network issues or slow disks."

        # Alert on slow disk writes
        - alert: EtcdSlowDiskWrites
          expr: histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd WAL fsync is slow on {{ $labels.instance }}"
            description: "99th percentile WAL fsync duration is {{ $value }}s. This should be under 10ms for healthy etcd performance."

        # Alert when etcd database is too large
        - alert: EtcdDatabaseSizeLarge
          expr: etcd_mvcc_db_total_size_in_bytes > 6442450944
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd database size is above 6GB on {{ $labels.instance }}"
            description: "The etcd database on {{ $labels.instance }} is {{ $value | humanize1024 }}. Consider defragmenting or investigating excessive writes."

        # Alert when proposals are failing
        - alert: EtcdProposalsFailing
          expr: increase(etcd_server_proposals_failed_total[1h]) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "etcd proposals are failing on {{ $labels.instance }}"
            description: "{{ $value }} etcd proposals have failed in the last hour. This may indicate cluster communication issues."

        # Alert when no leader is present
        - alert: EtcdNoLeader
          expr: etcd_server_has_leader == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd member {{ $labels.instance }} has no leader"
            description: "etcd member {{ $labels.instance }} does not have a leader. The cluster may be unavailable for writes."
```

Apply the alerting rules:

```bash
kubectl apply -f etcd-alerts.yaml
```

## Step 7: Import a Grafana Dashboard

The community provides an excellent etcd dashboard for Grafana. You can import it by ID:

1. Open Grafana and go to Dashboards > Import
2. Enter dashboard ID `3070` (the official etcd dashboard)
3. Select your Prometheus data source
4. Click Import

This gives you panels for request latency, leader elections, database size, network traffic between peers, and more.

## Maintenance Tasks

Keeping etcd healthy on Talos Linux involves periodic maintenance. Use talosctl for these operations:

```bash
# Defragment etcd to reclaim space after deletions
talosctl etcd defrag --nodes 10.0.0.10

# Take an etcd snapshot for backup
talosctl etcd snapshot /tmp/etcd-backup.db --nodes 10.0.0.10

# Check etcd alarm status
talosctl etcd alarm list --nodes 10.0.0.10
```

## Conclusion

Monitoring etcd on Talos Linux requires a bit of extra setup because etcd runs as a system service outside of Kubernetes. By creating headless Services, Endpoints, and ServiceMonitors, you can bridge that gap and get full etcd metrics into Prometheus. The alerting rules in this guide will catch the most common etcd failure modes early, giving you time to respond before they cascade into cluster-wide issues. Combine this with regular backups and periodic defragmentation, and your Talos Linux cluster will have a solid foundation.
