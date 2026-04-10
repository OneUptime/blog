# Validation Summary: How to Understand Delta Synchronization Between RBD Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD - RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- RBD snapshot-based mirroring
- rbd CLI tool
- ceph config CLI

## Sources Consulted
- [Ceph RBD Mirroring Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-mirroring/) - official snapshot-based mirroring reference
- [Ceph RBD man page (Debian)](https://manpages.debian.org/testing/ceph-common/rbd.8.en.html) - CLI flag and syntax verification
- [Ceph RBD Config Reference](https://docs.ceph.com/en/latest/rbd/rbd-config-ref/) - config option verification
- [Ceph rbd-diff format spec](https://docs.ceph.com/en/reef/dev/rbd-diff/) - diff output format
- [Ceph source: Diff.cc](https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Diff.cc) - diff command implementation
- [Ceph source: snapshot Replayer.cc](https://github.com/ceph/ceph/blob/main/src/tools/rbd_mirror/image_replayer/snapshot/Replayer.cc) - mirror status fields
- [Ceph source: ImageReplayer.cc](https://github.com/ceph/ceph/blob/main/src/tools/rbd_mirror/ImageReplayer.cc) - mirror state values

## Issues Found

1. **`rbd diff` used non-existent `--snap` flag**: The `--snap` flag does not exist for `rbd diff`. The end snapshot must be specified using the `@snap` notation in the image spec (e.g., `replicapool/myimage@snap2`). Fixed all `rbd diff` commands to use `rbd diff replicapool/myimage@snap2 --from-snap snap1` syntax.

2. **`rbd mirror image status` showed incorrect state and description format**: The blog stated the state during sync is `up+syncing` with a description like `snapshot_copy, 45 / 100 objects complete`. The actual state during snapshot replication is `up+replaying`, and the description uses a JSON-based format containing fields like `replay_state`, `syncing_percent`, etc. Fixed the example output comments.

3. **`rbd mirror snapshot schedule add` used non-existent `--interval` flag**: The interval is a positional argument, not a named flag. Changed from `--interval 15m` to just `15m` as a positional argument.

4. **`rbd_mirror_throttle_bytes_per_second` is not a real Ceph config option**: This configuration option does not exist in Ceph. Replaced with `rbd_mirror_concurrent_image_syncs`, which is the actual config option for controlling rbd-mirror daemon resource usage, and updated the surrounding text accordingly.

## Review Notes
- The `rbd feature enable` commands for `object-map` and `fast-diff` are correct but the post does not mention that `object-map` requires the `exclusive-lock` feature as a prerequisite, and `fast-diff` requires `object-map`. Users may need to enable `exclusive-lock` first if it is not already enabled.
- The `rbd diff` awk processing sums all extent lengths including "zero" type extents (trimmed/zeroed blocks). For a more precise bandwidth estimate, filtering for "data" type extents only (`awk '$3 == "data" { sum += $2 }'`) would be more accurate, but the current approach is acceptable for rough estimation.
- Mirror snapshot names containing `.mirror.primary` is based on internal Ceph naming conventions and could change across major versions.
