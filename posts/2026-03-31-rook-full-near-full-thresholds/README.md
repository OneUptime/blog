# How to Set Full and Near-Full Thresholds in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Threshold, Monitoring, Configuration, Alert

Description: Configure Ceph full and near-full OSD thresholds to get early warnings before capacity exhaustion prevents writes, and understand the consequences of hitting each threshold level.

---

## Overview

Ceph has built-in capacity thresholds that trigger warnings and eventually block writes when OSDs fill up. Understanding and properly configuring these thresholds prevents surprise outages caused by full cluster conditions.

## Ceph Threshold Levels

```text
nearfull_ratio (default: 0.85)
  - HEALTH_WARN state
  - Alerts issued, writes still work normally

full_ratio (default: 0.95)
  - HEALTH_ERR state
  - Ceph stops accepting new writes
  - Existing data not affected

backfillfull_ratio (default: 0.90)
  - Prevents backfill operations
  - OSD won't receive more PGs during recovery
```

## Step 1 - Check Current Threshold Configuration

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Check global thresholds
ceph config get global mon_osd_nearfull_ratio
ceph config get global mon_osd_full_ratio
ceph config get global mon_osd_backfillfull_ratio

# Or via osd dump
ceph osd dump | grep -E "full_ratio|nearfull_ratio|backfillfull_ratio"
```

## Step 2 - Set Recommended Production Thresholds

For production clusters, tighten the thresholds to get earlier warnings:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Near-full: warn at 75% instead of 85%
ceph osd set-nearfull-ratio 0.75

# Full: block writes at 85% instead of 95%
ceph osd set-full-ratio 0.85

# Backfill-full: prevent backfill at 80%
ceph osd set-backfillfull-ratio 0.80

# Verify
ceph osd dump | grep -E "full_ratio|nearfull|backfillfull"
```

## Step 3 - Configure in Rook CephCluster

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    mon_osd_nearfull_ratio = 0.75
    mon_osd_full_ratio = 0.85
    mon_osd_backfillfull_ratio = 0.80
```

Note: This ConfigMap sets the default thresholds at cluster initialization. For an existing cluster, use the toolbox commands from Step 2 to modify the OSD map values directly.

## Step 4 - Per-OSD Threshold Checking

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd df | sort -k8 -rn | head -20
```

Output shows each OSD's utilization:

```text
ID  CLASS  WEIGHT  REWEIGHT  SIZE    USE    AVAIL   %USE  VAR  PGS
 3  hdd    10.910  1.00000  10.91T  8.73T  2.18T  79.96  1.08  176
 7  hdd    10.910  1.00000  10.91T  8.52T  2.39T  78.08  1.06  168
```

Watch for any OSDs approaching your nearfull threshold.

## Step 5 - Alert on Threshold Violations

Configure Prometheus alerts:

```yaml
groups:
- name: ceph-capacity
  rules:
  - alert: CephOSDNearFull
    expr: ceph_osd_stat_bytes_used / ceph_osd_stat_bytes > 0.75
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is near full ({{ $value | humanizePercentage }})"

  - alert: CephOSDFull
    expr: ceph_osd_stat_bytes_used / ceph_osd_stat_bytes > 0.85
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is full - writes blocked!"
```

## Step 6 - Handle a Full Cluster Emergency

If writes are blocked due to full cluster:

```bash
# Step 1: Check which OSDs are full
ceph osd df | awk '$8 > 85 {print $0}'

# Step 2: Temporarily raise full ratio for emergency writes
# USE WITH CAUTION - only buys time
ceph osd set-full-ratio 0.97

# Step 3: Immediately free space or add OSDs
# Delete large unnecessary objects
rados -p replicapool ls | head -20
rados -p replicapool stat large-object-name

# Step 4: Lower ratio back after adding capacity
ceph osd set-full-ratio 0.85
```

## Step 7 - Monitor Capacity Trend

```bash
# Check how fast you're approaching the threshold
ceph status | grep -E "used|avail"

# Estimate time to full threshold
CURRENT_PCT=$(ceph df --format json | jq -r '.stats.total_used_raw_ratio')
echo "Current utilization: $CURRENT_PCT"
```

## Summary

Setting conservative full and near-full thresholds is critical for preventing surprise write outages in Ceph. By configuring nearfull at 75% and full at 85%, you get two early warning stages with ample time to respond before writes are blocked. The default thresholds of 85% and 95% leave too little room for recovery operations, which themselves require free space to complete.
