# How to Understand the backfilling PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Backfill, State, Storage

Description: Understand the Ceph backfilling PG state, what triggers it, how it differs from recovery, and how to monitor and control backfill operations.

---

The `backfilling` PG state indicates that Ceph is copying all objects in a PG to a new or empty OSD. Unlike recovery (which only copies changed objects), backfill transfers the complete PG contents, making it a heavier operation.

## What backfilling Means

Backfill is triggered when:

- New OSDs are added to the cluster and CRUSH remaps PGs to them
- An OSD is replaced with a new empty device
- CRUSH rules or weights change, causing PG reassignment

The source OSD reads all objects in the PG and sends them to the destination OSD. The PG is in `active+remapped+backfilling` or `active+backfilling` during this process.

## Backfill vs Recovery

| Aspect | Recovery | Backfill |
|--------|---------|---------|
| Trigger | OSD returns after downtime | New OSD or CRUSH change |
| Data transferred | Changed objects only | All PG objects |
| Duration | Usually fast | Depends on PG size |
| PG state during | `active+recovering` | `active+backfilling` |

## Checking Backfill Status

```bash
ceph status
# backfilling 128 pgs

ceph pg stat | grep backfill

# List PGs currently backfilling
ceph pg dump | grep backfill
```

Detailed per-PG backfill info:

```bash
ceph pg <pg-id> query | jq '{state: .state, backfill_targets: .acting}'
```

## backfill_wait State

When too many PGs are already backfilling, additional ones queue as `backfill_wait`:

```bash
ceph pg dump | grep "backfill_wait" | wc -l
```

The limit is controlled by:

```bash
ceph config get osd osd_max_backfills
# default: 1
```

## Monitoring Progress

```bash
ceph status --format json | jq '.pgmap | {recovering_bytes_per_sec, recovering_objects_per_sec}'

watch -n5 "ceph status | grep -E 'backfill|remapped'"
```

## Controlling Backfill Speed

Backfill can saturate your storage network. Tune the rate:

```bash
# Limit concurrent backfills per OSD
ceph config set osd osd_max_backfills 1

# Limit backfill scan sizes
ceph config set osd osd_backfill_scan_min 8
ceph config set osd osd_backfill_scan_max 64

# Pause backfill entirely
ceph osd set nobackfill

# Resume
ceph osd unset nobackfill
```

## Backfill Full Condition

If the target OSD is nearly full, backfill may stall:

```bash
ceph health detail | grep "backfillfull\|too full"
ceph osd df | grep -E "ID|%"
```

## What Happens After Backfill

When backfill completes for a PG:

1. The PG transitions from `active+backfilling` to `active+clean`
2. The source OSD removes its copy if it is no longer in the acting set

```bash
watch "ceph pg stat | grep -E 'backfill|active\+clean'"
```

## Summary

The `backfilling` state represents the full migration of PG data to new or replacement OSDs. It is I/O intensive because all objects must transfer. Control backfill timing using `osd_max_backfills` or the `nobackfill` cluster flag to protect client performance during capacity expansion operations.
