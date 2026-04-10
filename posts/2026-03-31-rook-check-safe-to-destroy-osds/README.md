# How to Check safe-to-destroy Status for OSDs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Safety, Administration

Description: Learn how to use ceph osd safe-to-destroy to verify it is safe to remove an OSD before decommissioning it from your Ceph cluster.

---

## Why safe-to-destroy Matters

Removing an OSD from a Ceph cluster is an irreversible action. If you remove an OSD that is still the only copy of some data, or if removing it would leave PGs undersized, you risk data loss. The `ceph osd safe-to-destroy` command analyzes the cluster's current state and tells you whether it is safe to destroy a specific OSD without losing data or violating pool replication requirements.

## Running the safe-to-destroy Check

From the Rook toolbox, check whether a single OSD can be safely removed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd safe-to-destroy osd.5
```

If the OSD is safe to remove, you will see:

```text
OSD(s) 5 are safe to destroy without reducing data durability.
```

If it is not safe, you will see an error explaining why:

```text
Error EBUSY: OSD(s) 5 have 24 pgs currently mapped to them
```

## Checking Multiple OSDs

You can check multiple OSDs at once:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd safe-to-destroy osd.5 osd.6
```

This is useful when replacing a node with multiple OSDs to verify the entire node can be decommissioned simultaneously.

## What Makes an OSD Unsafe to Destroy?

An OSD is not safe to destroy when:

1. The OSD still has PGs mapped to it (it is part of the acting or up set for some PGs)
2. The OSD still stores PG data and not all PGs are active+clean
3. The cluster is already degraded - removing another OSD would reduce data durability

If the check fails, you need to wait for the cluster to fully recover before removing the OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w
```

## Pre-Removal Workflow

Use safe-to-destroy as part of a structured OSD removal workflow:

```bash
# Step 1 - mark the OSD out so data migrates away
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd out osd.5

# Step 2 - wait for recovery to complete
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w

# Step 3 - verify safe to destroy
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd safe-to-destroy osd.5

# Step 4 - stop the OSD daemon (scale down in Rook)
kubectl -n rook-ceph scale deploy rook-ceph-osd-5 --replicas=0

# Step 5 - purge the OSD from the cluster (removes from CRUSH map and OSD map)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd purge osd.5 --yes-i-really-mean-it
```

## Checking ok-to-stop for Minimal Disruption

A related command `ok-to-stop` is less conservative and checks only whether the cluster will remain operational (not necessarily fully redundant) after removal:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd ok-to-stop osd.5
```

Use `safe-to-destroy` for permanent removal and `ok-to-stop` for temporary maintenance operations like rebooting nodes.

## Summary

The `ceph osd safe-to-destroy` command is a critical safety check before removing any OSD permanently. Always mark the OSD out first, wait for full recovery, confirm with `safe-to-destroy`, then stop the OSD daemon before purging it from the cluster. This prevents accidental data loss in pools that depend on specific replication factors.
