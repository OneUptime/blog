# How to Profile Rook-Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Performance, Profiling, Benchmark

Description: Profile Rook-Ceph cluster performance using built-in Ceph tools to identify I/O bottlenecks, latency hotspots, and OSD throughput limits.

---

## Overview

Profiling Rook-Ceph performance helps identify whether storage bottlenecks originate from OSD disks, network bandwidth, or cluster configuration. Ceph provides several built-in tools accessible through the Rook toolbox for detailed I/O analysis.

## Checking Cluster-Level Performance Stats

Start with the Ceph performance counters to get a baseline:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

This shows per-OSD latency statistics including `apply_latency_ms` (write path) and `commit_latency_ms` (transaction commit). Note that with BlueStore (the default backend), both values are effectively identical since BlueStore does not use a separate journal.

## Real-Time I/O Statistics

Monitor live throughput and operations per second:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph -w
```

Filter for I/O statistics only:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph iostat -p 5
```

This outputs per-second read/write bytes and IOPS at 5-second intervals.

## Per-Pool Performance

Check read and write statistics per pool:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph osd pool stats
```

## OSD Daemon Performance Profiling

Ceph supports heap profiling and performance counters at the daemon level:

```bash
# Get performance counters for a specific OSD
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | jq .osd.op_latency
```

Check the operation latency histogram:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | jq '.osd.op_r_latency'
```

## Benchmarking with rados bench

Run a write benchmark to measure raw pool throughput:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 60 write --no-cleanup
```

Then run sequential and random reads:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 60 seq

kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 60 rand
```

Clean up benchmark objects after:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  rados -p replicapool cleanup
```

## Analyzing Slow Operations

Ceph tracks operations that exceed the slow op threshold:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph health detail | grep slow
```

Dump slow ops from a specific OSD:

```bash
kubectl exec -n rook-ceph -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 dump_slow_ops
```

## Checking Network Utilization

High OSD latencies in `ceph osd perf` can indicate network saturation. Check node-level network utilization directly:

```bash
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host sar -n DEV 1 10
```

## Summary

Profiling Rook-Ceph performance involves layered analysis: start with `ceph osd perf` for latency baselines, use `ceph iostat` for live throughput monitoring, `rados bench` for controlled benchmarks, and `dump_slow_ops` to pinpoint OSD-level bottlenecks. Network saturation and per-pool utilization provide the broader context needed to tune Ceph for your workload.
