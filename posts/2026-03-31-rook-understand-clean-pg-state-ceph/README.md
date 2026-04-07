# How to Understand the clean PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, State, Storage, Health

Description: Learn what the clean placement group state means in Ceph, how it differs from degraded, and how to interpret combined state values.

---

The `clean` PG state indicates that all copies of a placement group's data are present and consistent across all acting OSDs. Together with `active`, it forms `active+clean`, which is the fully healthy state for a PG.

## What clean Means Precisely

A PG is `clean` when:

1. The current number of replicas equals the desired pool replica count
2. All objects in the PG are fully replicated across all acting OSDs
3. No recovery or backfill is in progress for this PG
4. The acting set matches the up set (no remapping)

## active+clean is the Goal

Every PG should eventually reach `active+clean`. When `ceph status` shows all PGs in this state, the cluster is fully healthy:

```bash
ceph status
# pgmap: 256 pgs: 256 active+clean; ...
```

Check the count:

```bash
ceph pg stat
# 256 pgs: 256 active+clean

# In JSON
ceph pg stat --format json | jq '.num_pgs_by_state[] | select(.state_name == "active+clean")'
```

## clean vs Other States

| State | Meaning |
|-------|---------|
| `active+clean` | Fully healthy, all copies present |
| `active+degraded` | Some copies missing |
| `active+clean+scrubbing` | Healthy but currently being scrubbed |
| `active+clean+snaptrim` | Healthy but trimming snapshots |

## Reaching clean After Degradation

After an OSD failure and recovery, PGs transition through several states before reaching clean:

```text
active+degraded -> active+degraded+recovering -> active+clean
```

Watch the transition:

```bash
watch ceph pg stat
```

## How Long Should It Take?

Recovery time depends on:
- Amount of data to recover
- OSD I/O capacity
- `osd_recovery_max_active` setting

Estimate using the bytes to recover:

```bash
ceph status | grep "degraded\|recovering"
# degraded (x%) objects, x/y bytes
```

## Per-PG Clean Check

Inspect a specific PG:

```bash
ceph pg <pg-id> query | jq '{state: .state, last_clean: .info.history.last_epoch_clean}'
```

## Pool-Level Clean Status

Check how many PGs per pool are clean:

```bash
ceph pg ls-by-pool mypool | awk '{print $1, $16}' | grep -v "active+clean" | head -20
```

## Triggering Scrub to Verify Clean

Even a `clean` PG might have silent data corruption. Verify by triggering a deep scrub:

```bash
ceph osd pool deep-scrub mypool
ceph health detail | grep -i "inconsistent\|error"
```

## Summary

The `clean` PG state confirms that all desired replicas are present and fully synchronized. The target healthy state for every PG is `active+clean`. When any PG deviates from this state, Ceph immediately begins recovery. Monitor how many PGs are in `active+clean` to track cluster health after OSD failures or maintenance events.
