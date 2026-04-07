# How to Revert Lost RADOS Objects with pg mark_unfound_lost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, Recovery, Placement Group

Description: Learn how to use Ceph's pg mark_unfound_lost command to handle unrecoverable RADOS objects and restore cluster health after data loss events.

---

## Understanding Unfound Objects in Ceph

When Ceph cannot locate all copies of an object after OSD failures, the affected placement group (PG) enters a state containing `unfound`. Unfound objects are those where Ceph knows the object existed but cannot find a readable copy on any available OSD.

This situation typically arises when:
- Multiple OSDs in a failure domain fail simultaneously
- OSDs are removed before recovery completes
- A journal or write-ahead log is lost

## Identifying Unfound Objects

```bash
# Check cluster health for unfound objects
ceph health detail

# List PGs with unfound objects
ceph health detail | grep unfound

# Count unfound objects in a specific PG
ceph pg 2.5 query | python3 -m json.tool | grep num_unfound
```

Example output:

```text
HEALTH_ERR 1 pg has unfound objects
pg 2.5 is active+recovering+degraded, 3 unfound
  3 unfound objects
```

## Exploring Recovery Options

Before marking objects as lost, exhaust all recovery options:

```bash
# Check if OSDs carrying the data are offline but recoverable
ceph osd tree | grep down

# Try to restart down OSDs
# In Rook, delete the OSD pod to trigger restart
kubectl -n rook-ceph delete pod rook-ceph-osd-X-xxxxxxxxx

# Check if any OSD was just marked out too quickly
ceph osd dump | grep osd.X
```

If the OSD data is truly unrecoverable, proceed with marking objects lost.

## Using pg mark_unfound_lost

The `pg mark_unfound_lost` command accepts two modes:

- `revert` - rolls back to a previous version of the object if one exists, otherwise deletes it
- `delete` - unconditionally deletes the unfound objects

```bash
# Revert unfound objects to a prior version (preferred)
ceph pg 2.5 mark_unfound_lost revert

# Delete unfound objects (use only if revert is not possible)
ceph pg 2.5 mark_unfound_lost delete
```

The `revert` option is safer for most cases since object stores like RGW often have prior snapshots or versions.

## Verifying the Fix

After running the command, confirm the PG recovers:

```bash
# Watch PG state transitions
watch -n 3 "ceph pg dump pgs | grep '2.5'"

# Check cluster health clears
ceph health

# Verify no more unfound objects
ceph pg dump_stuck unfound
```

## Application-Level Considerations

After marking objects lost, consider application-level recovery:

```bash
# For RGW (object storage), check for affected objects
radosgw-admin object stat --bucket=mybucket --object=myobject

# List recently accessed objects in the affected pool
rados -p default.rgw.buckets.data ls | head -20

# For RBD volumes, check image consistency
rbd info myimage --pool=rbd
```

## Preventing Future Data Loss

```bash
# Ensure minimum replicas before writes are allowed per pool
ceph osd pool set <pool-name> min_size 2

# Set conservative noout to prevent premature OSD removal
ceph config set global mon_osd_down_out_interval 600

# Enable erasure coding for better resilience
ceph osd pool create ec-pool 64 64 erasure myprofile
```

## Summary

The `pg mark_unfound_lost` command is a last-resort tool for resolving PGs stuck with unrecoverable objects. Always prefer `revert` over `delete` to preserve any available prior object versions. After resolving unfound objects, audit your failure domain configuration and replication settings to prevent future data loss scenarios.
