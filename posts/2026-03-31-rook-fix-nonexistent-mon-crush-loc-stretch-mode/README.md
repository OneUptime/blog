# How to Fix NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Stretch Mode, Health Check

Description: Learn how to fix NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE in Ceph, a warning that a monitor has a CRUSH location that does not exist in the cluster's CRUSH map.

---

## What Is NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE?

`NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE` is a Ceph health warning that fires in stretch mode clusters when a monitor's configured CRUSH location points to a bucket or node that does not exist in the current CRUSH map. In stretch mode, monitors must be assigned to CRUSH locations so Ceph knows which datacenter each monitor belongs to for quorum and failover decisions.

If a monitor's CRUSH location is stale (e.g., the bucket was renamed or removed), this warning appears.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE: Monitor has non-existent CRUSH location
    mon.b has crush_location datacenter=datacenter-C which doesn't exist in crush map
```

Check monitor CRUSH locations:

```bash
ceph mon dump
```

View the CRUSH map to see what locations exist:

```bash
ceph osd crush tree --show-shadow
```

## Finding the Discrepancy

Compare monitor locations vs CRUSH map buckets:

```bash
ceph mon dump | grep crush_location
ceph osd crush dump | grep -E "type_id|name"
```

The monitor's `crush_location` must reference an existing CRUSH bucket.

## Fix Steps

### Step 1 - Identify the Missing CRUSH Bucket

The warning tells you which location is missing. Confirm it doesn't exist:

```bash
ceph osd crush ls datacenter-C
```

If this returns an error, the bucket truly does not exist.

### Step 2 - Option A - Create the Missing CRUSH Bucket

If the bucket should exist (e.g., it was accidentally deleted):

```bash
ceph osd crush add-bucket datacenter-C datacenter
ceph osd crush move datacenter-C root=default
```

Then assign OSDs to it:

```bash
ceph osd crush move osd.X datacenter=datacenter-C host=node-c1
```

### Step 3 - Option B - Update the Monitor's CRUSH Location

If the datacenter was renamed, update the monitor to point to the correct bucket:

```bash
ceph mon set_location b datacenter=datacenter-B
```

### Step 4 - Option C - Remove the Monitor from Stretch Mode

If the monitor should be the tiebreaker:

```bash
ceph mon set_location b datacenter=tiebreaker
```

### Step 5 - Verify Stretch Mode Configuration

After fixing the CRUSH location:

```bash
ceph mon dump | grep stretch
ceph health
```

## Rook Monitor CRUSH Location

In Rook, monitor CRUSH locations are set via the stretch cluster configuration:

```yaml
spec:
  mon:
    stretchCluster:
      zones:
      - name: datacenter-A
        arbiter: false
      - name: datacenter-B
        arbiter: false
      - name: tiebreaker
        arbiter: true
```

Rook automatically assigns monitors to their respective zones.

## Summary

`NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE` means a monitor references a CRUSH location that does not exist in the cluster's CRUSH map. Fix it by either creating the missing CRUSH bucket and populating it with OSDs, or updating the monitor's CRUSH location to point to an existing bucket. In Rook-managed clusters, updating the stretch cluster zone configuration handles this automatically.
