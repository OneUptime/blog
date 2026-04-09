# Validation Summary: How to Configure Object Store Lifecycle Policies in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (object storage orchestration on Kubernetes)
- Ceph RGW (RADOS Gateway) lifecycle processor
- AWS CLI S3 API (`s3api` subcommands)
- Kubernetes (kubectl, CephCluster CRD)
- S3 lifecycle configuration (Expiration, NoncurrentVersionExpiration, AbortIncompleteMultipartUpload)

## Sources Consulted
- Ceph RGW lifecycle documentation (rgw_lc_max_wp_worker, rgw_lc_debug_interval configuration parameters)
- Rook CephCluster CRD specification (spec.cephConfig field in ceph.rook.io/v1)
- AWS CLI S3 API reference (put-bucket-lifecycle-configuration, get-bucket-lifecycle-configuration, delete-bucket-lifecycle)
- Ceph radosgw-admin CLI reference (lc list, lc get subcommands)

## Issues Found
1. **Incorrect config parameter reference in introduction**: The original text stated "The RGW lifecycle processor runs periodically (configurable via `rgw_lc_max_wp_worker`)" — this incorrectly attributed the processing frequency to `rgw_lc_max_wp_worker`, which actually controls the number of worker threads (as correctly described later in the post). The lifecycle processor runs on a daily cycle by default, overridable via `rgw_lc_debug_interval` for testing. Fixed the introduction to reference `rgw_lc_debug_interval` instead.

## Review Notes
- All S3 lifecycle JSON structures (Rules, Filter, Expiration, NoncurrentVersionExpiration, AbortIncompleteMultipartUpload) are correct and follow the standard S3 API format.
- The `spec.cephConfig` field in the CephCluster CRD is a valid and documented field in Rook. The YAML structure shown is correct, including quoting values as strings.
- The `radosgw-admin lc list` and `radosgw-admin lc get --bucket=<bucket>` commands are both valid.
- The `aws s3api delete-bucket-lifecycle` command is the correct AWS CLI command name.
- The later "Tuning" section correctly describes both `rgw_lc_max_wp_worker` (worker threads) and `rgw_lc_debug_interval` (debug interval override) — only the introductory paragraph had the error.
