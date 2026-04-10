# Validation Summary: How to Automate Ceph Backup Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD block storage, mirroring)
- Rook (Ceph operator for Kubernetes)
- Kubernetes CronJobs
- Bash scripting
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation for `rbd` commands: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph source code (`src/tools/rbd/action/Snap.cc`) for valid `rbd snap` subcommands
- Ceph source code (`src/tools/rbd/action/MirrorPool.cc`, `MirrorImage.cc`) for mirror status JSON structure
- Ceph source code (`src/krbd.cc`, `dump_images`) for `rbd showmapped` column layout
- Kubernetes API reference for CronJob spec (`batch/v1`)

## Issues Found

### Issue 1: `rbd snap info` is not a valid command (Steps 1 and 2)
- **What was wrong:** The post used `rbd snap info pool/image@snap` to check snapshot existence. The `rbd snap` command has no `info` subcommand. Valid subcommands are: `create`, `ls`, `rm`, `purge`, `rollback`, `protect`, `unprotect`, `limit set`, `limit clear`, `rename`.
- **What was changed:** Replaced `rbd snap info` with `rbd info` (which accepts the `pool/image@snap` snap-spec format and returns image info at the snapshot point, failing with non-zero exit if the snapshot doesn't exist).
- **Why:** Running the original command would fail with an unrecognized subcommand error.

### Issue 2: `awk '{print $5}'` extracts wrong column from `rbd showmapped` (Step 1)
- **What was wrong:** In Ceph Reef (v18, used by Rook v1.13), `rbd showmapped` outputs 6 columns: id, pool, namespace, image, snap, device. Column `$5` is the snap name, not the device path.
- **What was changed:** Replaced `awk '{print $5}'` with `awk '{print $NF}'` to always extract the last column (device path), regardless of whether the namespace column is populated.
- **Why:** The original command would capture the snapshot name instead of the device path, causing the subsequent mount command to fail.

### Issue 3: `fsck -n` run on mounted filesystem (Step 1)
- **What was wrong:** The post mapped the device, mounted it, then ran `fsck -n` on the mounted device. Running `fsck` on a mounted filesystem produces unreliable results and some filesystem types (e.g., XFS) will refuse to run at all.
- **What was changed:** Reordered commands so `fsck -n` runs after mapping but before mounting. The mount/verify/umount sequence follows the fsck check.
- **Why:** Best practice requires running filesystem checks on unmounted filesystems for accurate results.

### Issue 4: `last_local_snap_push_ms` field does not exist in Ceph mirror status output (Step 4)
- **What was wrong:** Both the pool status jq query and the lag threshold script referenced `.last_local_snap_push_ms`, a field that does not exist in any version of Ceph's `rbd mirror` JSON output. The jq expressions would always return `null`.
- **What was changed:**
  - Pool status query now extracts `.description` and `.last_update` (actual fields from the mirror status output).
  - Lag threshold script now parses `.peer_sites[0].last_update` from `rbd mirror image status` and computes lag in seconds by comparing the timestamp to the current time.
  - Threshold changed from `3600000` (ms) to `3600` (seconds) to match the new calculation method.
- **Why:** The fabricated field name meant the entire mirror monitoring section was non-functional.

## Review Notes
- The CronJob in Step 2 uses `rook/ceph:v1.13.0` as the container image but does not mount Ceph config/keyring secrets. In a real deployment, the pod would need access to `/etc/ceph/ceph.conf` and a keyring (e.g., via Kubernetes secrets from the Rook operator) to run `rbd` commands against the cluster.
- The `rbd map` commands in Step 1 require kernel RBD module access and elevated privileges. Inside a standard Rook tools pod, `rbd map` may not work without `--privileged` security context. The `rbd-nbd` alternative could be mentioned for containerized environments.
- The lag detection script uses `date -d` which is a GNU coreutils extension. This works in the typical CentOS/RHEL-based Ceph tools container but would not work on Alpine-based images.
