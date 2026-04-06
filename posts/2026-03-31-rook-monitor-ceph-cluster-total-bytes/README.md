# How to Monitor ceph_cluster_total_bytes Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Prometheus, Metric, Cluster, Kubernetes

Description: Use ceph_cluster_total_bytes to track total raw storage capacity in your Rook-Ceph cluster, enabling capacity planning and expansion alerts.

---

## Overview

`ceph_cluster_total_bytes` reports the total raw storage capacity of the Ceph cluster across all OSDs. This is the foundational capacity metric from which utilization percentages and planning decisions are derived.

## Understanding Raw vs Usable Capacity

`ceph_cluster_total_bytes` represents raw disk capacity. Usable capacity is less due to:
- Replication factor (3x replication = 1/3 usable)
- Erasure coding overhead
- OSD reserved space (typically ~20%)

Calculate actual usable capacity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df
```

Sample output:

```text
--- RAW STORAGE ---
CLASS     SIZE    AVAIL    USED  RAW USED  %RAW USED
ssd      30 TiB  28 TiB  2 TiB    2 TiB       6.67
TOTAL    30 TiB  28 TiB  2 TiB    2 TiB       6.67
```

## Querying in Prometheus

```promql
# Total raw cluster capacity
ceph_cluster_total_bytes

# Total used bytes
ceph_cluster_total_used_bytes

# Total available bytes (free)
ceph_cluster_total_bytes - ceph_cluster_total_used_bytes

# Raw usage percentage
(ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) * 100
```

## Capacity by Device Class

Check capacity breakdown by storage class:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail | grep -E "CLASS|TOTAL"

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df tree
```

## Creating Capacity Planning Alerts

```yaml
groups:
- name: ceph-cluster-capacity
  rules:
  - alert: CephClusterNearFull
    expr: |
      (ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) * 100 > 75
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster raw storage is {{ $value | humanizePercentage }} full"
      description: "Plan OSD expansion before reaching 85%"

  - alert: CephClusterCriticalCapacity
    expr: |
      (ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) * 100 > 85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster raw storage is critically full: {{ $value | humanizePercentage }}"
```

## Growth Rate and Time-to-Full Projections

Use Prometheus to predict capacity exhaustion:

```promql
# Daily growth rate in bytes
increase(ceph_cluster_total_used_bytes[24h])

# Days until cluster is full (at current growth rate)
(ceph_cluster_total_bytes - ceph_cluster_total_used_bytes) /
  deriv(ceph_cluster_total_used_bytes[7d]) / 86400
```

## Capacity Expansion Planning

When capacity alerts fire, plan OSD expansion:

```bash
# Check current OSD count and per-OSD size
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df | tail -5

# Add more nodes or OSDs in CephCluster spec
```

```yaml
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
    - name: new-worker-4
      devices:
      - name: sdb
      - name: sdc
```

## Grafana Capacity Dashboard

```javascript
// Total capacity gauge
Query: ceph_cluster_total_bytes
Unit: bytes (auto-scale)

// Used vs free pie chart
Query A: ceph_cluster_total_used_bytes (label: "Used")
Query B: ceph_cluster_total_bytes - ceph_cluster_total_used_bytes (label: "Free")

// Capacity over time
Query: ceph_cluster_total_bytes
Overlay: ceph_cluster_total_used_bytes
```

## Summary

`ceph_cluster_total_bytes` is the denominator for all Ceph capacity calculations. Monitor it alongside `ceph_cluster_total_used_bytes` to track raw utilization, create time-series predictions for capacity planning, and alert when raw usage exceeds 75-85%. Remember that raw capacity is typically 3x your usable capacity for replicated pools.
