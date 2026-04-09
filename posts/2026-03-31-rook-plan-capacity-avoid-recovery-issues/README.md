# How to Plan Capacity to Avoid Recovery Issues in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Planning, Operation, Storage

Description: Plan Ceph cluster capacity to avoid backfillfull stalls and recovery failures by calculating safe usage thresholds, sizing headroom, and automating capacity alerts.

---

## Why Capacity Planning Matters for Recovery

Ceph recovery requires free space to store additional replicas during rebalancing. If OSDs fill up past the `backfillfull` threshold (default: 90% of total OSD capacity), backfill stops. This leaves data degraded and creates a catch-22: Ceph needs free space to recover, but the cluster is too full to free it up.

## Ceph Fill Thresholds

Understanding the cascading thresholds:

```bash
# View current thresholds
ceph config get mon mon_osd_nearfull_ratio    # Warning at 85%
ceph config get mon mon_osd_full_ratio        # Writes stop at 95%
ceph config get osd osd_backfillfull_ratio    # Backfill stops at 90%
```

Safe operational ranges:
- **Green zone**: Under 70% used - plenty of headroom
- **Yellow zone**: 70-80% used - plan for expansion
- **Orange zone**: 80-85% used - immediately add capacity
- **Red zone**: Above 85% - backfill may stall

## Calculating Required Headroom

For a cluster with replication factor 3, the minimum free space needed to recover a single OSD:

```bash
# Formula: one OSD worth of data must fit on remaining OSDs
# If OSD has 10 TB and cluster has 12 OSDs:
# Required headroom >= 10 TB / (12-1) = ~931 GB per remaining OSD

python3 -c "
osd_size_tb = 10
num_osds = 12
# Each surviving OSD receives a share of the failed OSD's data
headroom_per_osd_gb = (osd_size_tb * 1024) / (num_osds - 1)
print(f'Minimum headroom per OSD: {headroom_per_osd_gb:.0f} GB')
print(f'As percentage of OSD: {headroom_per_osd_gb / (osd_size_tb * 1024) * 100:.1f}%')
"
```

## Current Capacity Assessment

```bash
# Cluster-wide capacity summary
ceph df

# Per-OSD utilization (sorted by % used)
ceph osd df tree | sort -k8 -n | tail -20

# Find OSDs above 80%
ceph osd df | awk 'NR>1 && $8 > 80 {print "WARNING OSD", $1, "at", $8"% used"}'

# Per-pool utilization
ceph df detail | awk '/POOLS:/,0' | grep -v "^$"
```

## Capacity Projection

Estimate when you will hit critical thresholds:

```bash
#!/bin/bash
# ceph-capacity-forecast.sh

# Get current usage
USED_BYTES=$(ceph df --format json | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(d['stats']['total_used_raw_bytes'])
")

TOTAL_BYTES=$(ceph df --format json | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(d['stats']['total_bytes'])
")

USED_PCT=$(python3 -c "print(round($USED_BYTES / $TOTAL_BYTES * 100, 1))")
REMAINING_PCT=$(python3 -c "print(round((0.75 - $USED_BYTES / $TOTAL_BYTES) * 100, 1))")

echo "Current usage: ${USED_PCT}%"
echo "Space remaining until 75% threshold: ${REMAINING_PCT}%"
echo ""
echo "Recommendation:"
if python3 -c "exit(0 if $USED_BYTES / $TOTAL_BYTES > 0.75 else 1)"; then
  echo "CRITICAL: Already above 75% - plan immediate expansion"
elif python3 -c "exit(0 if $USED_BYTES / $TOTAL_BYTES > 0.65 else 1)"; then
  echo "WARNING: Above 65% - begin capacity planning now"
else
  echo "OK: Sufficient headroom available"
fi
```

## Configuring Alerts

Set up Prometheus alerts for capacity thresholds:

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
      summary: "Ceph OSD {{ $labels.ceph_daemon }} above 75%"

  - alert: CephOSDBackfillFull
    expr: ceph_osd_stat_bytes_used / ceph_osd_stat_bytes > 0.85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} approaching backfillfull threshold"

  - alert: CephClusterNearFull
    expr: ceph_cluster_total_used_raw_bytes / ceph_cluster_total_bytes > 0.70
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster above 70% capacity"
```

## Proactive Capacity Management

```bash
# Enable PG autoscaler to rebalance PG counts as pools grow
ceph mgr module enable pg_autoscaler
ceph config set global osd_pool_default_pg_autoscale_mode on

# Enable automatic device class-based balancing
ceph mgr module enable balancer
ceph balancer on
ceph balancer mode upmap

# Monitor quota usage per pool
ceph osd pool get-quota <pool>
```

## Summary

Safe Ceph capacity planning requires maintaining 25-30% free space cluster-wide to ensure backfill always has room to complete. The key formula is: minimum headroom equals one OSD's full data capacity divided by the remaining OSD count. Prometheus alerts at 70% (warning) and 85% (critical) provide enough lead time to procure and deploy additional storage before recovery operations stall. PG autoscaling and the upmap balancer help maintain even distribution as pools grow.
