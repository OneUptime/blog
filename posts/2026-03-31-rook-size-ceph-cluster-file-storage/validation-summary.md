# Validation Summary: How to Size a Ceph Cluster for File Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Ceph MDS (Metadata Server)
- Kubernetes StorageClass and CSI
- RADOS

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph CephFS documentation: https://docs.ceph.com/en/latest/cephfs/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph admin socket vs `ceph tell` documentation: https://docs.ceph.com/en/latest/man/8/ceph/#tell
- Ceph CephFS quotas documentation: https://docs.ceph.com/en/latest/cephfs/quota/
- Rook CephFS StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/

## Issues Found

1. **Incorrect `ceph daemon` usage from toolbox pod**: The monitoring section used `ceph daemon mds.0 dump cache` which requires a local admin socket on the MDS node. This cannot work from the Rook toolbox pod. Changed to `ceph tell mds.0 perf dump` which communicates via the Ceph monitor and works from any pod with Ceph client access. Also fixed the Python parsing to extract `mds_mem.ino` (the cached inode count metric) instead of the non-existent `inodes` key from `dump cache` output.

2. **Missing `kubectl exec` wrapper on `getfattr` command**: The quota check command `getfattr -n ceph.quota.max_bytes /mnt/cephfs/tenant-a` was a bare shell command, inconsistent with all other commands in the post which use `kubectl exec` into the toolbox pod. Added the `kubectl exec` wrapper for consistency and correctness in a Kubernetes context.

3. **Inconsistent MDS RAM recommendation in summary**: The hardware section recommends "32-64GB per active MDS" but the summary stated "allocate 16-32GB per active MDS". Corrected the summary to "32-64GB" to match the hardware recommendations section.

## Review Notes
- The capacity calculation uses a 0.8 utilization factor (80% full target), which is a reasonable and commonly recommended threshold for Ceph clusters to avoid performance degradation.
- The metadata pool estimate of 2% of raw data pool size is within the stated 1-5% range and reasonable for typical workloads, though metadata-heavy workloads (many small files) may need more.
- The `ceph tell mds.0` command assumes the MDS daemon is named `mds.0`; in Rook deployments, MDS names typically follow patterns like `mds.cephfs-a` or `mds.cephfs-b`. Users may need to adapt the MDS name. This is acceptable for a guide but worth noting.
- The `ceph daemon` to `ceph tell` distinction is an important operational detail — `ceph daemon` is local-only (admin socket), while `ceph tell` routes through the monitors and works remotely.
