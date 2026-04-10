# How to Use the ceph osd tree Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, OSD, CRUSH, Operation, Topology

Description: Learn to read and use the ceph osd tree command to understand your cluster topology, OSD health, and CRUSH hierarchy.

---

## Introduction

`ceph osd tree` displays the CRUSH hierarchy of your Ceph cluster - showing how hosts, racks, and OSDs are organized. It is essential for understanding placement decisions, verifying cluster topology, and diagnosing OSD failures.

## Running the Command

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Example output:

```text
ID  CLASS  WEIGHT   TYPE NAME         STATUS  REWEIGHT  PRI-AFF
-1         3.00000  root default
-3         1.00000      host worker-1
 0    hdd  1.00000          osd.0         up   1.00000  1.00000
-5         1.00000      host worker-2
 1    hdd  1.00000          osd.1         up   1.00000  1.00000
-7         1.00000      host worker-3
 2    hdd  1.00000          osd.2         up   1.00000  1.00000
```

## Reading the Output

- `ID` - Negative IDs are CRUSH buckets (hosts, racks). Non-negative IDs are OSDs
- `CLASS` - Device class (hdd, ssd, nvme)
- `WEIGHT` - Proportional data placement weight
- `STATUS` - `up` or `down`
- `REWEIGHT` - Manual weight override (1.0 = normal, 0 = excluded)
- `PRI-AFF` - Primary affinity for client reads

## Checking OSD Status Quickly

```bash
# Show only OSDs with non-up status
ceph osd tree | grep -E "down|out"

# Show only down OSDs in the tree
ceph osd tree down
```

## Using JSON Output

```bash
ceph osd tree --format json | python3 -m json.tool | grep -E '"name"|"status"'
```

## Filtering by Status

```bash
# Show tree with status details
ceph osd tree up
ceph osd tree in
ceph osd tree out
ceph osd tree down
```

## Understanding CRUSH Bucket Types

```bash
ceph osd crush dump | python3 -m json.tool | grep type_name
```

Common bucket types in order from smallest to largest:

- `osd` - Individual disk
- `host` - Physical server
- `rack` - Server rack
- `row` - Row of racks
- `room` - Data center room
- `datacenter` - Facility
- `root` - Top-level bucket

## Verifying OSD Placement for Pools

Check which OSDs a pool's data is placed on:

```bash
ceph osd pool get replicapool crush_rule
ceph osd crush rule dump replicated_rule
```

## Checking for Unbalanced Weights

```bash
ceph osd df
```

Compare `SIZE` and `%USE` columns. Large variance indicates uneven distribution. Rebalance with:

```bash
ceph osd reweight-by-utilization 120
```

## Adding Device Classes

Mark SSDs and HDDs explicitly:

```bash
ceph osd crush set-device-class ssd osd.0 osd.1
ceph osd crush set-device-class hdd osd.2 osd.3
ceph osd tree  # Verify CLASS column
```

## Summary

`ceph osd tree` provides a hierarchical view of all OSDs, their device classes, weights, and health status. It is the go-to command for verifying CRUSH topology, identifying failed OSDs, and understanding data placement decisions. Combined with `ceph osd df`, it provides complete visibility into storage distribution across the cluster.
