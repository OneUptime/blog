# Validation Summary: How to Delete Users with ceph auth del in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (authentication subsystem, `cephx`)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (`kubectl`, Secrets, ObjectBucketClaims)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Ceph official documentation on user management: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph `ceph auth` CLI reference: https://docs.ceph.com/en/latest/man/8/ceph-authtool/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook CSI driver architecture and internal auth entities: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/

## Issues Found
1. **Incorrect claim about `ceph auth del` behavior on non-existent entities**: The post stated "If the user does not exist, Ceph returns an error." This is incorrect. `ceph auth del` is idempotent — it succeeds silently even when the specified entity does not exist. Fixed the sentence to accurately describe this behavior.

## Review Notes
- The Rook-internal user `client.rook-ceph-crash` may be named `client.rook-ceph-crash-collector` in some Rook versions. The general warning to never delete Rook-managed users is sound regardless of exact naming.
- The pre-deletion checklist `jq` query filtering on `.data.userID` is specific to RGW/OBC-style secrets and won't catch all Ceph-related Kubernetes secrets (e.g., CephFS or RBD secrets use different key names). This is not wrong but could be more comprehensive.
- The bulk deletion script works correctly but could benefit from a `--dry-run` mode or confirmation prompt for production use. This is a style preference, not an error.
