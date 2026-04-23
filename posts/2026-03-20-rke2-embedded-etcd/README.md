# How to Configure RKE2 with Embedded etcd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, etcd, Embedded etcd, Configuration, Rancher

Description: Learn how to configure and optimize RKE2's embedded etcd cluster for production Kubernetes deployments with automated snapshots and monitoring.

RKE2's embedded etcd is the default and most commonly used storage backend. It runs etcd as an integrated component of the RKE2 server, simplifying operations while still providing all the benefits of a clustered etcd for HA deployments. This guide covers how to properly configure, tune, and maintain the embedded etcd in RKE2.

## Prerequisites

- RKE2 installed on server nodes
- Minimum 3 server nodes for embedded etcd HA
- SSDs recommended for etcd data directory
- Adequate disk space for etcd data and snapshots

## Understanding Embedded etcd in RKE2

RKE2's embedded etcd provides:
- Automatic cluster formation across server nodes
- Integrated certificate management
- Automated snapshot capabilities
- Self-healing etcd cluster management

## Step 1: Configure Embedded etcd

```yaml
# /etc/rancher/rke2/config.yaml - etcd configuration

# =====================

# ETCD SNAPSHOT CONFIGURATION
# =====================

# Enable automatic periodic snapshots
# This is enabled by default in RKE2
etcd-snapshot-schedule-cron: "0 */6 * * *"  # Every 6 hours

# Number of local scheduled snapshots to retain
etcd-snapshot-retention: 10

# Directory for storing snapshots
# Default: /var/lib/rancher/rke2/server/db/snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots

# Store snapshots in S3 (recommended for production)
# etcd-s3: true
# etcd-s3-endpoint: s3.amazonaws.com
# etcd-s3-access-key: YOUR_ACCESS_KEY
# etcd-s3-secret-key: YOUR_SECRET_KEY
# etcd-s3-bucket: my-etcd-snapshots
# etcd-s3-region: us-east-1
# etcd-s3-retention: 10

# =====================
# ETCD PERFORMANCE TUNING
# =====================

etcd-arg:
  # Increase heartbeat interval for high-latency networks
  # Default is 100ms; increase for cross-region deployments
  - "heartbeat-interval=300"

  # Increase election timeout proportionally (10x heartbeat)
  - "election-timeout=3000"

  # Set maximum database size (default: 2GB)
  # Increase for larger clusters
  - "quota-backend-bytes=8589934592"  # 8 GB

  # Auto-compaction
  - "auto-compaction-mode=revision"
  - "auto-compaction-retention=1000"
```

## Step 2: Configure S3 Snapshot Storage

```yaml
# /etc/rancher/rke2/config.yaml - S3 snapshot configuration
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10

# S3 configuration for off-node snapshot storage
etcd-s3: true
etcd-s3-endpoint: s3.amazonaws.com
etcd-s3-region: us-east-1
etcd-s3-bucket: my-cluster-etcd-snapshots
etcd-s3-retention: 10

# S3 credentials (prefer IAM role instead of access keys)
# etcd-s3-access-key: YOUR_ACCESS_KEY
# etcd-s3-secret-key: YOUR_SECRET_KEY

# Optional: Use a specific S3-compatible endpoint (MinIO, etc.)
# etcd-s3-endpoint: minio.internal.example.com
# etcd-s3-endpoint-ca: /etc/ssl/certs/minio-ca.crt
# etcd-s3-skip-ssl-verify: false

# Folder prefix for snapshots
etcd-s3-folder: my-cluster
```

## Step 3: Manage etcd Snapshots

```bash
# Take a manual snapshot
sudo rke2 etcd-snapshot save \
  --name manual-snapshot-$(date +%Y%m%d-%H%M%S)

# List available snapshots (local)
sudo rke2 etcd-snapshot list

# List snapshots in S3 (if configured)
sudo rke2 etcd-snapshot ls --s3 \
  --s3-bucket my-cluster-etcd-snapshots \
  --s3-region us-east-1

# Check local snapshot files and sizes
ls -lh /var/lib/rancher/rke2/server/db/snapshots/
```

## Step 4: Monitor etcd Health

```bash
# Use etcdctl to check etcd cluster health
# RKE2 includes etcdctl in the bin directory
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt
export ETCDCTL_CERT=/var/lib/rancher/rke2/server/tls/etcd/client.crt
export ETCDCTL_KEY=/var/lib/rancher/rke2/server/tls/etcd/client.key

# Check cluster health
/var/lib/rancher/rke2/bin/etcdctl endpoint health

# List etcd members
/var/lib/rancher/rke2/bin/etcdctl member list

# Check etcd status (includes database size, leader info)
/var/lib/rancher/rke2/bin/etcdctl endpoint status \
  --write-out=table

# Check alarms (like no space alarm)
/var/lib/rancher/rke2/bin/etcdctl alarm list
```

## Step 5: etcd Maintenance Operations

```bash
# Defragment etcd database (reduces disk usage)
# Run on each member separately
/var/lib/rancher/rke2/bin/etcdctl defrag \
  --endpoints=https://127.0.0.1:2379

# Compact revisions to reclaim space
# Get the current revision
REV=$(/var/lib/rancher/rke2/bin/etcdctl \
  endpoint status --write-out=json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  print(d[0]['Status']['header']['revision'])")

echo "Current revision: $REV"

# Compact to current revision
/var/lib/rancher/rke2/bin/etcdctl compact $REV

# Defragment after compaction
/var/lib/rancher/rke2/bin/etcdctl defrag

# Disarm any alarms
/var/lib/rancher/rke2/bin/etcdctl alarm disarm
```

## Step 6: etcd Monitoring with Prometheus

```yaml
# prometheus-etcd-rules.yaml - Alert on etcd health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: etcd
    rules:
    - alert: EtcdInsufficientMembers
      expr: count(up{job="etcd"} == 0) > (count(up{job="etcd"}) / 2 - 1)
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "Etcd cluster has insufficient members"

    - alert: EtcdHighCommitDurations
      expr: histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])) > 0.25
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Etcd commit duration is high"

    - alert: EtcdHighDatabaseSize
      expr: etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Etcd database is over 80% of quota"
```

## Conclusion

RKE2's embedded etcd simplifies Kubernetes cluster management by automating many operational tasks that standalone etcd requires. By configuring appropriate snapshot schedules, S3 backup storage, and Prometheus monitoring, you can run a reliable embedded etcd cluster in production. Regular maintenance tasks like defragmentation and compaction should be scheduled during low-traffic windows to maintain etcd performance as your cluster grows.
