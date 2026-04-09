# Validation Summary: How to Monitor RBD Mirror Status (Image and Pool Level)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device) mirroring
- Rook (Ceph operator for Kubernetes)
- Prometheus monitoring
- Ceph Dashboard
- kubectl / Rook toolbox

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph official documentation: rbd man page (https://docs.ceph.com/en/latest/man/8/rbd/)
- Ceph MGR Prometheus module documentation (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Ceph source code: `src/tools/rbd/action/MirrorImage.cc` (valid `rbd mirror image` subcommands)
- Ceph source code: `src/tools/rbd_mirror/image_replayer/snapshot/Replayer.cc` (perf counter names)
- Ceph Dashboard source code: `src/pybind/mgr/dashboard/frontend/src/app/ceph/block/block.module.ts` (route confirmation)

## Issues Found

1. **Invalid CLI command `rbd mirror image ls`** (line 77): `rbd mirror image ls` is not a valid Ceph subcommand. The valid `rbd mirror image` subcommands are: `enable`, `disable`, `promote`, `demote`, `resync`, `status`, and `snapshot`. Replaced with `rbd mirror pool status replicapool --verbose --format json` which correctly lists all mirrored image statuses.

2. **Missing `--verbose` flag for per-image JSON output** (line 84): `rbd mirror pool status --format json` without `--verbose` only returns summary data (`health`, `daemon_health`, `image_health`, `states`). The `.images[]` array is only populated when `--verbose` is passed. Added `--verbose` to the command.

3. **Wrong Prometheus scrape port** (line 97): The blog specified port `9092` (which is Kafka's default port). The Ceph MGR Prometheus module default port is `9283`. Fixed the port and changed the target host from `rbd-mirror-host` to `ceph-mgr-host`, since the rbd-mirror daemon does not directly expose a Prometheus endpoint — metrics are collected through the MGR Prometheus module.

4. **Incorrect Prometheus metric names** (lines 101-103): The perf counter subsystem is `rbd_mirror_snapshot_image`, not `rbd_mirror_snapshot`. Fixed all three metric names to include the correct subsystem. Also removed the fabricated `_seconds` suffix from `sync_time` — the perf counter is registered as a `time_avg` type and does not get a `_seconds` suffix in Prometheus.

## Review Notes
- The "Checking Mirror Lag" section describes journal-based mirroring lag format (`master_position`, `entries_behind_master`). Since Ceph Pacific+, snapshot-based mirroring is the recommended mode and its `description` field has a different format. The post doesn't distinguish between the two modes. This isn't incorrect for journal-based setups but could be misleading for users on newer Ceph versions.
- The Prometheus metric names, while corrected based on source code analysis, should be verified against the actual running Ceph version as naming conventions may vary.
- The Rook toolbox commands and Ceph Dashboard URL path are confirmed correct.
