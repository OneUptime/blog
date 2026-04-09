# Validation Summary: How to Set Up CephFS Mirroring with CephFilesystemMirror CRD in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- CephFS mirroring (cephfs-mirror daemon)
- Kubernetes CRDs (CephFilesystemMirror, CephFilesystem)
- Ceph CLI tools

## Sources Consulted
- Rook CephFilesystemMirror CRD source code (`pkg/apis/ceph.rook.io/v1/types.go` — `FilesystemMirroringSpec` struct)
- Rook filesystem mirroring documentation (`Documentation/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-mirroring.md`)
- Rook CephFilesystem CRD documentation (`Documentation/CRDs/Shared-Filesystem/ceph-filesystem-crd.md`)
- Rook example manifests (`deploy/examples/filesystem-mirror.yaml`, `deploy/examples/filesystem.yaml`)
- Rook filesystem mirror client code (`pkg/daemon/ceph/client/filesystem_mirror.go`)
- Ceph upstream documentation on cephfs-mirror daemon and snap-schedule

## Issues Found

1. **Mirror daemon deployment scope (High severity)**: The post incorrectly stated the `CephFilesystemMirror` daemon must be deployed on "both source and target clusters." Per Rook documentation, the daemon only needs to run on the source/primary cluster. Fixed "both source and target clusters" to "the source cluster" in Step 1 and the Summary.

2. **`startTime` format (Medium severity)**: The `startTime` value was `"00:00:00-00:00"` (a non-standard time-only format). The Rook CRD documentation specifies ISO 8601 format `YYYY-MM-DDTHH:MM:SS`. Fixed to `"2026-03-31T00:00:00"`.

3. **`peer bootstrap` subcommand syntax (High severity)**: The Ceph CLI subcommand was written as `peer bootstrap` (space-separated) but the actual command uses `peer_bootstrap` (underscore). Fixed in both the `create` and `import` commands.

4. **`peer_bootstrap create` missing required arguments (High severity)**: The `create` command was shown as `ceph fs snapshot mirror peer bootstrap create myfs` but it requires additional arguments: `<client_entity>` and `<site-name>`. Fixed to `ceph fs snapshot mirror peer_bootstrap create myfs client.mirror remote-site`.

5. **Invalid mirror status command (High severity)**: `ceph fs snapshot mirror status myfs` is not a valid Ceph command. The correct command for daemon-level status is `ceph fs snapshot mirror daemon status` (no filesystem name argument). Fixed the command and replaced the fabricated plain-text output with a representative JSON output format.

6. **Invalid snapshot schedule command (High severity)**: `ceph fs snapshot schedule list myfs` uses the wrong command group. The correct Ceph CLI subcommand is `snap-schedule` (hyphenated), not `snapshot schedule`. The correct syntax is `ceph fs snap-schedule status / --fs=myfs`. Fixed the command.

7. **`peer list` subcommand syntax**: Changed `peer list` to `peer_list` for consistency with actual Ceph CLI conventions.

8. **Monitoring section command**: Replaced the invalid `ceph fs snapshot mirror status myfs/` with the correct `ceph fs snapshot mirror daemon status` command.

## Review Notes
- The CephFilesystemMirror CRD YAML structure (apiVersion, kind, spec.resources) is correct per the Rook source code and example manifests.
- The CephFilesystem mirroring field names (`mirroring.enabled`, `mirroring.snapshotSchedules`, with sub-fields `path`, `interval`, `startTime`) are all correct per the Go type definitions.
- The architecture explanation about directory-level mirroring vs RBD image-level mirroring is accurate.
- The bootstrap token direction (created on secondary, imported on primary) aligns with the Ceph upstream CLI documentation where the remote/peer cluster creates the token containing its connection info and the primary/source cluster imports it so the daemon knows where to push snapshots.
- Resource values in the CephFilesystemMirror spec (100m CPU, 512Mi memory) are lower than the official Rook example (500m CPU, 1Gi memory) but are valid user-configurable values, not an error.
