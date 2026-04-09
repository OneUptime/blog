# How to Calculate Raw vs Usable Capacity in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Storage, Planning, Replication, Erasure Coding

Description: Understand the relationship between raw and usable capacity in Ceph, how replication factor and erasure coding affect efficiency, and how to calculate what storage you actually get.

---

## Overview

The distinction between raw and usable capacity is fundamental to Ceph planning. Raw capacity is the sum of all OSD disk space. Usable capacity is what applications can actually store after accounting for replication, erasure coding overhead, and safety thresholds.

## The Basic Formula

```text
Usable Capacity = Raw Capacity / Replication Factor x full_ratio
```

Where `full_ratio` (the `mon_osd_full_ratio`) is typically 0.95 but you should plan for 0.80 usable maximum.

## Step 1 - Measure Raw Capacity

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df
```

Output:

```text
--- RAW STORAGE ---
CLASS     SIZE      AVAIL     USED     RAW USED  %RAW USED
hdd       300 TiB   287 TiB   4.4 TiB  13 TiB    4.33
TOTAL     300 TiB   287 TiB   4.4 TiB  13 TiB    4.33
```

## Step 2 - Calculate Usable Capacity for 3-Way Replication

```bash
#!/bin/bash
RAW_TB=300
REPLICA=3
SAFETY=0.80  # Use only 80% to avoid full issues

USABLE=$(echo "scale=1; $RAW_TB / $REPLICA * $SAFETY" | bc)
echo "Raw capacity: ${RAW_TB} TB"
echo "Replication factor: ${REPLICA}x"
echo "Usable capacity (80%): ${USABLE} TB"
# Output: Usable capacity (80%): 80.0 TB
```

## Step 3 - Erasure Coding Efficiency

```bash
# Erasure coding k+m (data chunks + parity chunks)
# Overhead factor = (k + m) / k

# Common erasure coding profiles and efficiency:
echo "EC 2+1 (k=2, m=1): Overhead = $(echo 'scale=2; 3/2' | bc)x = 1.5x overhead"
echo "EC 4+2 (k=4, m=2): Overhead = $(echo 'scale=2; 6/4' | bc)x = 1.5x overhead"
echo "EC 6+2 (k=6, m=2): Overhead = $(echo 'scale=2; 8/6' | bc)x = 1.33x overhead"
echo "EC 8+3 (k=8, m=3): Overhead = $(echo 'scale=3; 11/8' | bc)x = 1.375x overhead"

# Compare to 3-replica: 3.0x overhead
# EC 4+2 usable from 300 TB:
USABLE_EC=$(echo "scale=1; 300 * 4/6 * 0.80" | bc)
echo "EC 4+2 usable from 300 TB (80%): ${USABLE_EC} TB"
# EC 4+2 gives ~160 TB usable vs ~80 TB for 3-replica
```

## Step 4 - Per-Pool Capacity Accounting

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df detail
```

Shows used space per pool. Note that pool capacity counts raw used, not logical:

```yaml
POOLS:
POOL              ID   STORED   COPIES   USED     %USED
replicapool        1   10 GiB      3     30 GiB   10.0
ecpool             2   20 GiB    1.5     30 GiB   10.0
```

## Step 5 - Understand the Capacity Math in Practice

```bash
# Real example: 6 nodes, each with 8 x 12 TB HDDs
NODES=6
HDDS_PER_NODE=8
HDD_SIZE_TB=12

RAW_TB=$((NODES * HDDS_PER_NODE * HDD_SIZE_TB))
echo "Total raw: ${RAW_TB} TB"

# With 3x replication
USABLE_3X=$(echo "scale=1; $RAW_TB / 3 * 0.80" | bc)
echo "3x replication usable: ${USABLE_3X} TB"

# With EC 4+2
USABLE_EC=$(echo "scale=1; $RAW_TB * 4/6 * 0.80" | bc)
echo "EC 4+2 usable: ${USABLE_EC} TB"
```

## Step 6 - OSD Overhead

Each OSD itself consumes some space for BlueStore metadata:

```bash
# BlueStore DB overhead per OSD: typically 1-2% of OSD capacity
# For 12 TB HDD with 64 GB NVMe DB partition:
# This doesn't count toward raw capacity since DB is on separate device

# If DB is on the same HDD (all-on-one layout):
# Reserve ~2% for BlueStore overhead
EFFECTIVE_HDD=$(echo "scale=1; 12 * 0.98" | bc)
echo "Effective HDD capacity: ${EFFECTIVE_HDD} TB (after BlueStore overhead)"
```

## Step 7 - Capacity Planning Worksheet

```bash
cat << 'EOF'
=== Ceph Capacity Planning Worksheet ===

1. How much usable capacity do you need? ___ TB
2. Desired protection method: 3-replica or erasure coding?
3. For 3-replica: Raw needed = Usable x 3 / 0.8
4. For EC k+m: Raw needed = Usable x (k+m)/k / 0.8

5. Choose disk size and count:
   Raw needed / Disk size = Number of disks
   Number of disks / Disks per node = Nodes needed

6. Add 20-30% capacity buffer for growth
EOF
```

## Summary

Usable capacity in Ceph is significantly less than raw capacity due to replication or erasure coding overhead. With 3x replication and 80% utilization target, you get roughly 26-27% of raw capacity as usable storage. Erasure coding improves storage efficiency to 50-70% of raw, at the cost of additional CPU and stricter node count requirements. Always plan your raw capacity purchase from the usable target backward, not forward from the raw capacity available.
