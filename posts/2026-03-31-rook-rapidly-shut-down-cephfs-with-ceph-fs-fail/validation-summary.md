# Validation Summary: How to Rapidly Shut Down CephFS with ceph fs fail

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph / CephFS (filesystem layer)
- MDS (Metadata Server) daemon lifecycle
- `ceph fs fail` and `ceph fs set` CLI commands
- `cephfs-journal-tool` (journal inspection and recovery)
- Rook (Kubernetes operator for Ceph)
- kubectl (Kubernetes CLI)

## Sources Consulted
- https://docs.ceph.com/en/latest/cephfs/administration/ — CephFS Administrative commands
- https://docs.ceph.com/en/reef/cephfs/mds-states/ — MDS States reference
- https://docs.ceph.com/en/reef/cephfs/cephfs-journal-tool/ — cephfs-journal-tool documentation
- https://docs.ceph.com/en/reef/cephfs/disaster-recovery/ — CephFS Disaster Recovery
- https://docs.ceph.com/en/pacific/cephfs/recover-fs-after-mon-store-loss/ — Filesystem recovery after monitor store loss
- https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/ — Rook CephFilesystem CRD

## Issues Found

**Issue 1 — Incorrect MDS state names**
- What was wrong: The post used `reconnecting`, `rejoin`, and `damaged` as MDS state names. These are not the correct state identifiers as shown by `ceph fs status` or the official MDS states documentation.
- What was changed: Updated to the correct canonical state names: `up:reconnect`, `up:rejoin`, and `down:damaged` (all MDS states carry a `up:` or `down:` prefix in Ceph).
- Why: The incorrect names could cause confusion when operators are reading `ceph fs status` output, which shows the full state including the prefix.

**Issue 2 — Missing filesystem name in `ceph fs set down true` reference**
- What was wrong: The command was written as `ceph fs set down true`, which omits the required `<fs_name>` positional argument and is not a valid command as written.
- What was changed: Updated the inline reference to `ceph fs set <fs_name> down true` to reflect the correct syntax.
- Why: A reader copying this syntax would get a CLI error; the filesystem name is a required argument.

## Review Notes
- The `rook_file_system=cephfs` label used in the kubectl logs command (combined with `app=rook-ceph-mds`) is a real label applied by the Rook operator to MDS pods and is the correct way to filter logs for a specific filesystem. This is accurate.
- `ceph fs set cephfs joinable true` is confirmed as the correct recovery command after `ceph fs fail` — it re-enables standby MDS daemons to join and activate the filesystem.
- The `cephfs-journal-tool` syntax (`--rank=cephfs:0`) and subcommands (`journal inspect`, `journal recover-dentries`) are correct per official documentation.
- The distinction between `ceph fs fail` (no journal flush, immediate stop) and `ceph fs set <fs_name> down true` (orderly shutdown with journal flush) is technically accurate.
- The caution about running journal inspection before reconnecting clients after `ceph fs fail` is appropriate and matches official disaster recovery guidance.
