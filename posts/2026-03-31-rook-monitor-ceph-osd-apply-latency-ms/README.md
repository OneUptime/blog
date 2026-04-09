# How to Monitor ceph_osd_apply_latency_ms Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Latency, Prometheus, Performance, Kubernetes

Description: Track ceph_osd_apply_latency_ms to monitor OSD write performance, identify slow disks, and set latency-based alerts for Rook-Ceph clusters.

---

## Overview

`ceph_osd_apply_latency_ms` measures the time (in milliseconds) for a write operation to be applied to the OSD's journal and data store. High apply latency indicates slow disks, I/O contention, or network issues affecting write performance.

## Understanding Apply vs Commit Latency

Ceph tracks two write latency phases:

- **Apply latency** (`ceph_osd_apply_latency_ms`): Time to write to memory/journal
- **Commit latency** (`ceph_osd_commit_latency_ms`): Time to persist to disk (flush to storage)

Apply latency is typically lower than commit latency. High apply latency suggests CPU or memory pressure, while high commit latency indicates disk I/O bottlenecks.

## Checking Latency from CLI

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

Sample output:

```text
osd  commit_latency(ms)  apply_latency(ms)
  0                   5                  2
  1                   8                  3
  2                 120                 45
```

OSD 2 shows a clear performance problem.

## Querying in Prometheus

```promql
# Current apply latency for all OSDs
ceph_osd_apply_latency_ms

# Average apply latency across all OSDs
avg(ceph_osd_apply_latency_ms)

# Max apply latency (find worst OSD)
max(ceph_osd_apply_latency_ms)

# Rate of change (detecting latency spikes)
deriv(ceph_osd_apply_latency_ms[5m])
```

## Creating Alert Rules

```yaml
groups:
- name: ceph-osd-latency
  rules:
  - alert: CephOSDHighApplyLatency
    expr: ceph_osd_apply_latency_ms > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} has high apply latency: {{ $value }}ms"
      description: "Apply latency over 100ms may indicate disk or memory issues"

  - alert: CephOSDCriticalApplyLatency
    expr: ceph_osd_apply_latency_ms > 500
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} apply latency is critical: {{ $value }}ms"
```

## Identifying the Cause of High Latency

When an OSD shows high apply latency:

```bash
# Check OSD disk I/O stats
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host iostat -x 5 3

# Check for disk errors
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host dmesg | grep -E "I/O error|failed|error"

# Check SMART data for the disk
kubectl -n rook-ceph debug node/worker-1 -- \
  chroot /host smartctl -a /dev/sdb
```

Check if the OSD is on a slow device class:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata <osd-id> | grep -E "class|device"
```

## Comparing Latency Across Device Classes

Separate OSD latency by device class:

```promql
# Compare latency across device classes
ceph_osd_apply_latency_ms * on(ceph_daemon) group_left(device_class)
  ceph_osd_metadata
```

## Grafana Panel Configuration

```javascript
// Time series panel for apply latency
Query: ceph_osd_apply_latency_ms
Legend: "{{ ceph_daemon }}"
Unit: milliseconds
Thresholds: 0-20 green, 20-100 yellow, 100+ red
```

## Summary

`ceph_osd_apply_latency_ms` is the primary metric for monitoring OSD write performance. Values above 50ms warrant investigation and above 100ms require action. Use `ceph osd perf` for quick CLI inspection, Prometheus for trending and alerting, and iostat with SMART data to diagnose whether slow latency is caused by disk hardware degradation.
