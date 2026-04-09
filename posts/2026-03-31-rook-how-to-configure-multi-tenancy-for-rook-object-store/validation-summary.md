# Validation Summary: How to Configure Multi-Tenancy for Rook Object Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway) multi-tenancy
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- AWS CLI (S3-compatible usage)
- Kubernetes Secrets
- Kubernetes StorageClass / ObjectBucketClaim (OBC)

## Sources Consulted
- Ceph RGW Multi-tenancy documentation: https://docs.ceph.com/en/latest/radosgw/multitenancy/
- Ceph RGW Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook Object Storage documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found

### 1. Incorrect tenant:bucket separator in AWS CLI commands
- **What was wrong:** The post used `%3A` (URL-encoded colon) as the tenant/bucket separator in AWS CLI `s3://` URIs (e.g., `s3://team-alpha%3Amy-data-bucket`). The AWS CLI treats the `s3://` URI literally — it does not URL-decode the bucket name. Using `%3A` would cause the HTTP client to double-encode it to `%253A`, resulting in a wrong bucket name being sent to RGW.
- **What was changed:** Replaced `%3A` with a literal colon `:` to match the Ceph-documented S3 tenant:bucket notation (e.g., `s3://team-alpha:my-data-bucket`). Also updated the inline comment from "team-alpha%3Amy-data-bucket" to "team-alpha:my-data-bucket".
- **Why:** The Ceph multi-tenancy documentation specifies that "a colon character is used to separate tenant and bucket" in the S3 protocol.

### 2. Missing `--uid` flag in quota commands
- **What was wrong:** The `radosgw-admin quota set` and `radosgw-admin quota enable` commands were missing the required `--uid` flag. Without `--uid`, these commands will fail because `radosgw-admin` needs to identify a specific user to apply quotas to. The `--tenant` flag alone is not sufficient.
- **What was changed:** Added `--uid=developer1` to both quota commands. Updated the description from "Apply storage quotas at the tenant level" to "Apply storage quotas to a user within a tenant" to accurately reflect what the commands do.
- **Why:** RGW does not support tenant-level quotas directly. Quotas are set per-user (or per-bucket). The `--uid` flag is required per the Ceph admin documentation.

## Review Notes
- The "Use ObjectBucketClaims with Tenanted Storage Classes" section shows a valid StorageClass YAML, but it does not include any tenant-specific parameters. Rook's OBC provisioner does not natively support RGW multi-tenancy in the StorageClass. The StorageClass shown will provision standard (non-tenanted) buckets. The section title implies tenant-scoped provisioning, which is slightly misleading. A future revision could clarify this limitation or remove the tenant-specific framing.
- The post correctly explains core RGW tenancy concepts: tenant$user notation, namespace isolation, and the ability to have duplicate names across tenants.
- All other `radosgw-admin` commands (user create, user list, caps add) are syntactically correct with valid flags and values.
- The Kubernetes Secret YAML is well-formed and uses appropriate field names.
