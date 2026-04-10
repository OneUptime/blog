# Validation Summary: How to Configure Rook-Ceph with Custom Storage Profiles

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system — block pools, erasure coding, CephFS)
- Kubernetes (StorageClass, PersistentVolumeClaim, CSI)
- Ceph CSI Driver (RBD and CephFS provisioners)
- LUKS (per-volume encryption via Ceph CSI)
- fio (flexible I/O tester for benchmarking)

## Sources Consulted
- Rook official documentation — Block Storage (RBD) StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook official example for erasure-coded StorageClass (`storageclass-ec.yaml`): confirms that EC pools require a separate replicated pool for RBD metadata (OMAP data)
- Rook official documentation — CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook official documentation — CephFilesystem CRD: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Kubernetes documentation — StorageClass: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Ceph documentation — Erasure Coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- kubectl annotate documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found

### Issue 1: Erasure-coded pool used as RBD metadata pool (Critical)
**What was wrong:** In Profile 3 (Erasure-Coded Archival Storage), the StorageClass set both `pool: archive-pool` and `dataPool: archive-pool`, where `archive-pool` is an erasure-coded pool. RBD images store metadata (OMAP data) in the pool specified by the `pool` parameter, and OMAP data **cannot** be stored in erasure-coded pools — it requires a replicated pool. This configuration would fail at runtime.

**What was changed:** Added a new replicated CephBlockPool named `archive-metadata-pool` (3x replicated on HDD) to serve as the metadata pool. Changed the StorageClass `pool` parameter from `archive-pool` to `archive-metadata-pool`, keeping `dataPool: archive-pool` for the actual EC data storage. This matches the pattern shown in Rook's official `storageclass-ec.yaml` example.

**Why:** Ceph's RADOS Gateway and RBD require OMAP operations for metadata, which are only supported on replicated pools. Without a replicated metadata pool, PVC provisioning against this StorageClass would fail.

### Issue 2: `kubectl annotate` missing `--overwrite` flag
**What was wrong:** The "Documenting Storage Profiles for Teams" section uses `kubectl annotate` to set the `storageclass.kubernetes.io/description` annotation, but this annotation is already defined in the StorageClass YAML manifests applied earlier. Running `kubectl annotate` without `--overwrite` on an annotation that already exists will fail with an error: `--overwrite is false but found the following declared annotation(s): storageclass.kubernetes.io/description`.

**What was changed:** Added `--overwrite` flag to both `kubectl annotate` commands.

**Why:** Without `--overwrite`, the commands shown in the blog would error out, confusing readers following the tutorial.

## Review Notes
- The fio benchmarking section assumes PVCs named `${profile}-test` (e.g., `rook-ceph-hot-test`) already exist but does not show how to create them. This is not technically incorrect but readers may need to create those PVCs first.
- The `compression_algorithm: zstd` parameter in the archive pool's `parameters` block is valid but worth noting that this is a Ceph BlueStore setting, not a Rook-specific one. Rook passes it through to Ceph.
- All CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`, `rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) match the default names created by the Rook operator.
- The erasure coding overhead calculation (4+2 EC = 1.5x) is correct: 6 total chunks / 4 data chunks = 1.5x storage overhead.
