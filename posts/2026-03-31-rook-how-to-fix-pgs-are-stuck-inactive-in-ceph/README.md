# How to Fix 'pgs are stuck inactive' in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Placement Group, Storage

Description: Diagnose and resolve stuck inactive placement groups in Ceph by identifying root causes like missing OSDs, peering failures, and CRUSH map issues.

---

## What "pgs stuck inactive" Means

In Ceph, a placement group (PG) is the unit of data distribution. A PG becomes "inactive" when it cannot complete the peering process - meaning the OSDs responsible for that PG cannot agree on its authoritative state. Inactive PGs cannot serve reads or writes, which blocks I/O for any data mapped to those PGs.

## Step 1 - Identify Stuck PGs

Check the cluster status first:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Look for:

```text
pgs: 32 active+clean, 2 inactive+peering, 1 stale+inactive
```

Get detailed PG information:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck inactive
```

Example output:

```text
PG_STAT  STATE                  UP      UP_PRIMARY  ACTING  ACTING_PRIMARY
1.0      inactive+peering       [0,1]   0           [0,1]   0
1.1      stale+inactive+peering [2,3]   2           [2,3]   2
```

## Step 2 - Check OSD Status

Inactive PGs often indicate that OSDs are down or unavailable:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Look for OSDs marked `down`:

```text
-1 root default
-3     host worker-1
 0       osd.0 up  weight 1.0
 1       osd.1 down weight 1.0   # <-- Problem
```

Check the corresponding OSD pod:

```bash
kubectl -n rook-ceph get pods | grep osd
kubectl -n rook-ceph logs <osd-pod-for-osd-1>
```

## Step 3 - Check for Insufficient Up OSDs

A PG needs at least `min_size` OSDs to become active. If too many OSDs are down, PGs go inactive:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail | grep -E "min_size|size"
```

If you have a 3-replica pool with `min_size=2`, losing 2 of 3 OSDs causes PGs to go inactive.

## Step 4 - Force PG Peering

If OSDs are healthy but PGs are stuck, manually trigger peering:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg <pgid> query
```

This shows the current peer state for a specific PG. To force a repeer:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repeer <pgid>
```

This instructs Ceph to reset the peering process for the specified PG. It does not destroy data, but the PG will be temporarily unavailable while it re-peers.

## Step 5 - Check CRUSH Map Consistency

PGs can get stuck inactive if the CRUSH map sends them to non-existent or unreachable OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush rule dump
```

Verify that the OSD IDs referenced in CRUSH rules actually exist:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep "^osd\."
```

If ghost OSD entries exist in CRUSH but not in the OSD map, remove them:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.<id>
```

## Step 6 - Adjust min_size Temporarily (Emergency Only)

If OSDs cannot be recovered quickly and you need the cluster to serve data, temporarily lower `min_size`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> min_size 1
```

**Warning:** This reduces data redundancy and risks data loss. Only use this as a temporary emergency measure while restoring OSDs.

Restore the proper value when OSDs are back:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> min_size 2
```

## Step 7 - Restart the OSD Daemon

If an OSD pod is running but the daemon is in a bad state, restart it:

```bash
kubectl -n rook-ceph delete pod <osd-pod-name>
```

Rook will recreate the OSD pod automatically. Monitor its restart:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w
```

## Step 8 - Monitor Recovery

After OSDs come back online, watch PG recovery:

```bash
watch -n5 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status"
```

Recovery progress will show:

```text
pgs: 64 active+clean, 2 active+recovering
recovery: 1234/5678 objects degraded, 100 MiB/s
```

## Summary

Stuck inactive PGs in Ceph are almost always caused by OSDs being down or unavailable, preventing the peering process from completing. Resolve the issue by bringing failed OSD pods back online, fixing CRUSH map inconsistencies, or as a temporary emergency measure, lowering `min_size`. Once enough OSDs are up to satisfy the pool's `min_size`, PGs will peer and become active automatically.
