# How to Fix OSD_ORPHAN Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, CRUSH, Cleanup

Description: Learn how to resolve the OSD_ORPHAN health warning in Ceph when OSDs exist in the OSD map but are absent from the CRUSH map, causing them to be unreachable.

---

## Understanding OSD_ORPHAN

`OSD_ORPHAN` fires when one or more OSDs exist in the OSD map (authenticated and registered) but have no entry in the CRUSH map. Without a CRUSH map entry, the cluster cannot route data to those OSDs, making them effectively orphaned. This can happen after failed OSD removal operations or when CRUSH map entries are manually deleted without removing the OSD from the OSD map.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN osds exist in the OSD map but not in the CRUSH map
[WRN] OSD_ORPHAN: osd.12 exists in OSD map but has no CRUSH entry
```

## Identifying Orphaned OSDs

Compare OSD map entries with CRUSH map entries:

```bash
# List all OSDs in the OSD map
ceph osd dump | grep "^osd\." | awk '{print $1}'

# List OSDs in the CRUSH map
ceph osd crush tree --show-shadow | grep osd
```

The difference between these two lists identifies orphaned OSDs.

Alternatively, check for orphans directly - orphaned OSDs appear under the `stray` section in the OSD tree:

```bash
ceph osd tree | grep stray
```

## Option 1: Add the OSD Back to CRUSH

If the OSD's disk is healthy and data on it should be preserved, add it back to the CRUSH map:

```bash
# Find the host where the OSD belongs
ceph osd find 12

# Add it back to the CRUSH map under its host
ceph osd crush add osd.12 1.0 host=<hostname>
```

Verify the OSD is now in the CRUSH map:

```bash
ceph osd crush tree | grep osd.12
```

## Option 2: Remove the Orphaned OSD

If the OSD's disk is gone or the data has been migrated away, remove the orphan completely:

```bash
# Mark it down and out
ceph osd down 12
ceph osd out 12

# Wait for data migration to complete
ceph -w  # watch until backfill completes

# Remove from OSD map
ceph osd purge 12 --yes-i-really-mean-it
```

Verify the OSD is gone:

```bash
ceph osd stat
ceph osd dump | grep "osd.12"
```

## Fixing in Rook-Ceph

In Rook, orphaned OSDs can occur after a failed OSD removal. Check for orphaned OSD deployments:

```bash
kubectl -n rook-ceph get deployments | grep osd
```

If a deployment exists for an OSD that should be removed:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-osd-12
```

Also check if the OSD ConfigMap has stale entries:

```bash
kubectl -n rook-ceph get configmap rook-ceph-osd-info -o yaml
```

## Preventing Orphaned OSDs

Always use the proper Rook OSD removal procedure:

```bash
# Scale down the OSD deployment
kubectl -n rook-ceph scale deployment rook-ceph-osd-<id> --replicas=0

# Use Rook's OSD removal job
kubectl -n rook-ceph create -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/osd-purge.yaml
```

Never manually edit the CRUSH map without also updating the OSD map, and vice versa.

## Summary

`OSD_ORPHAN` means an OSD is registered in the OSD map but missing from the CRUSH map. If the OSD disk is healthy, add it back to CRUSH with `ceph osd crush add`. If the OSD is no longer needed, purge it completely with `ceph osd purge`. In Rook, use the official OSD removal job to avoid leaving orphans. Always use proper procedures for OSD lifecycle management.
