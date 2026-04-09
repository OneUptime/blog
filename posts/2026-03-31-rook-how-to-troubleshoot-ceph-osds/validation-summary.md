# Validation Summary: How to Troubleshoot Ceph OSDs

## Status
validated

## Post Type
Troubleshooting Guide / Reference

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- BlueStore (Ceph storage backend)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Ceph official documentation: Troubleshooting PGs (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/)
- Ceph official documentation: Crash Module (https://docs.ceph.com/en/quincy/mgr/crash/)
- Ceph MonCommands.h source (https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h) for CLI command definitions
- Ceph PR #26724 (https://github.com/ceph/ceph/pull/26724) for `ceph osd info` command validation
- Ceph PR #23723 (https://github.com/ceph/ceph/pull/23723) for `list_missing` to `list_unfound` rename context
- Ceph ceph-crash source (https://github.com/ceph/ceph/blob/main/src/ceph-crash.in) for crash directory path

## Issues Found
1. **Wrong command for listing inconsistent objects (line 183)**: The post used `ceph pg <pgid> list_missing` with the comment "List inconsistent objects in a PG." The `list_missing` command lists unfound/missing objects during recovery, not scrub-detected inconsistencies. Changed to `rados list-inconsistent-obj <pgid>`, which is the correct command for listing objects with scrub-detected inconsistencies per the official Ceph troubleshooting documentation.

2. **Incorrect crash dump directory path (line 205)**: The post listed `/var/lib/ceph/osd/<osd-dir>/crash/` as the crash log directory. Ceph stores crash dumps in a centralized directory at `/var/lib/ceph/crash/`, not under individual OSD data directories. Confirmed via the Ceph crash module documentation and ceph-crash source code. Changed to `/var/lib/ceph/crash/`.

## Review Notes
- The `ceph osd info osd.<id>` command was verified as valid (introduced in Nautilus via PR #26724). It may not be available on older pre-Nautilus clusters.
- The `ceph log last 100 cluster` syntax relies on Ceph's argument parser skipping the optional `level` parameter when `cluster` doesn't match its allowed values. This works in practice but could be made more explicit as `ceph log last 100 debug cluster` for clarity.
- The `ceph pg <pgid> list_missing` command was renamed to `ceph pg <pgid> list_unfound` in Nautilus (PR #23723). Even the original command was for unfound objects, not scrub inconsistencies.
- The full-ratio settings section uses both `ceph config set global mon_osd_full_ratio` and `ceph osd set-full-ratio`. Both are valid approaches; the latter is more commonly referenced in official docs.
- All Kubernetes/Rook commands are correct and follow standard Rook operator patterns.
