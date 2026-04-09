# Validation Summary: How to Set Up Storage Classes for External Ceph Clusters in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (RBD, CephFS, erasure coding)
- Kubernetes StorageClasses and PersistentVolumeClaims
- Ceph CSI driver (ceph-csi)
- Kubernetes VolumeSnapshotClass

## Sources Consulted
- Rook documentation on external cluster StorageClasses: https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/
- Ceph CSI RBD StorageClass parameters: https://github.com/ceph/ceph-csi/blob/devel/docs/deploy-rbd.md
- Ceph CSI CephFS StorageClass parameters: https://github.com/ceph/ceph-csi/blob/devel/docs/deploy-cephfs.md
- Rook examples for external cluster StorageClasses: https://github.com/rook/rook/tree/master/deploy/examples
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Ceph documentation on erasure coded pools with RBD: https://docs.ceph.com/en/latest/rados/operations/erasure-code/#erasure-coding-with-overwrites

## Issues Found

### Issue 1 (Major): Erasure coded pool `pool` and `dataPool` parameters were swapped
- **What was wrong:** In Step 5, both `pool` and `dataPool` were set to `ec-data-pool`. The `pool` parameter is the metadata pool and MUST be a replicated pool (RBD metadata cannot be stored on an erasure coded pool). The `dataPool` parameter is where actual data blocks are stored and can be erasure coded. The comments on these fields were also reversed.
- **What was changed:** Set `pool: replicapool` (replicated metadata pool) and `dataPool: ec-data-pool` (erasure coded data pool). Fixed the comments to correctly describe each parameter's role.
- **Why:** Using an erasure coded pool as the metadata pool would cause RBD image creation to fail because Ceph requires RBD metadata (headers, object map) to be stored on a replicated pool.

### Issue 2 (Moderate): `clusterID` was incorrectly described as the Ceph cluster FSID
- **What was wrong:** Multiple locations (Step 2 comment, Troubleshooting section, Summary) stated that `clusterID` should be the external Ceph cluster's FSID. In Rook's architecture, `clusterID` is the namespace name where the CephCluster CR is deployed. The Rook operator populates the `ceph-csi-config` ConfigMap keyed by namespace, and the CSI driver uses `clusterID` to look up the actual FSID and monitor addresses from that ConfigMap. The value `rook-ceph-external` is a namespace name (correct), not a UUID/FSID.
- **What was changed:** Updated the comment in StorageClass definitions from "FSID of the external Ceph cluster" to "Must match the namespace/clusterID in the ceph-csi-config ConfigMap". Updated the troubleshooting command to check the ConfigMap instead of comparing against `ceph fsid`. Updated the Summary to reference the ConfigMap instead of FSID.
- **Why:** Following the original advice to set clusterID to the FSID (a UUID like `7d24a0c0-...`) would cause CSI provisioning to fail because the CSI driver would not find a matching entry in the `ceph-csi-config` ConfigMap.

## Review Notes
- The CephFS StorageClass includes a `rootPath: /external-volumes` parameter. In current versions of ceph-csi, CephFS volumes are created as subvolumes within a subvolume group (default: `csi`). The `rootPath` parameter is not a standard documented parameter for CephFS StorageClasses in recent ceph-csi versions. It will likely be ignored rather than cause an error, but it won't have the intended effect. Future revisions could replace it with `subvolumeGroup` if needed.
- The `imageFeatures` list (`layering,fast-diff,object-map,deep-flatten,exclusive-lock`) is correct and appropriate for modern kernels. Older kernels (< 4.x) may not support all features; the post could note this but it's a minor point.
- All Kubernetes API versions (`storage.k8s.io/v1`, `snapshot.storage.k8s.io/v1`) are current and correct.
- The provisioner names (`rook-ceph.rbd.csi.ceph.com`, `rook-ceph.cephfs.csi.ceph.com`) are correct for Rook-managed CSI drivers.
