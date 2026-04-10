# How to Calculate and Interpret Data Usage in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage, Capacity, Monitoring

Description: Learn how to calculate and interpret logical vs raw data usage in Ceph clusters, including replication overhead and storage efficiency ratios.

---

Data usage in Ceph is measured in multiple ways: logical (what applications think they are storing), raw (what is actually on disk), and available capacity. Understanding the relationship between these metrics is essential for capacity planning.

## Key Concepts

| Term | Meaning |
|---|---|
| Logical size | Data size as seen by clients (before replication) |
| Raw used | Actual bytes consumed on OSDs (after replication) |
| Raw available | Remaining OSD capacity |
| Storage ratio | Raw used / logical size (usually 3x for 3-replica) |

## Get Cluster Usage Overview

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df
```

Sample output:

```text
--- RAW STORAGE ---
CLASS    SIZE     AVAIL    USED     RAW USED  %RAW USED
hdd      6 TiB    5 TiB    600 GiB  800 GiB   13.33
TOTAL    6 TiB    5 TiB    600 GiB  800 GiB   13.33

--- POOLS ---
POOL               ID  PGS  STORED  OBJECTS  USED  %USED  MAX AVAIL
replicapool         1  128  100 GiB    25.6k  300 GiB  4.88  1.5 TiB
device_health_metrics 2  1  0 B        0    0 B   0   1.5 TiB
```

## Understand the Numbers

In the example above:
- Pool `replicapool` stores **100 GiB** of logical data
- But uses **300 GiB** raw (3x replication factor)
- `MAX AVAIL` of 1.5 TiB is the usable capacity (raw available / replication factor)

The formula:
```text
MAX AVAIL = Total raw available / replication_factor
```

## Get Detailed Pool Usage

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph df detail
```

This adds columns for OMAP data, compression savings, and quota usage.

## Calculate Effective Capacity

For a 3-node cluster with 2 TiB per node:

```python
total_raw = 3 * 2  # = 6 TiB
replication_factor = 3
usable = total_raw / replication_factor  # = 2 TiB

# With safety buffer at 80% utilization
safe_capacity = usable * 0.80  # = 1.6 TiB
```

## Calculate Actual Space Efficiency

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  RAW_USED=\$(ceph df --format json | python3 -c \"
import json, sys
d = json.load(sys.stdin)
print(d['stats']['total_used_bytes'])
\")
  STORED=\$(ceph df --format json | python3 -c \"
import json, sys
d = json.load(sys.stdin)
total = sum(p['stats']['stored'] for p in d['pools'])
print(total)
\")
  echo \"Raw used: \$((RAW_USED / 1024 / 1024 / 1024)) GiB\"
  echo \"Logical stored: \$((STORED / 1024 / 1024 / 1024)) GiB\"
"
```

## Monitor Usage via Kubernetes

Rook exposes cluster capacity through the CephCluster status:

```bash
kubectl get cephcluster rook-ceph -n rook-ceph \
  -o jsonpath='{.status.ceph.capacity}' | python3 -m json.tool
```

## Set Capacity Alerts

Configure nearfull and backfillfull thresholds:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  # Warn at 75% OSD usage
  ceph config set global mon_osd_nearfull_ratio 0.75

  # Backfill pauses at 85%
  ceph config set global mon_osd_backfillfull_ratio 0.85

  # Block writes at 90% OSD usage
  ceph config set global mon_osd_full_ratio 0.90
"
```

## Summary

Ceph data usage separates logical stored data from raw disk consumption - a 3-replica pool uses 3x raw space for every byte stored. Use `ceph df` for a quick overview and `ceph df detail` for per-pool breakdown including compression. Calculate usable capacity as `total_raw / replication_factor` and plan for 80% maximum utilization to maintain cluster health.
