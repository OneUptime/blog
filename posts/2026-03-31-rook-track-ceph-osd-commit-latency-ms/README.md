# How to Track ceph_osd_commit_latency_ms Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Latency, Prometheus, Performance, Disk, Kubernetes

Description: Monitor ceph_osd_commit_latency_ms to measure OSD disk commit performance, identify storage bottlenecks, and alert on latency spikes in Rook-Ceph.

---

## Overview

`ceph_osd_commit_latency_ms` measures how long it takes for a write operation to be committed to persistent storage on a Ceph OSD. Unlike apply latency (memory operations), commit latency directly reflects disk I/O speed and is typically the primary bottleneck in write-heavy workloads.

## Apply vs Commit Latency

| Metric | What it Measures | Typical Cause of High Values |
|--------|-----------------|------------------------------|
| Apply latency | Write to memory/buffer | CPU bottleneck, memory pressure |
| Commit latency | Persist to disk (fsync) | Slow disk, I/O queue depth, RAID write-back |

Healthy values (on SSDs):
- Apply latency: 1-5ms
- Commit latency: 5-20ms

On HDDs, commit latency of 20-50ms can be normal.

## Checking Commit Latency

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf | sort -k3 -rn | head -10
```

## Querying in Prometheus

```promql
# Commit latency per OSD
ceph_osd_commit_latency_ms

# Worst-performing OSD
topk(5, ceph_osd_commit_latency_ms)

# Average commit latency
avg(ceph_osd_commit_latency_ms)

# Latency percentile approximation
quantile(0.95, ceph_osd_commit_latency_ms)
```

## Setting Alert Thresholds

Alert thresholds depend on your OSD device class:

```yaml
groups:
- name: ceph-commit-latency
  rules:
  - alert: CephOSDHighCommitLatency
    expr: ceph_osd_commit_latency_ms > 200
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} commit latency is {{ $value }}ms"
      description: "High commit latency may indicate disk wear or I/O saturation"

  - alert: CephOSDCriticalCommitLatency
    expr: ceph_osd_commit_latency_ms > 1000
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} commit latency critical: {{ $value }}ms"
```

## Diagnosing High Commit Latency

Check disk queue depth and I/O utilization:

```bash
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host iostat -x 2 5

# Look for disks with util% near 100% or await > 50ms
```

Check WAL (Write-Ahead Log) device performance for BlueStore:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata <osd-id> | grep -E "wal|db|device"
```

If the WAL is on the same device as the data, consider separating it:

```yaml
spec:
  storage:
    nodes:
    - name: worker-1
      devices:
      - name: sdb
        config:
          metadataDevice: nvme0n1
```

## Impact on Cluster Performance

High commit latency causes:
- Slow write acknowledgments to clients
- Increased primary OSD pressure during replication
- Cascading slow operations in `ceph health detail`

Check for slow ops related to commit:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l ceph-osd-id=0 -o jsonpath='{.items[0].metadata.name}') \
  -- ceph daemon osd.0 dump_ops_in_flight
```

## Grafana Time Series Panel

```javascript
// Show all OSD commit latencies with threshold lines
Query: ceph_osd_commit_latency_ms
Legend: {{ceph_daemon}}
Unit: ms
Alert threshold line: 200ms (warning), 1000ms (critical)
```

## Summary

`ceph_osd_commit_latency_ms` reflects real disk I/O performance and is the key metric for diagnosing storage bottlenecks in Ceph. Alert when values exceed 200ms for extended periods, investigate with iostat for disk utilization, and improve performance by placing BlueStore WAL/DB on dedicated NVMe devices separate from data disks.
