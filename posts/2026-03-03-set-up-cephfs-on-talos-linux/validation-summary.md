# Validation Summary: How to Set Up CephFS on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Ceph / CephFS (POSIX-compliant distributed filesystem)
- Rook-Ceph operator (CephFilesystem, CephFilesystemSubVolumeGroup CRDs)
- Kubernetes (StorageClass, PersistentVolumeClaim, Deployment, VolumeSnapshot, VolumeSnapshotClass)
- Ceph CSI driver (`rook-ceph.cephfs.csi.ceph.com`)
- WordPress (example workload)

## Sources Consulted
- Rook CephFS filesystem docs — https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS CSI / StorageClass docs — https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFilesystemSubVolumeGroup CRD — https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Ceph FS administration — https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph monitoring / `ceph df` — https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph `ceph tell` vs `ceph daemon` semantics — https://docs.ceph.com/en/reef/rados/troubleshooting/log-and-debug/
- Kubernetes CSI VolumeSnapshot API (`snapshot.storage.k8s.io/v1`) — https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
1. **Invalid `ceph fs df` command.** The Monitoring section used `ceph fs df myfs`, which is not a valid Ceph CLI subcommand. The correct way to get pool-level usage (which is what filesystem usage maps to) is `ceph df`. Updated the command to `ceph df` with a comment noting it includes the CephFS metadata and data pools.
2. **`ceph daemon` cannot reach a remote MDS from the toolbox.** The post used `ceph daemon mds.myfs-a perf dump` from the `rook-ceph-tools` deployment. `ceph daemon` only works against a local admin-socket on the daemon's host; from the toolbox pod the daemon is remote, so the correct command is `ceph tell mds.myfs-a perf dump` (routes via the monitors). Updated accordingly.

## Review Notes
- The `CephFilesystem` spec uses the named `dataPools` format (each pool has a `name`, plus `replicated` or `erasureCoded`), which is the modern Rook format and is correct. The resulting pool name `myfs-default` referenced by the StorageClass is also correct (Rook names pools `<fsName>-<dataPoolName>`).
- `preserveFilesystemOnDelete: true` is a valid CephFilesystem field.
- StorageClass CSI secret parameters (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) match the secrets Rook creates by default.
- The erasure-coded data pool (`ec-data`) is declared but the post doesn't show how to direct files to it (e.g., setting a `ceph.dir.layout` xattr on a subdirectory). That's a more advanced topic and out of scope; not an error, just an observation.
- `ceph mds repaired myfs:0` is a destructive recovery command; the post correctly gates it behind "If MDS is in damaged state." Worth flagging to readers as last-resort, but the command itself is valid.
- WordPress example uses `wordpress:6.4`; current image is fine for a tutorial but readers may want to pull a newer tag.
- The post links to "our Rook-Ceph setup guide" without a URL; that's a soft internal reference, not a technical error.
