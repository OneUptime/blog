# How to Fix SLOW_OPS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Health Check, Performance

Description: Learn how to diagnose and fix SLOW_OPS in Ceph, a warning that client or OSD operations are taking longer than the configured threshold to complete.

---

## What Is SLOW_OPS?

`SLOW_OPS` is a Ceph health warning that fires when any client or OSD operation exceeds the `osd_op_complaint_time` threshold (default: 30 seconds). Slow ops can be caused by disk I/O bottlenecks, network issues, OSD overload, or cluster-wide backpressure during recovery or backfill.

This warning differs from `BLUESTORE_SLOW_OP_ALERT` - `SLOW_OPS` is about the entire operation pipeline (client request through to OSD completion), while `BLUESTORE_SLOW_OP_ALERT` is specifically about BlueStore internal disk operations.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] SLOW_OPS: 5 slow ops, oldest one blocked for 45 sec; osd.3 has slow ops
```

Get details on the slow operations:

```bash
ceph tell osd.3 dump_ops_in_flight
```

Check all OSDs for slow ops:

```bash
ceph tell osd.* dump_ops_in_flight 2>/dev/null | grep -E "op_|description"
```

## Common Root Causes

### 1. Disk I/O Saturation

Check disk performance on the affected OSD node:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- iostat -xz 2 5
```

If `%util` is near 100%, the disk is the bottleneck.

### 2. Network Issues

Check network latency between OSDs:

```bash
ceph tell osd.* perf dump | grep -E "ms_|net"
```

Check network errors on the node:

```bash
ip -s link show eth0
```

### 3. Recovery/Backfill Contention

If the cluster is recovering, it competes with client I/O:

```bash
ceph -s | grep -E "recovering|backfilling"
```

Throttle recovery to prioritize client I/O:

```bash
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_recovery_op_priority 3
```

### 4. OSD Memory Pressure

Check OSD memory usage:

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-osd
```

Increase OSD memory target:

```bash
ceph config set osd osd_memory_target 8589934592
```

### 5. CPU Throttling

Check if Kubernetes resource limits are throttling OSD CPUs:

```bash
kubectl -n rook-ceph describe pod rook-ceph-osd-3-<hash> | grep -A 4 Resources
```

Update the CephCluster CR to increase OSD resources:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  resources:
    osd:
      requests:
        cpu: "2"
        memory: "8Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

## Adjusting the Slow Ops Threshold

If slow ops are expected under your workload:

```bash
ceph config set osd osd_op_complaint_time 60
```

## Summary

`SLOW_OPS` indicates operations are taking too long to complete in Ceph. Diagnose by identifying the blocking operation type with `dump_ops_in_flight`, then investigate disk I/O saturation, network latency, recovery contention, or Kubernetes resource limits. Throttle background recovery during peak load, and consider increasing OSD memory and CPU resources to handle higher throughput workloads.
