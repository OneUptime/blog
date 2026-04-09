# Validation Summary: How to Migrate Applications Using RBD Mirroring in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD mirroring (journal-based and snapshot-based)
- Kubernetes PersistentVolume / PersistentVolumeClaim
- ceph-csi (CSI driver for Ceph)
- kubectl CLI

## Sources Consulted
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Rook CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- ceph-csi static PV documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md
- Kubernetes in-tree RBD removal (v1.31): https://kubernetes.io/blog/2024/07/19/kubernetes-1-31-upcoming-changes/
- Ceph upstream source (rbd-mirroring.rst): https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst
- Red Hat Ceph Storage 5 Block Device Guide (mirroring): https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/block_device_guide/mirroring-ceph-block-devices

## Issues Found

### 1. In-tree RBD PV spec (Major)
**What was wrong:** Step 4 used the in-tree `rbd:` volume plugin in the PersistentVolume spec (with `monitors`, `pool`, `image`, `user`, `secretRef` fields). This plugin was deprecated in Kubernetes 1.28 and removed in Kubernetes 1.31. It will not work on any modern Kubernetes cluster.

**What was changed:** Replaced the in-tree `rbd:` spec with a CSI-based `csi:` spec using the Rook CSI driver (`rook-ceph.rbd.csi.ceph.com`), including `nodeStageSecretRef`, `volumeAttributes` (`clusterID`, `pool`, `staticVolume`, `imageFeatures`), and `volumeHandle`.

**Why:** The CSI driver is the only supported method for mounting RBD volumes in Kubernetes 1.31+, and is the recommended approach for all Rook deployments.

### 2. Incorrect `replay_lag` field reference (Minor)
**What was wrong:** Step 1 stated to wait for `replay_lag: 0s`, but `replay_lag` is not a documented field in `rbd mirror image status` output.

**What was changed:** Replaced with guidance appropriate for both journal-based mirroring (`entries_behind_primary: 0`) and snapshot-based mirroring (description shows `replaying` with no pending snapshots).

**Why:** The field `entries_behind_primary` is documented for journal-based mirroring. Snapshot-based mirroring status uses different indicators (snapshot timestamps and replay state) rather than a `replay_lag` field.

### 3. Incorrect Step 7 guidance on reversing mirror direction (Minor)
**What was wrong:** Step 7 suggested running `rbd mirror image enable` to reverse replication direction after promotion/demotion. This command enables mirroring on an image — it does not reverse direction. With pool-level mirroring and two-way peering, replication reverses automatically after demotion.

**What was changed:** Added explanation that replication reverses automatically with pool-level mirroring. Clarified that the `rbd mirror image enable` command is only needed for image-level mirroring mode.

**Why:** Running `rbd mirror image enable` on an already-mirrored image is unnecessary and could cause confusion. The automatic reversal behavior is an important property of pool-level mirroring that readers should understand.

## Review Notes
- The `kubectl get pvc` command in Step 2 (used to "verify the PVC is not mounted") only shows PVC status, not actual mount state. However, since the previous command scales the deployment to zero, this serves as a reasonable sanity check and was left as-is.
- The `entries_behind_primary` field has a known Ceph bug (tracker #23516) where the counter may not always reach 0. In older Ceph versions, this field was called `entries_behind_master`.
- The post does not distinguish between one-way and two-way peering. One-way peering does not support failback. This is a scope limitation rather than an error, but readers should be aware.
- The static PV's `volumeHandle` should be set to the RBD image name, which must be unique within the cluster.
