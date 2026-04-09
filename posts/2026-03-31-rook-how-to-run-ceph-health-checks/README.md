# How to Run Ceph Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Health Check, Monitoring, Kubernetes, Administration

Description: Learn how to run comprehensive Ceph health checks from the Rook toolbox to assess cluster status, identify warnings, and diagnose performance issues.

---

## Overview

Regular health checks are essential for maintaining a healthy Rook-Ceph cluster. Ceph provides a rich set of status commands that expose information about monitor quorum, OSD availability, placement group states, I/O performance, and more. This guide covers the key commands for a thorough cluster health assessment.

## Basic Cluster Health

Check the overall health summary:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health
```

Possible outputs:
- `HEALTH_OK` - cluster is fully healthy
- `HEALTH_WARN` - cluster has warnings that need attention
- `HEALTH_ERR` - critical errors requiring immediate action

Get detailed health breakdown:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Example warning output:

```text
HEALTH_WARN 1 pool(s) do not have an application enabled; 1 large omap objects
[WRN] POOL_APP_NOT_ENABLED: 1 pool(s) do not have an application enabled
    application not enabled on pool 'test-pool'
[WRN] LARGE_OMAP_OBJECTS: 1 large omap objects
    2 large objects found in pool 'my-store.rgw.buckets.index'
```

## Full Cluster Status

Get a comprehensive cluster status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

This shows:
- Cluster ID and health
- Monitor quorum status
- Manager, MDS, OSD, and RGW service counts
- Data usage and distribution
- PG states

## Monitor Health

Check monitor quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status
```

Check monitor statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

## OSD Health

Verify all OSDs are up and in:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Get per-OSD status with host and utilization:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
```

Expected healthy output:

```text
+----+------------------+-------+-------+--------+---------+--------+---------+----
| id | host             | used  | avail | wr ops | wr data | rd ops | rd data | state |
+----+------------------+-------+-------+--------+---------+--------+---------+----
| 0  | storage-node-1   | 5.0G  | 995G  | 10     | 1.0M    | 20     | 2.0M    | exists,up |
| 1  | storage-node-2   | 5.1G  | 995G  | 8      | 900k    | 18     | 1.8M    | exists,up |
```

Check OSD performance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

## Placement Group Health

Check PG summary:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

All PGs should be in `active+clean` state for a fully healthy cluster.

List any degraded or stuck PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck
```

## Disk Usage and Capacity

Check cluster-wide disk usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

Get per-pool usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

Check OSD-level disk usage and balance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree
```

## I/O Performance Metrics

Get real-time I/O statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool stats
```

Watch cluster I/O in real time:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

## Automated Health Check Script

Run a comprehensive health check with a single script:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
echo '=== CLUSTER HEALTH ==='
ceph health detail
echo ''
echo '=== CLUSTER STATUS ==='
ceph status
echo ''
echo '=== OSD STATUS ==='
ceph osd stat
echo ''
echo '=== PG STATUS ==='
ceph pg stat
echo ''
echo '=== DISK USAGE ==='
ceph df
"
```

## Summary

Running Ceph health checks through the Rook toolbox involves using `ceph health detail` for a summary of warnings and errors, `ceph status` for a full cluster overview, `ceph osd status` for OSD availability, and `ceph pg stat` for placement group states. Regular health monitoring helps catch issues like degraded OSDs, imbalanced PGs, and approaching capacity limits before they impact workloads.
