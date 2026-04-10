# Validation Summary: How to Enable CephFS Mirroring in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph / CephFS (distributed filesystem)
- Kubernetes
- CephFS Mirroring (snapshot-based async replication)
- CephFilesystemMirror CRD

## Sources Consulted
- Rook CephFilesystemMirror CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-fs-mirror-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook v1.6.0 release notes: https://github.com/rook/rook/releases/tag/v1.6.0
- Rook source code (types.go — FilesystemMirroringSpec, FSMirroringSpec structs): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook source code (mirror.go — AppName constant): https://github.com/rook/rook/blob/master/pkg/operator/ceph/file/mirror/mirror.go
- Ceph CephFS mirroring documentation: https://docs.ceph.com/en/latest/cephfs/cephfs-mirroring/
- Ceph snap-schedule documentation: https://docs.ceph.com/en/latest/cephfs/snap-schedule/

## Issues Found

1. **`count` field in CephFilesystemMirror spec**: The `count` field does not exist on the `CephFilesystemMirror` CRD. This field belongs to `CephRBDMirror`. Kubernetes silently ignores unknown fields, so the YAML would apply without error but the field has no effect. Removed `count: 1` from the spec.

2. **Rook version requirement**: The post claimed `CephFilesystemMirror` requires Rook v1.7+. The CRD was actually introduced in Rook v1.6 (confirmed by v1.6.0 release notes and PR #7604). Changed to v1.6+.

3. **Bootstrap token command syntax**: The command `ceph fs snapshot mirror peer bootstrap create myfs --site-name primary` had two errors: (a) it should be `peer_bootstrap` (underscore) not `peer bootstrap` (space), and (b) the site name is a positional argument, not a `--site-name` flag, and a `client_entity` positional argument is also required. Fixed to `ceph fs snapshot mirror peer_bootstrap create myfs client.mirror_remote primary`.

4. **`dirmap` subcommand does not exist**: The command `ceph fs snapshot mirror dirmap myfs` references a non-existent subcommand. The correct command to list mirrored directories is `ceph fs snapshot mirror ls myfs`. Fixed accordingly.

5. **`status` subcommand incorrect**: `ceph fs snapshot mirror status myfs` is not a valid top-level CLI command. The correct command for checking mirroring daemon status is `ceph fs snapshot mirror daemon status` (no filesystem argument). Fixed in both the monitoring section and the failover procedure.

## Review Notes
- The `CephFilesystem` mirroring spec also supports a `snapshotRetention` field (with `path` and `duration`) that the post does not mention. This is not an error but could be a useful addition in a future update.
- The example monitoring output is illustrative/fabricated (showing a hypothetical YAML response), which is fine for a tutorial but readers should be aware the actual output format may differ.
- The failover procedure is simplified. In production, additional steps may be needed such as promoting the secondary filesystem, updating PVC/StorageClass configurations, and potentially re-establishing mirroring in the reverse direction after the primary recovers.
