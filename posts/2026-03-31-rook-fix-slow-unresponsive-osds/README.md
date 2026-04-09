# How to Fix Slow or Unresponsive OSDs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Performance, Troubleshooting

Description: Diagnose and fix slow or unresponsive OSDs in Ceph using Rook, covering op latency, scrub throttling, and recovery tuning.

---

## Understanding Slow and Unresponsive OSDs

Slow or unresponsive OSDs are one of the most common performance issues in a Ceph cluster. An OSD becomes "slow" when it takes longer than expected to process read or write requests. Ceph defines a slow request threshold (default 30 seconds) and will log warnings and health alerts when OSDs breach this threshold. Left unaddressed, slow OSDs cascade into degraded performance across the entire cluster.

## Identifying Slow OSDs

Start by checking the cluster health status from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Look for messages like `slow ops` or the `SLOW_OPS` health check. Identify which OSDs are involved:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

This shows latency per OSD. High `apply_latency_ms` or `commit_latency_ms` values indicate a struggling OSD.

## Common Causes and Fixes

### Disk I/O Saturation

The most frequent cause is the underlying disk being saturated. Check disk utilization on the node hosting the slow OSD:

```bash
iostat -x 2 10
```

If `%util` is near 100% for the disk, you may need to reduce recovery or scrub load, or replace the drive.

### Recovery and Backfill Throttling

Active recovery can overwhelm an OSD. Temporarily reduce recovery priority:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs \
  '--osd-recovery-sleep 0.1 --osd-max-backfills 1 --osd-recovery-max-active 1'
```

### Scrub Throttling

Scrubbing can cause latency spikes. Schedule scrubs to off-peak hours:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set osd osd_scrub_begin_hour 2
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set osd osd_scrub_end_hour 6
```

### Memory Pressure

BlueStore OSDs benefit from adequate memory. Check OSD memory targets:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config show osd.0 | grep memory
```

Ensure BlueStore cache autotuning is enabled, and increase the memory target if your nodes have spare RAM:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set osd bluestore_cache_autotune true
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set osd osd_memory_target 6442450944
```

## Restarting a Stuck OSD Pod

If an OSD pod becomes completely unresponsive, restart it via Kubernetes:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph delete pod <osd-pod-name>
```

Rook will automatically restart the pod. Monitor recovery with:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- watch ceph status
```

## Verifying Resolution

After applying fixes, verify that slow ops have cleared:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health
```

A healthy cluster should show `HEALTH_OK` with no slow request warnings.

## Summary

Slow or unresponsive OSDs in Ceph can stem from disk I/O saturation, excessive recovery or scrub activity, or memory pressure. Using `ceph osd perf` and `ceph health detail` inside the Rook toolbox identifies problem OSDs. Throttling recovery operations, scheduling scrubs off-peak, and restarting stuck OSD pods resolves most cases quickly.
