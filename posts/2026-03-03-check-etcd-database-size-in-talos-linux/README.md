# How to Check etcd Database Size in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Database, Monitoring, Kubernetes

Description: Learn multiple methods to check and monitor the etcd database size in Talos Linux and understand what the numbers mean.

---

The etcd database is where Kubernetes stores everything - every pod definition, every secret, every ConfigMap, every service endpoint. As your cluster grows and changes over time, this database grows too. Keeping an eye on the etcd database size is one of the simplest yet most important monitoring tasks for any Kubernetes operator. On Talos Linux, there are several ways to check the database size, each with its own advantages.

## Why Database Size Matters

etcd enforces a configurable space quota, which defaults to 2GB in upstream etcd but may be configured differently in Talos Linux (commonly 8GB). When the database reaches this quota, etcd switches to a maintenance-only mode where it rejects all new write requests. That means no new pods, no updated ConfigMaps, no changes at all until you resolve the space issue.

Even before hitting the quota, a large database affects performance. Larger databases mean slower snapshots, longer startup times after a restart, and increased memory consumption. Knowing your database size helps you plan maintenance windows and prevent emergencies.

## Method 1: Using talosctl

The most direct way to check etcd database size on Talos Linux is through talosctl:

```bash
# Check etcd status on a single control plane node
talosctl -n 192.168.1.10 etcd status

# Example output:
# MEMBER    DB SIZE  IN USE   LEADER   RAFT INDEX  RAFT TERM
# abc123    456 MB   234 MB   abc123   98765       42
```

The output shows two important size values:

- **DB SIZE** - The total size of the etcd database file on disk
- **IN USE** - The actual data size, excluding free space from deleted revisions

The difference between DB SIZE and IN USE represents space that can be reclaimed through defragmentation.

To check all control plane nodes at once:

```bash
# Check all control plane nodes simultaneously
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status
```

All members should show similar sizes. If one member has a significantly different size, it might indicate a replication issue.

## Method 2: Using etcdctl from a Pod

If you need more detailed information, you can run etcdctl from within the cluster:

```yaml
# etcd-check-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: etcd-check
  namespace: kube-system
spec:
  nodeSelector:
    node-role.kubernetes.io/control-plane: ""
  tolerations:
  - key: node-role.kubernetes.io/control-plane
    effect: NoSchedule
  hostNetwork: true
  containers:
  - name: etcdctl
    image: gcr.io/etcd-development/etcd:v3.5.12
    command: ["sleep", "1800"]
    env:
    - name: ETCDCTL_API
      value: "3"
    - name: ETCDCTL_ENDPOINTS
      value: "https://127.0.0.1:2379"
    - name: ETCDCTL_CACERT
      value: "/etc/kubernetes/pki/etcd/ca.crt"
    - name: ETCDCTL_CERT
      value: "/etc/kubernetes/pki/etcd/peer.crt"
    - name: ETCDCTL_KEY
      value: "/etc/kubernetes/pki/etcd/peer.key"
    volumeMounts:
    - name: etcd-certs
      mountPath: /etc/kubernetes/pki/etcd
      readOnly: true
  volumes:
  - name: etcd-certs
    hostPath:
      path: /system/secrets/etcd
      type: Directory
  restartPolicy: Never
```

```bash
# Deploy the check pod
kubectl apply -f etcd-check-pod.yaml

# Get endpoint status in table format
kubectl exec -n kube-system etcd-check -- etcdctl endpoint status --write-out=table

# Output includes:
# +---------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
# |         ENDPOINT          |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
# +---------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
# | https://127.0.0.1:2379    | 8e9e05c52164694d | 3.5.12  | 456 MB  |      true |      false |        42 |      98765 |              98765 |        |
# +---------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+

# Get JSON output for scripting
kubectl exec -n kube-system etcd-check -- etcdctl endpoint status --write-out=json

# Clean up when done
kubectl delete pod etcd-check -n kube-system
```

## Method 3: Using Prometheus Metrics

If you have Prometheus monitoring etcd (which you should in production), query these metrics:

