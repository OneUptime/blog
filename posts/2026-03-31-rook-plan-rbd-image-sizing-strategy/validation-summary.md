# Validation Summary: How to Plan RBD Image Sizing Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes StorageClass and PersistentVolumeClaim
- Ceph CSI driver (rook-ceph.rbd.csi.ceph.com)
- Prometheus alerting rules for Ceph metrics
- ext4 filesystem utilities (resize2fs)

## Sources Consulted
- Rook official documentation — StorageClass configuration and CSI secret naming conventions
- Ceph documentation — `rbd du`, `rbd resize`, `ceph osd pool set-quota`, `ceph df` command syntax and flags
- Kubernetes documentation — StorageClass `allowVolumeExpansion` and PVC volume expansion behavior
- Ceph MGR Prometheus module — verified `ceph_pool_percent_used` metric exists and returns 0–100 scale (cross-referenced with validated post `2026-03-31-rook-prometheus-rules-kustomize` and `2026-03-31-rook-fix-pool-full-health-check-in-ceph`)
- Ceph thin provisioning documentation — confirmed RBD images are thin-provisioned by default

## Issues Found
No technical issues found.

## Review Notes
- The "Manual Image Resize" section uses `resize2fs /dev/rbd0` which is specific to ext4 filesystems. XFS (also common with Ceph/Rook) would require `xfs_growfs` instead. Not an error since ext4 is a valid default, but readers using XFS should be aware.
- The pool quota description says "Prevent a single image from consuming all cluster space" — pool quotas actually limit total data across all images in a pool, not per-image. The statement is technically correct in outcome (no single image can exceed the pool quota), but could be clearer that the quota applies collectively.
- The StorageClass example omits optional but commonly used parameters like `imageFormat` and `imageFeatures`, which is fine for a sizing-focused post but readers building production StorageClasses should consult the full Rook documentation.
- The 10995116277760 bytes value in the pool quota command equals 10 TiB, which is a reasonable example value.
