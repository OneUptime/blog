# How to Repair Inconsistent Objects in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Data Repair, Consistency, OSD

Description: Learn how to identify and repair inconsistent objects in Ceph using pg repair, rados tools, and manual recovery procedures for corrupted replicas.

---

When Ceph scrubbing detects that replicas of an object differ, it marks the placement group as inconsistent. Repairing these inconsistencies restores cluster health and ensures all replicas are synchronized.

## Understanding the Inconsistency

Before repairing, understand what type of inconsistency you have:

```bash
rados list-inconsistent-pg mypool
```

Then get the object details:

```bash
rados list-inconsistent-obj 2.1a --format=json-pretty
```

Common error types:
- `size_mismatch` - object size differs across replicas
- `data_mismatch` - object content differs
- `attr_mismatch` - extended attributes differ
- `stat_error` - object metadata unreadable
- `read_error` - object data unreadable

## Standard Repair Process

The simplest repair uses the built-in pg repair command:

```bash
ceph pg repair 2.1a
```

Ceph selects the authoritative replica (based on PG logs) and overwrites the inconsistent copy.

Monitor repair progress:

```bash
watch ceph health detail
ceph pg 2.1a query | python3 -m json.tool | grep -i repair
```

## Repairing All Inconsistent PGs

Script to repair all flagged PGs:

```bash
#!/bin/bash
INCONSISTENT=$(ceph health detail | grep "is active+clean+inconsistent" | awk '{print $2}')

for pg in $INCONSISTENT; do
  echo "Repairing PG $pg"
  ceph pg repair $pg
  sleep 2
done
```

## Verifying Repair Success

After repair, check that the PG returns to clean state:

```bash
ceph pg 2.1a query | python3 -m json.tool | grep state
# Expected: "active+clean"
```

Force a new scrub to confirm the repair:

```bash
ceph pg deep-scrub 2.1a
```

## Handling Unrepairable Objects

If all replicas are corrupted and repair fails:

```bash
ceph health detail
# HEALTH_ERR: pg 2.1a has 1 unfound objects
```

List unfound objects:

```bash
ceph pg 2.1a list_unfound
```

If you have a backup, restore from it and delete the corrupted object:

```bash
rados -p mypool rm corrupted-object
rados -p mypool put corrupted-object /path/to/backup-file
```

Mark the object as lost if no recovery is possible (data loss):

```bash
ceph pg 2.1a mark_unfound_lost delete
```

## Preventing OSD Reuse After Repair

If a specific OSD repeatedly causes inconsistencies, replace it:

```bash
# Mark OSD out
ceph osd out osd.3

# Wait for rebalance
ceph -w

# Remove OSD
ceph osd purge 3 --yes-i-really-mean-it
```

## Using Rook to Replace the OSD

In Rook-managed clusters, delete the OSD pod and the operator recreates it:

```bash
kubectl -n rook-ceph delete pod rook-ceph-osd-3-xxxx
```

To fully remove an OSD and let Rook provision a replacement, annotate the node or disk appropriately per the Rook documentation.

## Summary

Repairing inconsistent objects in Ceph involves identifying the type of inconsistency, using pg repair to let Ceph self-heal using authoritative replicas, and verifying the result with follow-up scrubs. For unrecoverable objects, restoring from backups or marking objects as lost are last-resort options. Replacing repeatedly problematic OSDs prevents recurrence.
