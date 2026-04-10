# Validation Summary: How to Configure MDS Standby-Replay in CephFS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (kubectl, pod management)
- CephFilesystem CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook CephFilesystem CRD documentation (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Ceph MDS standby-replay documentation (https://docs.ceph.com/en/latest/cephfs/standby/)
- Ceph CLI reference for `ceph fs status` and `ceph tell` commands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook toolbox documentation for admin commands (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

### 1. Fabricated `ceph fs status` output format
- **What was wrong:** The example output for `ceph fs status myfs` used a fabricated YAML-like format with a `MDS version:` header and `up:active{0=myfs.a=up:active}` syntax that does not match the actual command output. The real output is a tabular format showing RANK, STATE, MDS, ACTIVITY, and other columns.
- **What was changed:** Replaced the fabricated output with a realistic tabular representation matching actual `ceph fs status` output, including the `0-s standby-replay` rank indicator. Added a note explaining the key indicator to look for.
- **Why:** Readers trying to verify their setup would see completely different output from what the post showed, causing confusion about whether standby-replay was properly configured.

### 2. `ceph daemon` command cannot run from tools pod
- **What was wrong:** The "Monitoring Replay Lag" section used `ceph daemon mds.myfs.b status` from within the Rook tools pod (`deploy/rook-ceph-tools`). The `ceph daemon` command requires access to the daemon's local admin socket, which is only available inside the MDS pod itself, not from the tools pod.
- **What was changed:** Replaced `ceph daemon mds.myfs.b` with `ceph tell mds.myfs-b`, which communicates over the Ceph cluster network and works from any pod with Ceph client access. Added an explanatory note about the distinction.
- **Why:** The original command would fail with a "no such file or directory" error when trying to access the admin socket from the tools pod.

### 3. MDS daemon name format
- **What was wrong:** The daemon name used dot notation (`mds.myfs.b`) instead of Rook's actual hyphen-based naming convention (`mds.myfs-b`).
- **What was changed:** Corrected `mds.myfs.b` to `mds.myfs-b` in the monitoring command.
- **Why:** Rook names MDS daemons using hyphens (e.g., `myfs-a`, `myfs-b`), so the Ceph daemon identifier is `mds.myfs-b`, not `mds.myfs.b`.

## Review Notes
- The CephFilesystem CRD YAML structure and field names (`activeCount`, `activeStandby`, `metadataServer`, `metadataPool`, `dataPools`) are all correct for the current Rook `ceph.rook.io/v1` API.
- The claim that `activeStandby: true` enables standby-replay mode is accurate -- Rook's operator sets `allow_standby_replay` on the underlying Ceph filesystem when this field is true.
- Failover time estimates (1-5 minutes for cold standby, 5-15 seconds for standby-replay) are reasonable and consistent with Ceph documentation.
- The memory guidance (standby-replay requires similar memory to the active MDS) is correct since the standby-replay daemon builds a similar metadata cache.
- The scaling claim (activeCount: 2 with activeStandby: true creates 4 MDS pods) is accurate.
- The pod label `app=rook-ceph-mds` is the correct label selector for Rook MDS pods.
