# Validation Summary: How to Configure init-only Mirroring Mode for RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD snapshot-based mirroring
- kubectl

## Sources Consulted
- Ceph official RBD mirroring documentation (reef): https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph source documentation: https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst
- Rook CephBlockPool CRD documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/Block-Storage/ceph-block-pool-crd.md

## Issues Found

1. **Critical: `init-only` is not a valid image-level mirroring mode.** The original post claimed `rbd mirror image enable <pool>/<image> init-only` is a valid command. In reality, `init-only` is a *pool-level* mirroring mode (`rbd mirror pool enable <pool> init-only`) that controls which namespaces participate in mirroring — it does NOT mean "sync once and stop." The only valid image-level modes are `journal` and `snapshot`. **Fix:** Replaced the entire `init-only` premise with the correct approach: using snapshot-based mirroring (`snapshot` mode) with a single manual snapshot to achieve a controlled one-time sync. Updated the title, description, introduction, and Step 2 command accordingly.

2. **Critical: Step 5 disable/re-enable workflow would cause a full resync.** The original post suggested disabling mirroring and re-enabling with `snapshot` mode to transition to continuous replication. Disabling mirroring removes the mirroring state entirely, so re-enabling would trigger a full re-bootstrap from scratch — completely negating the initial sync. **Fix:** Since the image is already in `snapshot` mode from Step 2, Step 5 now simply adds a recurring snapshot schedule with `rbd mirror snapshot schedule add`. No disable/re-enable needed.

3. **Incorrect command syntax for snapshot schedule.** The original used `rbd mirror image snapshot schedule add` which is not a valid command path. The correct command is `rbd mirror snapshot schedule add`. **Fix:** Corrected the command to `rbd mirror snapshot schedule add --pool replicapool --image large-base-image 1h`.

4. **Incorrect secondary status after initial sync.** The original showed the secondary transitioning to `up+stopped` with "local image is primary" after the initial sync completes. On the secondary, after a successful sync with no further snapshots pending, the state is `up+replaying` with an idle description — `up+stopped` with "local image is primary" only appears after the image has been promoted. **Fix:** Changed the post-sync status example to show `up+replaying` / `idle`. Kept `up+stopped` / "local image is primary" in Step 7 where the image has actually been promoted.

## Review Notes
- The `up+syncing` state shown during active sync in Step 4 is a reasonable representation of the bootstrap/sync phase, though exact output formatting varies by Ceph version.
- The demote/promote workflow in Step 6 is correct.
- The `rbd info` check for `mirroring primary: true` in Step 7 is correct.
- The `rbd mirror pool enable replicapool image` command in Step 1 correctly uses `image` mode for per-image mirroring control at the pool level.
