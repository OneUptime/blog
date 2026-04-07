# How to Understand the degraded PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, State, Recovery, Storage

Description: Understand what the degraded placement group state means in Ceph, what causes it, and how to assess the risk and recovery timeline.

---

The `degraded` PG state means one or more object replicas are missing. The PG is still serving I/O (when combined with `active`) but has reduced redundancy. Understanding this state is critical for assessing data durability during and after OSD failures.

## What degraded Means

A PG is `degraded` when its current replica count is below the pool's `size` setting. For a `size 3` pool, `degraded` means the PG has 2 or fewer copies.

Degraded does NOT mean data loss - it means you have less protection than configured. If another OSD fails while a PG is degraded, you could lose data if the remaining replicas go down.

## Checking Degraded PGs

```bash
ceph status
# HEALTH_WARN: X/Y objects degraded

ceph pg stat
# active+degraded count

# List which PGs are degraded
ceph pg dump | grep degraded
```

Get the number of degraded objects:

```bash
ceph status --format json | jq '.pgmap.degraded_objects'
```

## What Causes Degradation

1. An OSD goes `down` or `out`
2. A node is rebooted during maintenance
3. An OSD is being replaced
4. Network partition preventing replica communication

Check which OSDs are affected:

```bash
ceph osd tree | grep -E "down|out"
ceph health detail | grep "pg"
```

## Degradation Levels

| Replicas Present | Pool Size | Status |
|-----------------|-----------|--------|
| 3 | 3 | active+clean |
| 2 | 3 | active+degraded |
| 1 | 3 | active+degraded (high risk) |
| 0 | 3 | inactive (unavailable) |

## Risk Assessment

With one replica missing (2/3), the cluster can tolerate zero additional OSD failures for affected PGs. With two replicas missing (1/3), any single additional OSD failure could make those PGs inactive.

```bash
# See degraded ratio
ceph status | grep "degraded"
# degraded (33.333%): 1024/3072 objects

# Calculate affected PGs
ceph pg dump | awk '{if ($16 ~ /degraded/) print $1}' | wc -l
```

## Speeding Up Recovery

If degradation is due to a recoverable OSD coming back:

```bash
# Check if OSD is recovering
ceph osd stat

# Increase recovery speed
ceph config set osd osd_recovery_max_active_hdd 10
ceph config set osd osd_recovery_op_priority 10
```

If the OSD is permanently lost, mark it out to trigger remapping:

```bash
ceph osd out osd.3
```

## Monitoring Recovery Progress

```bash
watch ceph status
# Look for transition from:
# active+degraded -> active+recovering+degraded -> active+clean
```

## Summary

The `degraded` PG state indicates reduced data redundancy due to missing replicas. Degraded PGs continue serving I/O but with lower fault tolerance. When you see `active+degraded`, act promptly by identifying the failed OSD, determining if it is recoverable or must be replaced, and ensuring the remaining replicas do not fail during recovery.
