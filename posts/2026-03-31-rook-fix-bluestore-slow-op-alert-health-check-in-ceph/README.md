# How to Fix BLUESTORE_SLOW_OP_ALERT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Storage, Health Check

Description: Learn how to diagnose and fix the BLUESTORE_SLOW_OP_ALERT health warning in Ceph, caused by slow disk I/O operations in the BlueStore backend.

---

## What Is BLUESTORE_SLOW_OPS?

The `BLUESTORE_SLOW_OPS` health warning appears when Ceph's BlueStore storage backend detects that one or more OSD operations are taking longer than expected to complete. BlueStore is the default storage backend for OSDs in modern Ceph clusters, and it tracks operation latency internally. When the number of slow ops within the last `bluestore_slow_ops_warn_lifetime` seconds (default 86400, i.e. 24 hours) meets or exceeds `bluestore_slow_ops_warn_threshold` (default 1), Ceph raises this alert. The underlying slow op detection threshold is controlled by `osd_op_complaint_time` (default 30 seconds).

This warning is a signal that your OSD disks are under pressure, experiencing hardware problems, or misconfigured in a way that causes I/O bottlenecks.

## Identifying the Affected OSDs

Start by inspecting the cluster health detail to find which OSDs are triggering the alert:

```bash
ceph health detail
```

Look for lines like:

```text
HEALTH_WARN OSD(s) experiencing slow operations in BlueStore
[WRN] BLUESTORE_SLOW_OPS: 1 OSD(s) experiencing slow operations in BlueStore
```

Then check the specific OSD logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-osd-3 | grep "slow op"
```

## Common Causes and Fixes

### 1. Disk I/O Saturation

The most common cause is the underlying disk being saturated. Check disk utilization:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- iostat -x 2 10
```

If `%util` is near 100% for a device, the disk is the bottleneck. Consider adding more OSDs or replacing HDDs with SSDs/NVMe drives.

### 2. BlueStore Slow Op Threshold Configuration

You can adjust the alert threshold if your workload legitimately involves longer operations. However, raising thresholds should be a last resort - investigate the root cause first.

```bash
ceph config set osd bluestore_slow_ops_warn_lifetime 300
ceph config set osd bluestore_slow_ops_warn_threshold 10
```

### 3. WAL and DB Device Misconfiguration

If your BlueStore WAL (Write-Ahead Log) or DB is collocated on the same slow HDD instead of a fast SSD, operations will be slow. Verify device separation:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          storageClassName: local-storage-hdd
      - metadata:
          name: wal
        spec:
          storageClassName: local-storage-nvme
      - metadata:
          name: db
        spec:
          storageClassName: local-storage-nvme
```

### 4. Kernel and Scheduler Tuning

Ensure the I/O scheduler is set appropriately for your disk type. For NVMe use `none`, for SSD/HDD use `mq-deadline`:

```bash
cat /sys/block/sdb/queue/scheduler
echo mq-deadline > /sys/block/sdb/queue/scheduler
```

### 5. OSD Recovery Throttling

If a recovery or rebalance is in progress alongside normal I/O, it can cause slow ops. Throttle recovery:

```bash
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
```

## Monitoring and Alerting

Set up a Prometheus alert to catch this before it degrades client I/O:

```yaml
groups:
- name: ceph-bluestore
  rules:
  - alert: CephBluestoreSlowOps
    expr: ceph_health_detail{name="BLUESTORE_SLOW_OPS"} == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph BlueStore slow ops detected"
```

## Summary

`BLUESTORE_SLOW_OPS` indicates disk I/O bottlenecks in your Ceph cluster's BlueStore backend. The fix involves identifying saturated disks via `iostat`, ensuring WAL/DB devices are on fast NVMe storage, throttling background recovery operations, and tuning kernel I/O schedulers. Always investigate the root hardware cause before adjusting alert thresholds.
