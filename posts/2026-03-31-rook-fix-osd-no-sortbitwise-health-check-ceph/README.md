# How to Fix OSD_NO_SORTBITWISE Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Upgrade, Object

Description: Learn how to resolve the OSD_NO_SORTBITWISE health warning in Ceph by enabling bitwise object sorting required for Jewel and later versions.

---

## Understanding OSD_NO_SORTBITWISE

`OSD_NO_SORTBITWISE` fires when the cluster-wide `sortbitwise` flag is not set. This flag was introduced in Ceph Jewel (10.x) and controls how objects are sorted within RADOS. The new bitwise sort order is required for all OSDs running Jewel or later and enables important features. If this flag is missing, Ceph warns because it indicates either an incomplete upgrade or a misconfiguration.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN osd(s) are not using bitwise sort
[WRN] OSD_NO_SORTBITWISE: osd(s) are not using bitwise sort
```

## Checking the Current Flag State

Inspect the OSD map flags:

```bash
ceph osd dump | grep flags
```

If `sortbitwise` is absent from the flags, it needs to be set.

## Checking OSD Versions

Before setting this flag, ensure all OSDs are running Jewel (10.x) or later. The flag is not compatible with pre-Jewel OSDs:

```bash
ceph versions
```

All daemons should report Jewel or later. If any are older, complete the upgrade first.

## Setting the sortbitwise Flag

Once all OSDs are on Jewel or later:

```bash
ceph osd set sortbitwise
```

Verify it was applied:

```bash
ceph osd dump | grep flags
```

The output should now include `sortbitwise`:

```text
flags sortbitwise
```

## Checking for Side Effects

Setting `sortbitwise` changes the sort algorithm used for object enumeration but does not trigger any data movement or PG reordering. The change takes effect immediately for future operations like scrubbing and listing. Monitor the cluster briefly to confirm the health warning clears:

```bash
ceph -w
```

The warning should clear within a few seconds as monitors pick up the updated OSD map.

## This Flag on Modern Clusters

In Ceph Luminous (12.x) and later, `sortbitwise` is always required and is set automatically during cluster creation. If you are seeing `OSD_NO_SORTBITWISE` on a modern cluster, it means:

1. The cluster was originally created with pre-Jewel Ceph and upgraded
2. The flag was manually unset (which should never be done)

Check cluster creation history:

```bash
ceph osd dump | head -5
```

The `epoch` and `created` fields help determine when the cluster was first initialized.

## Rook Deployments

In Rook-managed clusters, this flag is set automatically during cluster initialization. If it is missing on a Rook cluster, check if a custom CRUSH map or osdmap was injected:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd dump | grep flags
```

Set it via the toolbox:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph osd set sortbitwise
```

## Preventing Regression

Never manually unset sortbitwise on a modern cluster:

```bash
# DO NOT run this on a post-Jewel cluster
# ceph osd unset sortbitwise
```

Unsetting this flag after objects have been written with bitwise ordering can cause data access issues.

## Summary

`OSD_NO_SORTBITWISE` warns that the bitwise object sort flag is not enabled. This flag is required for all clusters running Ceph Jewel (10.x) or later. Fix by running `ceph osd set sortbitwise` after confirming all OSDs are on Jewel or newer. On modern Rook clusters, this should be set automatically - if it is missing, it likely indicates a cluster that was upgraded from a pre-Jewel version without this step.
