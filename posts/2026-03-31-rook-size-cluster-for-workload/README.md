# How to Size a Ceph Cluster for Your Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Sizing, Workload, Capacity Planning, Performance, Hardware

Description: Size a Rook-Ceph cluster correctly for your specific workload by analyzing I/O patterns, throughput requirements, latency targets, and translating them into hardware specifications.

---

## Overview

Ceph cluster sizing requires matching hardware to workload characteristics. A cluster for a block storage workload needs different hardware than one serving object storage for backup. This guide walks through a systematic sizing process.

## Step 1 - Characterize Your Workload

Define your workload requirements:

```yaml
Workload type: Block (RBD), File (CephFS), or Object (RGW)
Capacity target: Total usable storage needed
Throughput: Peak MB/s read and write
IOPS: Peak random I/O operations per second
Latency: Maximum acceptable p99 latency
Durability: Replication factor (2x, 3x) or erasure coding
```

## Step 2 - Calculate Raw Capacity

```bash
# For 3-replica replication
function calc_raw() {
  USABLE=$1
  REPLICA=$2
  OVERHEAD=0.2  # 20% reserved (full threshold)

  RAW=$(echo "scale=1; $USABLE * $REPLICA / (1 - $OVERHEAD)" | bc)
  echo "Raw capacity needed: ${RAW} TB"
}

calc_raw 100 3
# Raw capacity needed: 375.0 TB

# For erasure coding k=4, m=2 (1.5x overhead)
calc_raw 100 1.5
# Raw capacity needed: 187.5 TB
```

## Step 3 - Determine OSD Count and Type

For IOPS-heavy workloads (databases):

```bash
# NVMe target: ~200K IOPS per NVMe OSD
# For 1M IOPS requirement:
IOPS_NEEDED=1000000
IOPS_PER_NVME=200000
NVME_OSDS=$((IOPS_NEEDED / IOPS_PER_NVME))
echo "NVMe OSDs needed: $NVME_OSDS"
# Result: 5 NVMe OSDs minimum, use 8-10 for headroom
```

For throughput-heavy workloads (media, backup):

```bash
# HDD target: ~150-200 MB/s per HDD OSD
THROUGHPUT_NEEDED=10000  # MB/s
THROUGHPUT_PER_HDD=150
HDD_OSDS=$((THROUGHPUT_NEEDED / THROUGHPUT_PER_HDD))
echo "HDD OSDs needed: $HDD_OSDS"
# Result: 67 HDD OSDs minimum
```

## Step 4 - Calculate Node Count

```bash
# Block storage workload example:
# 100 TB usable, 1M IOPS, low-latency database

# Option A: All-NVMe
NVME_CAPACITY_TB=4  # per NVMe
NVME_OSDS_NEEDED=10
NODES=3  # minimum fault domains
NVMES_PER_NODE=$((NVME_OSDS_NEEDED / NODES + 1))

echo "NVMe per node: ${NVMES_PER_NODE}"
# Capacity: 3 nodes x 4 NVMe x 4 TB = 48 TB raw / 3 = 16 TB usable

# Need more capacity, add nodes (375 TB raw from Step 2):
CAPACITY_NODES=$((375 / (NVMES_PER_NODE * NVME_CAPACITY_TB)))
echo "Nodes for capacity: ${CAPACITY_NODES}"
```

## Step 5 - Reference Sizing Examples

```yaml
# Example 1: Small block storage (database)
workload: "PostgreSQL primary + replicas"
usable_capacity: "20 TB"
iops_target: "100K IOPS"
latency_target: "< 1ms p99"

hardware:
  nodes: 3
  per_node:
    cpu: "32 cores"
    ram: "128 GB"
    nvme_osds: "5 x 4 TB NVMe"
    network: "2 x 25 GbE"

# Example 2: Large object storage (backup/archive)
workload: "S3-compatible object storage"
usable_capacity: "500 TB"
throughput_target: "10 GB/s aggregate"
latency_target: "< 100ms"

hardware:
  nodes: 12
  per_node:
    cpu: "16 cores"
    ram: "64 GB"
    hdd_osds: "12 x 12 TB HDD"
    wal_db: "1 x 1 TB NVMe"
    network: "2 x 10 GbE bonded"
```

## Step 6 - Validate Sizing with Tests

Before production, validate with fio:

```bash
# Test block storage performance
fio --ioengine=rbd \
  --pool=replicapool \
  --rbdname=testimage \
  --rw=randrw \
  --rwmixread=70 \
  --bs=4k \
  --iodepth=128 \
  --numjobs=8 \
  --runtime=60 \
  --name=ceph-test
```

## Summary

Sizing a Ceph cluster correctly requires separately analyzing capacity, IOPS, and throughput requirements, then selecting the hardware that satisfies all three. Block storage workloads are usually IOPS-bound and favor NVMe, while object storage workloads are throughput-bound and favor dense HDD nodes with NVMe caching. Always size for 80% utilization at peak to allow for recovery operations without impacting performance.
