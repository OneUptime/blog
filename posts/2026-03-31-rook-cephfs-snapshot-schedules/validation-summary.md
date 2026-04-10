# Validation Summary: How to Configure Snapshot Schedules for CephFS Mirroring in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- CephFS Snapshot Scheduling (`snap_schedule` manager module)
- CephFS Snapshot Mirroring (`cephfs-mirror` daemon)
- Kubernetes (kubectl, toolbox pod)

## Sources Consulted
- Ceph official documentation — CephFS Snapshot Scheduling: https://docs.ceph.com/en/latest/cephfs/snap-schedule/
- Ceph official documentation — CephFS Snapshot Mirroring: https://docs.ceph.com/en/latest/cephfs/cephfs-mirroring/
- Ceph official documentation — CephFS Snapshots: https://docs.ceph.com/en/latest/cephfs/snap-schedule/
- Rook documentation — CephFS Mirroring: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-fs-mirror/

## Issues Found

1. **Invalid command: `ceph fs snapshot mirror dirmap status myfs /`** — This command does not exist in the Ceph CLI. There is no `dirmap status` subcommand under `ceph fs snapshot mirror`. Removed this command entirely.

2. **Invalid command: `ceph fs snapshot mirror status myfs`** — This command does not exist. The correct command for checking mirror daemon status is `ceph fs snapshot mirror daemon status` (no filesystem name argument). Per-filesystem status is available via the admin socket using `ceph --admin-daemon`. Fixed both the command block and the summary paragraph to use the correct command.

## Review Notes
- The `--fs` flag used throughout (e.g., `--fs myfs`) is an accepted keyword form of the positional `[<fs>]` argument. The official documentation's canonical examples use positional arguments (e.g., `ceph fs snap-schedule add / 1h`), but a note in the docs states that `--fs` is accepted. The blog's usage is functional but differs from the canonical style.
- The sample output table for `ceph fs snap-schedule list` could not be verified against official documentation, which does not provide example output. The format shown is plausible but may differ from actual output depending on the Ceph version.
- The time format specifiers (`1h`, `1d`, `6h`) and retention specifiers (`h 24`, `d 7`) are all correct per official documentation.
- The claim that CephFS mirroring is snapshot-based is accurate — the official docs confirm snapshots are the unit of replication.
- The `.snap` directory description is accurate per official CephFS snapshot documentation.
