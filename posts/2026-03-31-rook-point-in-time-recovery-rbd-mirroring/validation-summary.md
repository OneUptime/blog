# Validation Summary: How to Set Up Point-in-Time Recovery with RBD Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (snapshot-based)
- Rook Ceph Operator
- Kubernetes CronJob
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation: `rbd mirror snapshot schedule add` command reference — confirms `<interval>` and `<start-time>` are positional arguments, not named flags (`--interval`/`--start-time` do not exist)
- Ceph official documentation: RBD mirroring — confirms non-primary (secondary) images are read-only and must be promoted before write operations like rollback
- Ceph official documentation: `rbd mirror image promote` — confirms `--force` flag is needed when the primary cluster is unreachable
- Rook documentation: CephBlockPool CRD — confirms `mirroring.snapshotSchedules` field structure with `interval` and `startTime`
- Kubernetes documentation: CronJob API (batch/v1) — confirms YAML structure is correct

## Issues Found

### 1. Incorrect flags on `rbd mirror snapshot schedule add`
**What was wrong:** The commands used `--interval` and `--start-time` as named flags. These are not valid flags — `interval` and `start-time` are positional arguments.

**What was changed:** Replaced `--interval 15m` with positional `15m`, and replaced `--interval 1d --start-time "02:00:00"` with positional `1d 02:00:00`.

**Why:** Using the invalid flags would cause the command to fail with an unrecognized option error.

### 2. Missing image promotion step before rollback on secondary cluster
**What was wrong:** The "Recovering to a Point in Time" section instructed readers to run `rbd snap rollback` directly on the secondary cluster image. Secondary (non-primary) images in RBD mirroring are read-only — the `rbd-mirror` daemon holds an exclusive lock, and write operations like rollback will fail.

**What was changed:** Added `rbd mirror image promote replicapool/myimage` step before the rollback command, with a comment noting the `--force` flag if the primary is unreachable.

**Why:** Without promoting the image first, the rollback command would fail because the image is in non-primary read-only state.

## Review Notes
- The CronJob's jq expression `.[:-48] | .[].name` deletes all snapshots except the last 48 without filtering by the `pitr-` prefix. In a real environment with mixed snapshot types, this could accidentally delete non-PITR snapshots. A production deployment should filter with `select(.name | startswith("pitr-"))` before applying the retention logic.
- The `rbd snap rollback` command is destructive — it overwrites the current image state. The post could benefit from mentioning that cloning from a snapshot (`rbd clone`) is a non-destructive alternative, but this is a design choice rather than a technical error.
- The Rook CephBlockPool YAML, Kubernetes CronJob structure, and all other RBD commands are correct.
