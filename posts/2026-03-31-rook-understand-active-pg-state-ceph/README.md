# How to Understand the active PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, State, Storage, Cluster

Description: Understand what the active placement group state means in Ceph, how a PG reaches this state, and what it implies for I/O operations.

---

Placement groups (PGs) are the fundamental units of data placement in Ceph. The `active` state is the normal operating state that indicates a PG is ready to serve I/O. Understanding this state and how it combines with others is essential for interpreting `ceph status` output.

## What active Means

A PG is `active` when its primary OSD has completed the peering process and established agreement with all replica OSDs about the PG's current state and object set. In the `active` state, the PG can accept and serve both read and write operations.

## Active is Rarely Alone

In practice, you almost never see just `active` by itself. It almost always appears combined with other states:

- `active+clean` - all replicas present and consistent (healthy)
- `active+degraded` - some replicas missing, but I/O still works
- `active+remapped` - PG is being migrated to different OSDs
- `active+recovering` - recovering lost replicas in the background
- `active+backfilling` - populating a new OSD copy

## Checking PG States

```bash
# Summary of all PG states
ceph pg stat

# Detailed list of all PGs and their states
ceph pg dump | awk '{print $1, $16}'

# Count PGs by state
ceph pg stat --format json | jq '.num_pg_by_state'
```

## How a PG Becomes active

When an OSD starts, it undergoes peering for each PG it is responsible for:

1. The primary OSD identifies all acting OSDs for the PG
2. It requests the object version history (prior set) from each replica
3. All OSDs agree on the authoritative history
4. The PG transitions from `peering` to `active`

View the peering log for a PG:

```bash
ceph pg <pg-id> query | jq '.info.history'
```

## Active + Clean is the Target State

`active+clean` means the PG has the full desired number of copies and no inconsistencies:

```bash
# Check how many PGs are active+clean
ceph pg stat | grep "active+clean"

# What you want to see
# 256 active+clean
```

## Active Without Clean

PGs can be `active` but not `clean` for legitimate reasons:

```bash
# See what non-clean active PGs exist
ceph pg dump | grep "active" | grep -v "active+clean"
```

If a PG is stuck in `active+degraded` without recovering:

```bash
ceph health detail
ceph pg <pg-id> query | jq '.state'
```

## Forcing a PG to Become Active

If a PG is stuck in peering:

```bash
# Check what is blocking peering
ceph pg <pg-id> query | jq '.peering_state'

# Check which OSDs are needed
ceph pg <pg-id> query | jq '.acting'

# Last resort - force PG recreation (WARNING: causes data loss for this PG)
ceph pg force_create_pg <pg-id>
```

## Summary

The `active` PG state indicates that a PG has completed peering and is serving I/O. It is the required precondition for any data operations and is always combined with additional modifiers like `clean`, `degraded`, or `recovering` that describe the completeness and consistency of the PG's replica set. A healthy cluster has all PGs in `active+clean`.
