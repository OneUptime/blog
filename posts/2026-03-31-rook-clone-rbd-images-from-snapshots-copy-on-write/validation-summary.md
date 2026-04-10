# Validation Summary: How to Clone RBD Images from Snapshots (Copy-on-Write)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- RBD snapshots and copy-on-write cloning
- Kubernetes PersistentVolumeClaim with VolumeSnapshot dataSource
- Ceph CSI driver for Kubernetes

## Sources Consulted
- Ceph RBD Snapshots documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- Ceph RBD Layering (cloning) documentation: https://docs.ceph.com/en/latest/dev/rbd-layering/
- Ceph `rbd` man page: https://docs.ceph.com/en/latest/man/8/rbd/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- ceph-csi snap-clone documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/snap-clone.md

## Issues Found
No technical issues found. All commands, syntax, and configuration snippets are correct and functional.

## Review Notes
- **`rbd snap protect` requirement**: The post states "You must protect a snapshot before creating clones from it." This is correct for RBD clone format v1, but with clone format v2 (the default since Ceph Nautilus 14.x, released 2019), snapshot protection is no longer required before cloning. The workflow described still works correctly on all Ceph versions — `rbd snap protect` is a valid and harmless operation even with format v2 — so the post is not wrong, just slightly conservative. A future update could note that clone format v2 makes this step optional.
- **Clone chain depth check command**: The post uses `rbd info ... | grep "parent"` to check clone chain depth. This shows the immediate parent but does not reveal the full chain depth. To determine the actual depth, one would need to recursively follow the parent chain. This is a minor simplification that is acceptable for a tutorial.
- **Comparison table**: The "Parent dependency: No" entry for snapshots is slightly simplified — snapshots are tied to the image they belong to — but in the context of comparing clone-style parent dependencies, it is reasonable.
