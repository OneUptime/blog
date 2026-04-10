# Validation Summary: How to Enable CephFS Mirroring Daemons in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph CephFS (distributed filesystem)
- CephFS mirroring (cephfs-mirror daemon)
- Kubernetes CRDs (CephFilesystemMirror, CephFilesystem)
- Kubernetes scheduling (nodeAffinity, podAntiAffinity)

## Sources Consulted
- Rook CephFilesystemMirror CRD documentation: https://rook.io/docs/rook/v1.12/CRDs/Shared-Filesystem/ceph-fs-mirror-crd/
- Rook Filesystem Mirroring guide: https://rook.io/docs/rook/v1.12/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-mirroring/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph CephFS Mirroring documentation: https://docs.ceph.com/en/latest/dev/cephfs-mirroring/
- Ceph CephFS Snapshot Mirroring (Quincy): https://docs.ceph.com/en/quincy/cephfs/cephfs-mirroring/
- Ceph Snapshot Scheduling Module: https://docs.ceph.com/en/reef/cephfs/snap-schedule/
- Rook GitHub CephFilesystemMirror CRD source: https://github.com/rook/rook/blob/master/Documentation/CRDs/Shared-Filesystem/ceph-fs-mirror-crd.md

## Issues Found

1. **Invalid `count` field in CephFilesystemMirror spec**: The `count: 1` field was specified under the CephFilesystemMirror spec, but this field does not exist in the CRD. The CephFilesystemMirror CRD supports `placement`, `annotations`, `labels`, `resources`, and `priorityClassName` -- but not `count`. Rook deploys a single cephfs-mirror daemon per CephFilesystemMirror CR. Removed the `count` field from the deploy section.

2. **Invalid `count` field in placement example**: The placement section also included `count: 2`, which is not a valid CephFilesystemMirror field. Removed it.

3. **Incorrect prerequisite check command**: The command `ceph module ls | grep mirroring` was used to verify CephFS mirroring availability. However, `ceph module ls` is not the correct command (the mgr module command is `ceph mgr module ls`), and the "mirroring" mgr module is for RBD mirroring monitoring, not CephFS mirroring. CephFS mirroring uses the standalone `cephfs-mirror` daemon, which doesn't require a specific mgr module. Changed the prerequisite check to `ceph version` to verify Ceph Pacific (16.x) or later is running.

4. **Invalid `prefix` field in snapshotRetention**: The `snapshotRetention` entries used `prefix: "scheduled"`, which is not a valid field. The Rook SnapshotRetentionSpec only supports `path` and `duration` fields. Removed `prefix` and added `path: "/"` instead.

5. **Incorrect mirroring status command**: `ceph fs snapshot mirror status myfs` is not a valid Ceph command. The correct command for checking daemon status is `ceph fs snapshot mirror daemon status`. Fixed the command.

6. **Incorrect peer list command syntax**: `ceph fs snapshot mirror peer list myfs` should use an underscore: `ceph fs snapshot mirror peer_list myfs`. Fixed to match the actual Ceph CLI syntax.

## Review Notes
- The minimum version stated as "Rook v1.8+" is conservative but reasonable. CephFilesystemMirror CRD support was initially introduced in the Rook 1.6 release cycle, but v1.8+ is a reasonable recommendation for stable mirroring support.
- The `snapshotSchedules` `startTime` format `"00:00:00"` (time-only) is acceptable. The Rook docs also show time-with-timezone format like `"11:55:00-06:00"` and full ISO 8601 datetime. All are valid.
- The pod label `app=rook-ceph-fs-mirror` follows Rook's standard naming convention and is consistent with how Rook labels other daemon pods.
- The post correctly notes that only a single peer is supported, consistent with Ceph Pacific limitations.
- The Mermaid architecture diagram accurately represents the mirroring flow.