```promql
# Total database size on disk (bytes)
etcd_mvcc_db_total_size_in_bytes

# Database size actually in use (bytes)
etcd_mvcc_db_total_size_in_use_in_bytes

# Space that can be reclaimed by defragmentation
etcd_mvcc_db_total_size_in_bytes - etcd_mvcc_db_total_size_in_use_in_bytes

# Database size as percentage of quota
etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes * 100
```

You can run these queries in the Prometheus UI or Grafana. The last query is particularly useful for alerting - you want to know when the database is approaching its quota.

## Method 4: Using the Kubernetes API

You can also check etcd health through the Kubernetes API server, which includes some etcd information:

```bash
# Check the kube-apiserver health endpoint
kubectl get --raw /healthz/etcd

# Check the livez endpoint for etcd-specific health
kubectl get --raw /livez/etcd
```

While these do not directly show database size, they tell you whether etcd is healthy. Combine this with the metrics approach for a complete picture.

## Understanding What Takes Up Space

To figure out what is consuming space in your etcd database, you can inspect the key distribution:

```bash
# Count keys by prefix to see what Kubernetes resources take the most space
kubectl exec -n kube-system etcd-check -- etcdctl get / --prefix --keys-only | \
  sed 's|/registry/||' | cut -d'/' -f1 | sort | uniq -c | sort -rn | head -20
```

Common space consumers include:

- **Events** - Kubernetes events are stored in etcd and can pile up quickly
- **Secrets** - Especially in clusters with many namespaces and service accounts
- **ConfigMaps** - Large ConfigMaps multiply across namespaces
- **Leases** - Node and endpoint leases
- **Pods** - Pod specs, especially in clusters with high churn

If events are the biggest consumer, consider reducing the event TTL or using an external event store.

## Setting Up Size Alerts

Create Prometheus alerting rules to catch database growth before it becomes a problem:

```yaml
# etcd-size-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-size-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd-size
    rules:
    - alert: EtcdDatabaseSizeWarning
      expr: etcd_mvcc_db_total_size_in_bytes > 4294967296
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "etcd database size exceeds 4GB"
        description: "etcd database on {{ $labels.instance }} is {{ $value | humanize1024 }}"

    - alert: EtcdDatabaseSizeCritical
      expr: etcd_mvcc_db_total_size_in_bytes > 6442450944
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "etcd database size exceeds 6GB - approaching quota"

    - alert: EtcdDatabaseFragmented
      expr: (etcd_mvcc_db_total_size_in_bytes - etcd_mvcc_db_total_size_in_use_in_bytes) / etcd_mvcc_db_total_size_in_bytes > 0.5
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "etcd database is more than 50% fragmented - defragmentation recommended"

    - alert: EtcdDatabaseQuotaApproaching
      expr: etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes > 0.8
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "etcd database is at 80% of its storage quota"
```

## Tracking Size Over Time

For capacity planning, create a Grafana dashboard that tracks etcd database size over time. This helps you understand growth patterns and predict when you will need to take action:

```promql
# Rate of database growth per day
deriv(etcd_mvcc_db_total_size_in_bytes[24h])

# Number of keys in etcd
etcd_debugging_mvcc_keys_total

# Number of revisions (indicates how much compaction could help)
etcd_debugging_mvcc_db_compaction_keys_total
```

## Quick Reference

Here is a summary of the commands you will use most often:

```bash
# Quick check with talosctl
talosctl -n <control-plane-ip> etcd status

# Detailed check with etcdctl
kubectl exec -n kube-system <etcd-pod> -- etcdctl endpoint status --write-out=table

# Prometheus query for current size
# etcd_mvcc_db_total_size_in_bytes

# Check space quota
# etcd_server_quota_backend_bytes
```

## Summary

Checking the etcd database size in Talos Linux is straightforward with multiple approaches available. Use talosctl for quick checks, etcdctl for detailed inspection, and Prometheus for continuous monitoring. The key numbers to watch are the total database size, the in-use size, and how close you are to the space quota. Set up alerts at 80% quota utilization, and schedule regular compaction and defragmentation to keep the database lean. A well-monitored etcd database is a reliable etcd database.
