# How to Fix OSD_NEARFULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Capacity, Warning

Description: Learn how to resolve the OSD_NEARFULL health warning in Ceph by expanding storage capacity or rebalancing data before OSDs reach the full threshold.

---

## Understanding OSD_NEARFULL

`OSD_NEARFULL` is an early-warning health check that fires when one or more OSDs exceed the `nearfull_ratio` threshold (default 0.85 or 85% utilized). At this point, write I/O continues normally, but this warning indicates that without action, the cluster may progress to `OSD_BACKFILLFULL` and eventually `OSD_FULL`, at which point writes stop. This is your opportunity to act proactively.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 2 nearfull osd(s)
[WRN] OSD_NEARFULL: 2 osd(s) are near full
    osd.1 is near full (86.2% >= 85%)
    osd.4 is near full (88.5% >= 85%)
```

## Assessing the Situation

Check all OSD utilization:

```bash
ceph osd df
```

Calculate how much free space remains across the cluster:

```bash
ceph df
```

Understand the distribution - are all OSDs near full, or just a few?

```bash
ceph osd df | awk '{sum+=$NF; count++} END {print "avg:", sum/count "%"}'
```

## Option 1: Add New OSDs

The long-term fix is to add storage capacity. In Rook, increase OSD count:

```yaml
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      count: 6  # increase from current count
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          resources:
            requests:
              storage: 2Ti
          storageClassName: local-nvme
          volumeMode: Block
          accessModes:
          - ReadWriteOnce
```

Apply and watch new OSDs come online:

```bash
kubectl -n rook-ceph apply -f cephcluster.yaml
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w
```

## Option 2: Rebalance Using Reweight

If some OSDs are near full while others are underutilized:

```bash
# Check for imbalanced utilization
ceph osd df | sort -k8 -rn

# Auto-rebalance based on current utilization
ceph osd reweight-by-utilization

# Or manually reweight specific OSDs
ceph osd reweight 1 0.85  # reduce mapping weight
```

Monitor rebalancing:

```bash
ceph -w | grep -E "backfill|recover"
```

## Option 3: Enable Pool Compression

Reduce the effective data size with compression:

```bash
# Enable compression on the near-full pool
ceph osd pool set <pool-name> compression_mode aggressive
ceph osd pool set <pool-name> compression_algorithm snappy
```

Verify compression savings:

```bash
ceph df detail
```

## Option 4: Adjust Pool Replication

For non-critical pools, reduce replication factor to recover space:

```bash
# Reduce from 3 to 2 replicas (evaluate risk first)
ceph osd pool set <pool-name> size 2
ceph osd pool set <pool-name> min_size 1
```

This frees up 33% space but reduces redundancy.

## Configuring More Conservative Thresholds

Set the nearfull threshold lower so you get earlier warnings:

```bash
ceph osd set-nearfull-ratio 0.75
```

In Rook via CephCluster:

```yaml
spec:
  storage:
    nearFullRatio: 0.75
```

## Setting Up Capacity Trend Alerts

Configure alerting with rate of change to predict when full will be hit:

```yaml
- alert: CephOSDCapacityGrowth
  expr: predict_linear(ceph_osd_stat_bytes_used[1h], 86400) > ceph_osd_stat_bytes * 0.85
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} will hit nearfull within 24h"
```

## Summary

`OSD_NEARFULL` is an early warning that OSDs are approaching 85% utilization. Act before this progresses to backfillfull or full. Add new OSD capacity and rebalance, reweight imbalanced OSDs, or enable compression on busy pools. Lower the nearfull threshold to get earlier warnings and use predictive Prometheus alerts to anticipate capacity exhaustion before it becomes an emergency.
