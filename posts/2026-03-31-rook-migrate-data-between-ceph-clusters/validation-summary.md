# Validation Summary: How to Migrate Data Between Ceph Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD, CephFS, RGW)
- Rook (Ceph operator for Kubernetes)
- RBD mirroring (snapshot mode)
- rbd export/import and export-diff/import-diff
- rsync for CephFS migration
- rclone for S3-compatible object storage migration
- radosgw-admin sync groups
- Kubernetes Pod specs with CephFS volumes

## Sources Consulted
- Ceph official documentation for `rbd export-diff` / `rbd import-diff` (https://docs.ceph.com/en/latest/rbd/rbd-snapshot/#incremental-snapshots)
- Ceph RBD mirroring documentation (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph `radosgw-admin` sync group documentation (https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/)
- Kubernetes API reference for CephFS volume type (https://kubernetes.io/docs/concepts/storage/volumes/#cephfs)
- rclone connection strings documentation (https://rclone.org/docs/#connection-strings)

## Issues Found
1. **Missing snapshot creation on destination in incremental RBD export/import flow (Method 1):**
   - **What was wrong:** The incremental transfer section exported a diff with `rbd export-diff --from-snap snap1` but the destination side only ran `rbd import` for the base image without creating `snap1`. The `rbd import-diff` command requires the from-snapshot to exist on the destination image; without it, the import-diff would fail with a snapshot mismatch error.
   - **What was changed:** Added `rbd snap create replicapool/my-volume@snap1` on the destination after the base `rbd import` and before `rbd import-diff`. Updated the comment to clarify the three-step process.
   - **Why:** Per Ceph documentation, `rbd import-diff` verifies that the base snapshot referenced in the diff file exists on the target image before applying changes.

## Review Notes
- The CephFS migration YAML (Method 3) uses the in-tree `cephfs` volume plugin, which is deprecated in newer Kubernetes versions in favor of the CephFS CSI driver. It remains functional in many Kubernetes versions but users on Kubernetes 1.28+ should use CSI-based PVCs instead.
- The RBD mirroring section (Method 2) uses the legacy `client.name@cluster` peer add syntax. Modern Ceph deployments typically use `rbd mirror pool peer bootstrap create/import` with bootstrap tokens, which is simpler and more secure. The legacy syntax still works.
- The `radosgw-admin sync group create` command (Method 4) requires a fully configured multisite deployment (realm, zonegroup, zones) to function. The blog presents it as a standalone command, which may mislead readers into thinking it works on single-site clusters. This is a contextual gap rather than a technical error.
- The verification section suggests comparing `rbd info` output (image sizes) between clusters. For stronger guarantees, comparing checksums (e.g., `rbd export` + `md5sum` on both sides) would be more robust, though the current suggestion is a reasonable quick check.
