# How to Use the ceph pg Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Placement Group, PG, Operation, Troubleshooting

Description: Master the ceph pg commands to inspect, repair, force-recover, and manage placement groups in a Ceph cluster.

---

## Introduction

Placement Groups (PGs) are the fundamental unit of data distribution in Ceph. Each pool is divided into PGs, and each PG is mapped to a set of OSDs. The `ceph pg` command suite provides detailed visibility into PG state and tools for recovery operations.

## Checking PG Summary

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Overall PG statistics
ceph pg stat

# Detailed dump of all PGs
ceph pg dump
```

Example `pg stat` output:

```text
193 pgs: 193 active+clean; 45 GiB data, 135 GiB used, 865 GiB / 1 TiB avail
```

## Listing Non-Clean PGs

```bash
ceph pg dump pgs_brief | grep -v "active+clean" | grep -v "^$"
```

Or use the faster method:

```bash
ceph pg dump_stuck
ceph pg dump_stuck unclean
ceph pg dump_stuck stale
ceph pg dump_stuck inactive
```

## Getting PG Details

```bash
ceph pg 1.5 query | python3 -m json.tool
```

This shows the acting set, peer status, state history, and any error messages.

## Finding Which PG Contains an Object

```bash
ceph osd map replicapool myobject-name
```

Output:

```text
osdmap e45 pool 'replicapool' (1) object 'myobject-name' -> pg 1.a5c2d3e4 (1.4) -> up ([0,2,4], p0) acting ([0,2,4], p0)
```

## Repairing a PG

```bash
# Run repair on a specific PG
ceph pg repair 1.5

# Run deep scrub
ceph pg deep-scrub 1.5

# Force scrub
ceph pg scrub 1.5
```

## Forcing Recovery Priority

```bash
# Increase recovery priority for a PG
ceph pg force-recovery 1.5

# Cancel forced recovery
ceph pg cancel-force-recovery 1.5

# Force backfill
ceph pg force-backfill 1.5
```

## Adjusting PG Count

When cluster size changes, adjust PG count for optimal performance:

```bash
# Get current PG count
ceph osd pool get mypool pg_num

# Increase PG count
ceph osd pool set mypool pg_num 256

# Note: since Nautilus, pgp_num auto-adjusts to match pg_num.
# Only set pgp_num manually on pre-Nautilus clusters:
# ceph osd pool set mypool pgp_num 256

# Enable autoscaling (recommended)
ceph osd pool set mypool pg_autoscale_mode on
```

Check autoscaling recommendations:

```bash
ceph osd pool autoscale-status
```

## Monitoring PG Recovery Progress

```bash
watch "ceph -s | grep -E 'pgs|recovering|backfill'"
```

## Summary

The `ceph pg` command suite provides full lifecycle management for placement groups - from inspecting state and mapping objects to forcing recovery and adjusting PG counts. For daily operations, `ceph pg dump_stuck` quickly surfaces unhealthy PGs, while `ceph pg repair` and `ceph pg force-recovery` are the primary tools for resolving PG health issues.
