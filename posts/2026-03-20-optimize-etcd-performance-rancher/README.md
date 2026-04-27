# How to Optimize etcd Performance for Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, etcd, Performance, Kubernetes, Storage, Tuning

Description: Optimize etcd performance for Rancher by using dedicated SSDs, tuning heartbeat and election timeouts, defragmenting regularly, and monitoring key metrics.

## Introduction

etcd is the distributed key-value store that backs all Kubernetes state, including Rancher's entire configuration. Poor etcd performance directly impacts Kubernetes API latency, controller responsiveness, and Rancher UI speed. Most etcd performance issues stem from storage latency, memory pressure, or cluster-to-cluster network latency.

## Step 1: Use Dedicated SSD Storage

etcd is sensitive to storage write latency. The recommended commit latency is under 10ms:

```bash
# Measure disk write latency on potential etcd nodes

# fio is a standard IO benchmarking tool
fio --rw=write --ioengine=sync --fdatasync=1 \
  --directory=/var/lib/etcd \
  --size=22m --bs=2300 \
  --name=etcd-write-test

# etcd is healthy if 99th percentile write latency < 10ms
# WAL fsync > 10ms will cause leader election timeouts
```

For Rancher nodes, use separate disks for etcd:

```yaml
# RKE cluster.yml - dedicated etcd disk
nodes:
  - address: 10.0.0.10
    user: ubuntu
    role: [etcd, controlplane]
    docker_socket: /var/run/docker.sock
    # Mount dedicated SSD to /var/lib/etcd
```

## Step 2: Tune Heartbeat and Election Timeouts

Default etcd timeouts are designed for LAN environments. For cross-AZ deployments:

```yaml
# RKE2 server config (/etc/rancher/rke2/config.yaml)
etcd-arg:
  - "heartbeat-interval=300"      # Default 100ms; increase for high-latency networks
  - "election-timeout=3000"        # Default 1000ms; should be 10x heartbeat-interval
  - "quota-backend-bytes=8589934592"  # 8GB database size limit
  - "auto-compaction-retention=8"  # Compact history every 8 hours
  - "auto-compaction-mode=periodic"
```

## Step 3: Configure etcd Defragmentation

etcd accumulates fragmentation over time. Schedule regular defragmentation:

```bash
#!/bin/bash
# defrag-etcd.sh - Run on each etcd node
ETCDCTL="etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/ssl/kube-ca.pem \
  --cert=/etc/kubernetes/ssl/kube-etcd.pem \
  --key=/etc/kubernetes/ssl/kube-etcd-key.pem"

# Check current DB size
echo "Before defrag:"
$ETCDCTL endpoint status --write-out=table

# Defragment (takes a few seconds, non-disruptive)
$ETCDCTL defrag

echo "After defrag:"
$ETCDCTL endpoint status --write-out=table
```

Run via a Kubernetes CronJob:

```yaml
# etcd-defrag-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-defrag
  namespace: kube-system
spec:
  schedule: "0 3 * * 0"    # Every Sunday at 3am
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
            - name: defrag
              image: rancher/hardened-etcd:v3.5.13-k3s1-build20240910
              command: ["/bin/sh", "-c", "/usr/local/bin/defrag-etcd.sh"]
```

## Step 4: Monitor etcd Metrics

Critical etcd Prometheus metrics to alert on:

```promql
# Backend DB size (alert if > 6GB with 8GB quota)
etcd_mvcc_db_total_size_in_bytes > 6000000000

# WAL fsync latency (alert if p99 > 10ms)
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.01

# Leader changes (should be rare; alert on frequent changes)
increase(etcd_server_leader_changes_seen_total[1h]) > 3

# Proposal failures (should always be 0)
rate(etcd_server_proposals_failed_total[5m]) > 0
```

## Conclusion

etcd performance is the foundation of Rancher cluster reliability. Start with SSD storage, tune timeouts to match your network latency, and implement automated defragmentation. Monitor WAL fsync latency and leader change frequency as your primary health indicators.
