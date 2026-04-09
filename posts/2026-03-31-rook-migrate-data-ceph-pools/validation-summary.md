# Validation Summary: How to Migrate Data Between Ceph Pools in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (RBD, CephFS, RADOS)
- Kubernetes (StorageClass, PVC, CephBlockPool, CephFilesystem CRDs)
- `rbd migration` (live block device migration)
- `rados export` / `rados import` (RADOS object migration)
- `rsync` and CephFS directory layout attributes

## Sources Consulted
- Ceph RBD Live Migration documentation: https://docs.ceph.com/en/reef/rbd/rbd-live-migration/
- Ceph Blog - RBD Live Migration in Squid: https://ceph.io/en/news/blog/2025/rbd-live-migration/
- Ceph `rados` man page source (doc/man/8/rados.rst): https://github.com/ceph/ceph/blob/main/doc/man/8/rados.rst
- Ceph `rados.cc` source code for `cppool` warnings: https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc
- Ceph bug tracker #10671 (cppool EC pool incompatibility): https://tracker.ceph.com/issues/10671
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/

## Issues Found

### Issue 1: `rbd migration execute`, `rbd status`, and `rbd migration commit` used the wrong image spec
- **What was wrong:** After `rbd migration prepare source/image dest/image`, the post used the source pool spec (`replicapool/csi-vol-abc123`) for the `execute`, `status`, and `commit` commands. Per Ceph documentation, the source image is moved to RBD trash after `prepare`, making the source spec invalid. All subsequent commands must use the destination image spec.
- **What was changed:** Updated `rbd migration execute`, `rbd status`, and `rbd migration commit` commands to use `replicapool-new/csi-vol-abc123` (the destination spec).
- **Why:** Using the source spec after prepare would fail with "No such file or directory". The official Ceph live migration docs explicitly show the destination spec for all post-prepare commands.

### Issue 2: `rados cppool` is effectively deprecated
- **What was wrong:** The post recommended `rados cppool` for migrating RADOS objects. This command has been removed from official Ceph documentation, prints warnings about not preserving `user_version` and selfmanaged snapshots, and does not work with erasure-coded destination pools.
- **What was changed:** Replaced `rados cppool` with the documented `rados export` / `rados import` workflow. Added a note explaining why `rados cppool` should be avoided.
- **Why:** The official `rados` man page documents `export`/`import` but no longer documents `cppool`. Using `cppool` risks silent data loss (missing metadata) and will fail entirely with EC pools.

## Review Notes
- The CephBlockPool and CephFilesystem CRD YAML snippets are correct for current Rook versions.
- The StorageClass configuration for Rook CSI RBD is correct and includes all required secret references.
- The `setfattr` command for CephFS directory layout pool is correct but would need to be run from within a pod that has the CephFS volume mounted, not from the toolbox pod directly. The post's context implies this (it shows a `/mnt/cephfs/` path) but doesn't explicitly state it.
- The post mentions "Kubernetes volume cloning techniques" in the description but does not actually cover volume cloning. This is a minor metadata inconsistency but not a technical error in the content itself.
