# How to Plan Capacity for Rook Stretch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Cluster, Capacity Planning, Storage

Description: Learn how to plan raw disk capacity for Rook-Ceph stretch clusters, accounting for cross-site replication overhead and failure domain constraints.

---

## Overview

Capacity planning for Rook-Ceph stretch clusters is more complex than single-site deployments. A stretch cluster replicates data across two physical sites, which means your effective usable capacity is significantly lower than raw disk space. This guide explains how to calculate usable capacity, plan OSD distribution across zones, and size your cluster to survive site-level failures without running out of space.

## Understanding Stretch Replication Overhead

A standard stretch cluster uses a replication factor of 4 (2 copies per site). This means for every 1 TB of usable storage, you need 4 TB of raw disk across both sites. Combined with a recommended target utilization of 80% (Ceph's default nearfull ratio is 85%, but planning for 80% leaves headroom for rebalancing and recovery), the formula is:

```text
usable_capacity = (total_raw / replication_factor) * target_utilization
usable_capacity = (total_raw / 4) * 0.80
```

For example, with 100 TB raw across both sites:

```text
usable_capacity = (100 TB / 4) * 0.80 = 20 TB usable
```

## Symmetric Zone Sizing

Each site must have symmetric capacity. If site A has 50 TB raw and site B has 30 TB raw, the effective capacity is constrained by the smaller site (30 TB), because CRUSH must place copies in both zones. Plan for equal OSD count and disk sizes in both zones.

```bash
# Check current OSD distribution per zone
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree

# Check per-zone capacity
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

## Minimum OSD Count Per Zone

For a production stretch cluster, it is recommended to have at least 3 nodes per zone with at least 1 OSD per node, giving you 3 OSDs per zone minimum. With the stretch rule requiring copies in both zones, losing one zone means 50% of your OSDs are unavailable. Your surviving site must be able to hold all the data that was replicated across both zones.

This means each zone needs enough raw capacity to store 100% of your usable data:

```text
raw_per_zone = usable_capacity / target_utilization
raw_per_zone = 20 TB / 0.80 = 25 TB minimum per zone
```

## Estimating Capacity with Ceph Tools

After deployment, check current usage and projected capacity:

```bash
# Overall capacity summary
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df

# Per-OSD usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree

# Per-pool capacity usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados df
```

## Planning for OSD Rebalancing

When adding new OSDs or nodes to a stretch cluster, CRUSH will rebalance data across the cluster. Large rebalancing events consume significant network bandwidth between sites. Plan OSD additions in phases, and consider setting a rebalancing backfill limit to avoid overwhelming the cross-site link:

```bash
# Ensure backfill is limited to 1 concurrent operation per OSD (this is the default)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1

# Throttle recovery to 1 active operation per OSD (default is 3 for HDDs, 10 for SSDs)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 1
```

## Capacity Alert Thresholds

Configure Ceph to warn at appropriate thresholds for stretch clusters. Because each zone must hold the full dataset, set tighter warnings:

```bash
# Warn at 70% full (lower than default 85%)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_nearfull_ratio 0.70

# Stop backfill at 80% (lower than default 90%)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_backfillfull_ratio 0.80
```

## Summary

Capacity planning for Rook stretch clusters requires accounting for 4x replication overhead, symmetric zone sizing, and per-zone capacity sufficient to store your entire dataset after a site failure. Keep utilization below 75-80% in each zone, plan OSD additions in phases to limit rebalancing traffic, and set tighter capacity warning thresholds to avoid hitting the full ratio during a site-loss event.
