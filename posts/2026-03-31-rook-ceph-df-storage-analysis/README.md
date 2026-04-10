# How to Use the ceph df Command for Storage Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Storage, Capacity Planning, Kubernetes

Description: Learn how to use the ceph df command to analyze storage capacity, pool utilization, and per-pool quotas in a Rook-Ceph cluster.

---

## Overview

The `ceph df` command provides a storage utilization summary at both the cluster and pool levels. It is one of the most frequently used commands for capacity planning and monitoring in Ceph. Running it regularly helps you detect pools approaching quota limits and plan hardware expansion before you run out of space.

## Basic Usage

Run from the Rook toolbox:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
ceph df
```

Sample output:

```text
--- RAW STORAGE ---
CLASS     SIZE    AVAIL    USED  RAW USED  %RAW USED
hdd     27 TiB  25 TiB  2 TiB   2.1 TiB       7.78
TOTAL   27 TiB  25 TiB  2 TiB   2.1 TiB       7.78

--- POOLS ---
POOL           ID  PGS   STORED  OBJECTS     USED  %USED  MAX AVAIL
device_health   1    1  210 KiB       12  630 KiB      0    7.9 TiB
replicapool     2   64  500 GiB  130000  1.5 TiB   18.6    7.9 TiB
csi-rbd-pool    3   32  200 GiB   65000  600 GiB    7.5    7.9 TiB
```

## Understanding the Output

**RAW STORAGE section:**
- `SIZE` - total raw capacity across all OSDs
- `AVAIL` - raw space not yet used
- `RAW USED` - total bytes written to OSDs including replication overhead

**POOLS section:**
- `STORED` - logical data stored (before replication)
- `USED` - actual bytes consumed across all replicas
- `%USED` - pool utilization relative to its max available
- `MAX AVAIL` - effective available space considering replication factor

## Detailed Output with --detail

```bash
ceph df detail
```

This adds per-pool quota information:

```text
POOL           QUOTA OBJECTS  QUOTA BYTES  DIRTY  USED COMPR  UNDER COMPR
replicapool          N/A          N/A      130000       0 B         0 B
```

## Checking Utilization Per Storage Class

If you have mixed OSD classes (HDD + SSD + NVMe):

```bash
ceph osd df tree
```

This breaks down utilization per OSD and per storage class, helping you identify imbalanced nodes.

## Setting and Monitoring Pool Quotas

```bash
# Set a quota on a pool
ceph osd pool set-quota replicapool max_bytes 1099511627776  # 1TiB
ceph osd pool set-quota replicapool max_objects 1000000

# Check current quotas
ceph osd pool get-quota replicapool
```

## Automating Capacity Alerts

You can script a check against `ceph df` output to alert when utilization crosses a threshold:

```bash
#!/bin/bash
THRESHOLD=80
USED_PCT=$(kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df --format json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); \
  print(round(d['stats']['total_used_raw_bytes']*100/d['stats']['total_bytes'],1))")

if (( $(echo "$USED_PCT > $THRESHOLD" | bc -l) )); then
  echo "ALERT: Ceph cluster is ${USED_PCT}% full"
fi
```

## Key Metrics to Track

- When `%RAW USED` exceeds 70%, begin capacity planning
- When `%RAW USED` exceeds 85%, Ceph triggers a nearfull warning (`HEALTH_WARN`); writes are blocked when individual OSDs reach the `full_ratio` (default 95%)
- Pool-level `%USED` reflects effective space, not raw overhead

## Summary

The `ceph df` command is a concise but powerful tool for monitoring storage capacity in Ceph clusters. Combined with pool quotas and automated alerting, it forms the foundation of proactive capacity management. Regular use of `ceph df detail` and `ceph osd df tree` gives you full visibility into storage consumption at every level of your Rook-Ceph deployment.
