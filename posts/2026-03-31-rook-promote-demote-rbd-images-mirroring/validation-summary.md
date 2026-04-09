# Validation Summary: How to Promote and Demote RBD Images in Mirroring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (journal-based and snapshot-based)
- Rook (Ceph operator for Kubernetes)
- kubectl / Kubernetes

## Sources Consulted
- Ceph official documentation — RBD Mirroring: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Ceph official documentation (Reef release) — RBD Mirroring: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph `rbd` man page — mirror subcommands: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph source code: `src/tools/rbd/action/Info.cc` (mirroring field output format)
- Ceph source code: `src/tools/rbd/action/MirrorImage.cc` (promote --force behavior)

## Issues Found

### 1. Incorrect command: `rbd mirror image info` does not exist
- **What was wrong:** The post used `rbd mirror image info replicapool/myimage` in three places (checking primary status, verifying demotion, verifying promotion). This subcommand does not exist in the `rbd` CLI. The valid `mirror image` subcommands are: `demote`, `disable`, `enable`, `mode`, `promote`, `resync`, and `status`.
- **What was changed:** Replaced all three occurrences of `rbd mirror image info` with `rbd info`, which is the correct command that displays mirroring state and primary status.
- **Why:** `rbd info` outputs fields including `mirroring state:`, `mirroring mode:`, `mirroring global id:`, and `mirroring primary:` for mirroring-enabled images.

### 2. Incorrect output format comment
- **What was wrong:** The comment stated the output shows `mirroring state: enabled, primary: true/false`. The actual field name is `mirroring primary:` (not just `primary:`), and these appear on separate output lines, not comma-separated.
- **What was changed:** Updated the comment to `mirroring state: enabled, mirroring primary: true/false` to reflect the correct field name.
- **Why:** Ensures readers can correctly identify the relevant field in the command output.

### 3. Incorrect mirror status description format
- **What was wrong:** The post claimed that `rbd mirror image status` shows `"replaying, master_position=mirror_position"` when replication is caught up. This is incorrect — the description field is a JSON object. The internal C++ variables use `m_master_position` and `m_mirror_position`, but the output JSON keys are `primary_position` and `non_primary_position`. Synchronization status is indicated by `entries_behind_primary` for journal-based mirroring.
- **What was changed:** Updated the comment to `entries_behind_primary=0` which is the correct indicator that replication has caught up.
- **Why:** The original text appeared to reference internal variable names rather than the actual output format, which would confuse readers trying to verify replication status.

## Review Notes
- All promote/demote commands (`rbd mirror image demote`, `rbd mirror image promote`, `rbd mirror pool demote`, `rbd mirror pool promote`) and their flags are correct.
- The `--force` flag behavior is accurately described — it skips the clean demotion check and can cause split-brain, which matches official documentation.
- The Rook toolbox pod selection command using `kubectl` with label selector `app=rook-ceph-tools` is correct.
- The post covers both image-level and pool-level operations, which is a useful distinction for operators managing clusters with many mirrored images.
- The post does not distinguish between journal-based and snapshot-based mirroring modes. The status output format differs between these modes (`entries_behind_primary` for journal, `replay_state` for snapshot). A future revision could note this distinction.
