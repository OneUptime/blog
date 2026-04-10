# How to Analyze Storage Capacity with ceph df

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Storage, Monitoring

Description: Use ceph df and ceph df detail to analyze raw and logical storage capacity across OSDs and pools in your Rook-Ceph cluster for capacity planning.

---

`ceph df` is the primary command for analyzing storage capacity in a Ceph cluster. It shows both raw disk usage and per-pool logical data usage, helping you understand available capacity and identify pools that are consuming the most space.

## Run ceph df

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df
```

Sample output:

```text
--- RAW STORAGE ---
CLASS    SIZE     AVAIL    USED     RAW USED  %RAW USED
hdd      18 TiB   15 TiB   600 GiB  900 GiB   4.88
nvme     2 TiB    1.8 TiB   50 GiB   75 GiB    3.66
TOTAL    20 TiB   16.8 TiB 650 GiB  975 GiB   4.75

--- POOLS ---
POOL                    ID  PGS  STORED   OBJECTS  USED     %USED  MAX AVAIL
replicapool              1  128  200 GiB   51.2k    600 GiB  3.57   5 TiB
myfs-metadata            2   32  1 GiB      256     3 GiB    0.02   5 TiB
myfs-data0               3   64  100 GiB   25.6k    300 GiB  1.79   5 TiB
.rgw.root                4    8   1 KiB      4      3 KiB    0.00   5 TiB
```

## Understanding the RAW STORAGE Section

- **SIZE**: Total raw capacity across all OSDs of this device class
- **AVAIL**: Free raw bytes on all OSDs
- **USED**: Bytes consumed by Ceph data (pools) on disk
- **RAW USED**: Includes USED + metadata overhead + journal space
- **%RAW USED**: Percentage of total raw capacity consumed

## Understanding the POOLS Section

- **STORED**: Logical data stored (what clients wrote)
- **OBJECTS**: Number of RADOS objects in the pool
- **USED**: Raw bytes consumed (STORED x replication factor)
- **%USED**: Pool's share of total raw capacity
- **MAX AVAIL**: Maximum usable bytes available for new data in this pool

## Get Detailed Pool Breakdown

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df detail
```

This adds columns for OMAP data (key-value metadata), compression savings, quota usage, and dirty (unflushed) bytes.

## Parse ceph df JSON Output

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
stats = data['stats']
total = stats['total_bytes']
avail = stats['total_avail_bytes']
used = stats['total_used_raw_bytes']
print(f'Total raw: {total // (1024**4):.1f} TiB')
print(f'Available: {avail // (1024**4):.1f} TiB')
print(f'Used: {used // (1024**3)} GiB')
print(f'Utilization: {used/total*100:.1f}%')
"
```

## Plan Capacity with MAX AVAIL

`MAX AVAIL` shows how much more data a pool can accept. It accounts for the replication factor:

```text
MAX AVAIL = (total raw available) / replication_factor
```

If `MAX AVAIL` for `replicapool` shows 5 TiB and your replica factor is 3, you have approximately 15 TiB of raw space contributing to that pool.

## Set Capacity Alerts

Configure near-full and full thresholds:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph osd set-nearfull-ratio 0.75
  ceph osd set-full-ratio 0.85
"
```

## Script a Capacity Report

```bash
#!/bin/bash
echo "=== Ceph Capacity Report - $(date) ==="
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df
echo ""
echo "=== Cluster Health ==="
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health
```

## Summary

`ceph df` provides a two-section view of storage capacity: raw OSD storage by device class, and logical usage per pool. The `MAX AVAIL` column indicates how much data each pool can still accept, accounting for replication overhead. Use `ceph df detail` for compression statistics and quota information, and parse `--format json` output for automated capacity monitoring and alerting.
