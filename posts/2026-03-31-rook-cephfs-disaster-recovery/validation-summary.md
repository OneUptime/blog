# Validation Summary: How to Perform CephFS Disaster Recovery

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph distributed filesystem)
- MDS (Metadata Server) daemon management
- `cephfs-data-scan` metadata reconstruction tool
- Kubernetes VolumeSnapshot API (snapshot.storage.k8s.io/v1)
- Rook CephFS CSI driver

## Sources Consulted
- Ceph official documentation: Advanced Metadata Repair Tools (https://docs.ceph.com/en/latest/cephfs/disaster-recovery-experts/)
- Ceph official documentation: FS Volumes and Subvolumes (https://docs.ceph.com/en/latest/cephfs/fs-volumes/)
- Ceph official documentation: CephFS Administrative Commands (https://docs.ceph.com/en/latest/cephfs/administration/)
- Kubernetes Volume Snapshots documentation (https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- Ceph source: ceph/src/tools/cephfs/DataScan.cc

## Issues Found

### Issue 1: Incorrect `ceph fs subvolume snapshot ls` syntax
- **What was wrong:** The command used `<group>` as a positional argument: `ceph fs subvolume snapshot ls myfs <subvolume> <group>`
- **What was changed:** Changed to use the correct named option: `ceph fs subvolume snapshot ls myfs <subvolume> --group_name <group>`
- **Why:** Per the official Ceph documentation, the subvolume group name is an optional named parameter (`--group_name`), not a positional argument. The command as written would fail with an unrecognized argument error.

### Issue 2: Missing `scan_links` step in `cephfs-data-scan` sequence
- **What was wrong:** The `cephfs-data-scan` recovery sequence went: `init` -> `scan_extents` -> `scan_inodes` -> `cleanup`, omitting the `scan_links` step.
- **What was changed:** Added `cephfs-data-scan scan_links --filesystem myfs` between `scan_inodes` and `cleanup`.
- **Why:** Per the official Ceph disaster recovery documentation, `scan_links` verifies and repairs inode linkage integrity after reconstruction. The complete documented sequence is: `init` -> `scan_extents` -> `scan_inodes` -> `scan_links` -> `cleanup`. Omitting `scan_links` could leave broken directory entries or orphaned inodes in the reconstructed metadata.

## Review Notes
- The post correctly notes that all `scan_extents` workers must complete before `scan_inodes` begins, though this constraint is implicit rather than explicitly called out. For multi-worker recovery scenarios, this ordering is critical.
- The `ceph fs set myfs joinable true` command is correct for current Ceph versions. The `joinable` flag replaced the older deprecated `cluster_down` flag.
- The VolumeSnapshotContent YAML is valid per the Kubernetes CSI snapshot API v1 specification, including the `volumeSnapshotClassName` field which is a legitimate optional field in VolumeSnapshotContent.
- The `ceph fs reset --yes-i-really-mean-it` flag is correct (single "really"); not to be confused with `--yes-i-really-really-mean-it` used by some other Ceph commands like `ceph osd pool delete`.
