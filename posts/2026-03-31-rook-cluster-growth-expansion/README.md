# How to Plan for Ceph Cluster Growth and Expansion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Growth, Expansion, Capacity Planning, Scaling, Infrastructure

Description: Plan for Ceph cluster growth by projecting data growth rates, understanding expansion constraints, and designing a scalable architecture that supports online expansion.

---

## Overview

Ceph supports online expansion by adding OSDs and nodes while the cluster is serving data. However, successful growth requires planning the initial architecture to accommodate expansion without performance degradation or architectural rework.

## Step 1 - Measure Current Growth Rate

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Check current usage
ceph df

# Check historical usage trends from Prometheus
# Query: ceph_cluster_total_used_bytes over 30 days
```

Calculate growth rate:

```bash
# Example: 50 TB used 30 days ago, 65 TB today
PREV=50  # TB
CURR=65  # TB
DAYS=30

DAILY_GROWTH=$(echo "scale=2; ($CURR - $PREV) / $DAYS" | bc)
echo "Daily growth: ${DAILY_GROWTH} TB/day"

MONTHLY_GROWTH=$(echo "scale=1; $DAILY_GROWTH * 30" | bc)
echo "Monthly growth: ${MONTHLY_GROWTH} TB/month"
```

## Step 2 - Project Capacity Needs

```bash
#!/bin/bash
CURRENT_USABLE=200  # TB
MONTHLY_GROWTH=15   # TB
MONTHS_AHEAD=24
MAX_UTILIZATION=0.8

PROJECTED=$(echo "$CURRENT_USABLE + ($MONTHLY_GROWTH * $MONTHS_AHEAD)" | bc)
NEEDED=$(echo "scale=0; $PROJECTED / $MAX_UTILIZATION" | bc)

echo "Projected usable in ${MONTHS_AHEAD} months: ${PROJECTED} TB"
echo "Raw capacity needed: ${NEEDED} TB"
```

## Step 3 - Design for Incremental Expansion

Plan expansion in consistent units (add nodes rather than individual disks):

```yaml
# Initial deployment: 3 nodes
initial_cluster:
  nodes: 3
  osds_per_node: 8
  disk_size_tb: 12
  raw_tb: 288
  usable_tb: 96  # 3x replication

# First expansion: add 3 nodes (6 months)
expansion_1:
  add_nodes: 3
  new_total_nodes: 6
  new_raw_tb: 576
  new_usable_tb: 192

# Second expansion: add 3 more nodes (12 months)
expansion_2:
  add_nodes: 3
  new_total_nodes: 9
  new_raw_tb: 864
  new_usable_tb: 288
```

## Step 4 - CRUSH Map Design for Future Growth

Design CRUSH rules that will work for your target cluster size:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Check current CRUSH tree
ceph osd tree

# CRUSH rule for rack-level fault domains (future-proof)
ceph osd crush rule create-replicated replicated_rule default rack
```

If you plan to expand to rack-level fault domains, start with `rack` as the failure domain now:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
spec:
  failureDomain: rack
  replicated:
    size: 3
    requireSafeReplicaSize: true
  crushRoot: default
  deviceClass: hdd
```

## Step 5 - Add New OSD Nodes (Online Expansion)

When adding capacity, update the Rook CephCluster spec:

```yaml
spec:
  storage:
    nodes:
      - name: osd-node-1
        # existing node
      - name: osd-node-4  # NEW
        devices:
          - name: sda
          - name: sdb
```

```bash
kubectl apply -f cephcluster.yaml

# Watch the new OSDs come up
kubectl -n rook-ceph get pods -w | grep osd
```

## Step 6 - Monitor Rebalancing After Expansion

```bash
# Watch PG rebalancing progress
watch -n5 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status"

# Check data migration rate
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool stats
```

Throttle rebalancing to reduce impact on clients:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd set-backfillfull-ratio 0.85
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1
```

## Step 7 - Capacity Forecast Dashboard

Configure Grafana alerts for capacity projection:

```yaml
# Prometheus rule for capacity forecast
- alert: CephCapacityProjected80Percent
  expr: |
    predict_linear(ceph_cluster_total_used_bytes[7d], 30*24*3600)
    / ceph_cluster_total_bytes > 0.8
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Ceph cluster projected to reach 80% in 30 days"
```

## Summary

Successful Ceph growth planning starts with measuring actual data growth rates and projecting forward with a utilization buffer. Designing your initial CRUSH topology to match your eventual fault domain strategy avoids costly migration later. Adding nodes in consistent increments (rather than individual disks) keeps the cluster balanced and makes capacity planning predictable.
