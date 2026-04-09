# How to Calculate Minimum Hardware Requirements for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Hardware, Capacity Planning, Infrastructure, OSD, Monitor

Description: Calculate the minimum hardware requirements for a production Rook-Ceph cluster covering nodes, CPU, RAM, network, and storage based on your workload needs.

---

## Overview

Deploying a Ceph cluster without proper hardware sizing leads to performance problems, capacity shortfalls, and instability. This guide walks through calculating minimum hardware requirements for a production Rook-Ceph cluster.

## Minimum Cluster Topology

A production Ceph cluster requires:
- At least 3 nodes for monitors (one per node)
- At least 3 OSD nodes for failure domain isolation
- Separate management network (recommended) and client network

## Monitor Node Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU cores | 2 | 4 |
| RAM | 4 GB | 8 GB |
| OS disk | 20 GB SSD | 50 GB SSD |

Monitors can run on OSD nodes in smaller clusters.

## OSD Node Requirements

Per OSD disk:

```yaml
CPU: 0.5-1 core per OSD (HDD), 4+ cores per OSD (NVMe)
RAM: 4 GB per OSD (minimum), 5-8 GB per OSD (recommended)
```

Per node with 12 HDDs:

```yaml
CPU: 12 x 0.5 = 6 cores minimum, recommend 8-12 cores
RAM: 12 x 4 GB = 48 GB minimum, recommend 64 GB
```

## Step 1 - Calculate Storage Requirements

Determine raw capacity needed:

```bash
# For 3-replica setup
# Usable = Raw / 3
# To store 100 TB usable with 3 replicas:
# Raw needed = 100 TB x 3 = 300 TB

# Factor in target utilization (80% max)
# Raw to buy = 300 TB / 0.8 = 375 TB
```

## Step 2 - Calculate OSD Count

```bash
# With 12 TB HDDs
# OSD count = 375 TB / 12 TB = ~32 OSDs

# Number of nodes (min 4 for fault tolerance)
# OSDs per node = 32 / 4 = 8 OSDs per node
```

## Step 3 - Calculate RAM per Node

```bash
# For 8 HDDs per node
OSD_RAM=32  # 4 GB per OSD
MON_RAM=4   # If co-located
MGR_RAM=4   # If co-located
OS_RAM=4    # Operating system

TOTAL=$((OSD_RAM + MON_RAM + MGR_RAM + OS_RAM))
echo "Minimum RAM per node: ${TOTAL} GB"
# Output: Minimum RAM per node: 44 GB
# Round up to 64 GB for safety margin
```

## Step 4 - Calculate CPU per Node

```bash
# For 8 HDDs + WAL/DB on SSDs
OSD_CORES=$((8 * 1))  # 1 core per HDD OSD
MON_CORES=2
MGR_CORES=2
OS_CORES=2

TOTAL=$((OSD_CORES + MON_CORES + MGR_CORES + OS_CORES))
echo "Minimum cores per node: ${TOTAL}"
# Output: Minimum cores per node: 14
# Round up to 16 physical cores (32 threads)
```

## Step 5 - Network Requirements

```text
Client/Public network: 10 GbE minimum, 25 GbE recommended
Cluster/Replication network: 10 GbE minimum, 25 GbE recommended
Separate VLANs for security and QoS
```

Rule of thumb: network throughput should exceed total OSD throughput:

```text
12 HDDs x 200 MB/s = 2.4 GB/s per node
For 3x replication: 3 x 2.4 = 7.2 GB/s cluster write bandwidth
25 GbE = ~3 GB/s - need bonded 25 GbE or 100 GbE for full performance
```

## Step 6 - Minimum Viable Cluster Summary

```yaml
# 3-node cluster for development/small production
nodes: 3
per_node:
  cpu: "16 cores (32 threads)"
  ram: "64 GB"
  os_disk: "2 x 240 GB SSD (RAID1 for OS)"
  osd_disks: "8 x 4 TB HDD"
  wal_db_disks: "1 x 1 TB NVMe (shared for all OSDs)"
  network: "2 x 10 GbE (bonded, client + cluster)"

usable_capacity: "~32 TB (3x replication)"
```

## Summary

Ceph hardware sizing starts with your usable capacity target, works backward through replication factor to raw capacity, then divides across nodes. Memory is typically the binding constraint - always allocate at least 4-5 GB per OSD and plan for buffer. Network bandwidth should comfortably exceed the aggregate I/O of all OSDs on a node, especially for replication traffic on the cluster network.
