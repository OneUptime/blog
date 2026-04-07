# How to Understand the remapped PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, State, CRUSH, Storage

Description: Understand the Ceph remapped PG state, what causes it, how it interacts with backfill, and when to be concerned about PGs stuck in this state.

---

The `remapped` PG state means the CRUSH algorithm has calculated a new set of OSDs for the PG (the `up` set), but the PG has not yet finished migrating to those OSDs (the `acting` set still points to the old locations). Remapping is a transitional state that precedes backfilling.

## What remapped Means

Ceph maintains two OSD lists for each PG:

- `up` set: the OSDs CRUSH currently assigns the PG to
- `acting` set: the OSDs actually hosting the PG right now

When these differ, the PG is `remapped`. Backfill brings the acting set in line with the up set.

## Checking Remapped PGs

```bash
ceph pg stat | grep remapped

# Detailed list
ceph pg dump | grep remapped

# For a specific PG
ceph pg <pg-id> query | jq '{state: .state, up: .up, acting: .acting}'
```

## What Causes Remapping

1. Adding new OSDs (CRUSH assigns new PG targets)
2. Changing OSD weights
3. Modifying CRUSH rules
4. Removing or marking out OSDs

```bash
# Check if CRUSH map recently changed
ceph osd dump | grep epoch
ceph osd dump --format json | jq '.epoch'
```

## remapped + backfilling

The most common combined state is `active+remapped+backfilling`. This means:

- PG is active and serving I/O from the old acting set
- Backfill is copying data to the new up set
- The PG will transition to `active+clean` when backfill completes

```bash
ceph pg dump | awk '{if ($16 ~ /remapped/) print $1, $16}' | head -20
```

## remapped Without Backfilling

If a PG is `active+remapped` but NOT backfilling, backfill may be queued (`backfill_wait`) due to the `osd_max_backfills` limit:

```bash
ceph pg dump | grep "remapped" | grep -v "backfill"
```

Check the backfill limit:

```bash
ceph config get osd osd_max_backfills
```

Increase it to allow more concurrent backfills:

```bash
ceph config set osd osd_max_backfills 3
```

## Stuck Remapped PGs

If PGs stay remapped for a long time without making progress:

```bash
ceph health detail | grep "stuck"

# Check if nobackfill is set
ceph osd dump | grep flags

# Check if target OSD is too full
ceph df | grep -E "OSD|%"
```

## Impact on I/O

Remapped PGs read from and write to the current `acting` set. Client I/O is not impacted by remapping - the cluster handles the redirection transparently.

## Checking Up vs Acting Set

```bash
ceph pg dump --format json | jq '.pg_stats[] | select(.up != .acting) | {pgid, up, acting}'
```

## Summary

The `remapped` PG state indicates a mismatch between where CRUSH wants the PG and where it currently lives. It is a normal transitional state that occurs whenever the CRUSH map changes due to OSD additions, removals, or weight changes. It resolves automatically as backfill completes. If remapped PGs are not making progress, check for `nobackfill` flags, `osd_max_backfills` limits, or OSDs that are too full to accept data.
