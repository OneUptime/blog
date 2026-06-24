# How to Fix BLUESTORE_NO_PER_PG_OMAP Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, OMAP, Placement Group

Description: Learn how to resolve the BLUESTORE_NO_PER_PG_OMAP health warning in Ceph by migrating OSD OMAP storage to per-PG namespaces for improved performance and isolation.

---

## Understanding BLUESTORE_NO_PER_PG_OMAP

`BLUESTORE_NO_PER_PG_OMAP` indicates that one or more OSDs have volumes that were created prior to Ceph Pacific (16.x). In Pacific and later releases, BlueStore tracks OMAP space utilization by Placement Group (PG). Per-PG OMAP allows faster PG removal when PGs migrate between OSDs.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN OSDs are not using per-pg omap
[WRN] BLUESTORE_NO_PER_PG_OMAP: 12 OSDs are not using per-pg omap
    osd.0 - osd.11 have not been converted to per-pg omap
```

## Prerequisites

- Your cluster must be running Ceph Pacific (16.x) or later.
- Ensure that per-pool OMAP migration is complete first. Check for the related warning:

```bash
ceph health detail | grep BLUESTORE_NO_PER_POOL_OMAP
```

If the per-pool warning still appears, complete that migration before working on per-PG OMAP.

## Fixing Per-PG OMAP via BlueStore Repair

The fix is to stop each affected OSD, run `ceph-bluestore-tool repair`, and restart it. For example, to fix osd.0:

```bash
systemctl stop ceph-osd@0
ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-0
systemctl start ceph-osd@0
```

Repeat for each affected OSD listed in the health warning.

## Migrating All Affected OSDs

To repair multiple OSDs, work through them one at a time:

```bash
for osd_id in 0 1 2 3 4 5 6 7 8 9 10 11; do
  echo "Repairing osd.$osd_id..."
  systemctl stop ceph-osd@$osd_id
  ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-$osd_id
  systemctl start ceph-osd@$osd_id
  echo "Waiting for OSD to rejoin cluster..."
  sleep 10
done
```

**Important:** Each OSD is briefly unavailable during repair. On production clusters, repair one OSD at a time and wait for the cluster to return to a healthy state between repairs to maintain data redundancy.

## Checking Migration Status

Monitor progress via health detail:

```bash
ceph health detail | grep BLUESTORE_NO_PER_PG_OMAP
```

The count of unconverted OSDs decreases as repairs complete.

## Rook Deployments

In Rook-managed clusters, the repair must be run from within the OSD pod or a debug container. The OSD daemon must be stopped before running repair.

Check which OSDs need repair:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph health detail
```

For containerized environments using cephadm or Rook, you may need to enter the OSD container and run the repair tool directly against the OSD data path. Consult the Rook documentation for your version on how to perform OSD maintenance operations.

## Benefits of Per-PG OMAP

After migration:
- PG removal is faster when PGs migrate between OSDs
- PG splitting and merging is more efficient
- OMAP space utilization tracking is more granular per PG

## Verifying Completion

```bash
ceph health detail
```

Once all OSDs have been repaired, the `BLUESTORE_NO_PER_PG_OMAP` health warning disappears.

## Summary

`BLUESTORE_NO_PER_PG_OMAP` warns that OSDs created before Ceph Pacific are not using per-PG OMAP tracking. The fix is to stop each affected OSD, run `ceph-bluestore-tool repair`, and restart it. On production clusters, repair one OSD at a time and wait for the cluster to stabilize between repairs to maintain data redundancy.
