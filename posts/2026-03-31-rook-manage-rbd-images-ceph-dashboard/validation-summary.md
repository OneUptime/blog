# Validation Summary: How to Manage RBD Images from the Ceph Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Block Device (RBD)
- Ceph Dashboard (MGR module)
- kubectl CLI
- rbd CLI tool

## Sources Consulted
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- Ceph RBD CLI reference (`rbd create`, `rbd snap`, `rbd clone`, `rbd resize`, `rbd du`, `rbd feature enable`): https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph RBD feature dependencies (exclusive-lock -> object-map -> fast-diff): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Feature enable order was incorrect**: The post showed enabling `fast-diff` before `object-map`, but `fast-diff` depends on `object-map` (which in turn depends on `exclusive-lock`). Ceph does not auto-enable dependencies — running `rbd feature enable ... fast-diff` without `object-map` already enabled will produce an error. Fixed by reversing the command order so `object-map` is enabled first, then `fast-diff`, and added a clarifying comment.

## Review Notes
- In modern Ceph (Nautilus 14.2+), `exclusive-lock` is enabled by default on new RBD images, so the post correctly omits enabling it before `object-map`. However, if working with older images that lack `exclusive-lock`, the `object-map` enable will also fail. This is an edge case not worth covering in a tutorial.
- Starting from Ceph Nautilus, clone format v2 is available and does not require snapshot protection before cloning. The `rbd snap protect` command still works but may be unnecessary in newer Ceph versions. The post's approach is still valid and compatible with all versions.
- The claim "layering (required for snapshots/clones)" is slightly imprecise — layering is required for clones but not for snapshots. However, this is a common and acceptable simplification in this context since layering is enabled by default.
- The `resize2fs /dev/rbd0` example assumes an ext4 filesystem. For XFS, the equivalent would be `xfs_growfs`. This is a reasonable simplification for a tutorial.
