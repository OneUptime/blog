# Validation Summary: How to Manage Object Gateway from the Ceph Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Ceph Dashboard
- radosgw-admin CLI
- AWS CLI (S3-compatible operations)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph documentation: RGW Admin Guide (https://docs.ceph.com/en/latest/radosgw/admin/)
- Ceph documentation: RGW User Management (https://docs.ceph.com/en/latest/radosgw/admin/#user-management)
- Ceph documentation: Quota Management (https://docs.ceph.com/en/latest/radosgw/admin/#quota-management)
- Ceph documentation: radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph Dashboard documentation (https://docs.ceph.com/en/latest/mgr/dashboard/)
- Rook documentation: Object Storage (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- AWS CLI S3 API reference for put-bucket-versioning

## Issues Found

### Issue 1: Missing user quota enable command
- **What was wrong:** After setting a user quota with `radosgw-admin quota set --quota-scope=user`, the quota must be explicitly enabled with `radosgw-admin quota enable --quota-scope=user --uid=<user>`. The post correctly showed this enable step for bucket quotas but omitted it for user quotas, meaning the user quota would be configured but never activated.
- **What was changed:** Added the `radosgw-admin quota enable --quota-scope=user --uid=app-team-1` command after the user quota set command.
- **Why:** Without the enable step, the quota is stored but not enforced. This matches the pattern already shown in the bucket quota section and aligns with the Ceph quota management documentation.

### Issue 2: Invalid radosgw-admin bucket versioning command
- **What was wrong:** The command `radosgw-admin bucket versioning --bucket=my-bucket --versioning-state=enabled` is not a valid radosgw-admin subcommand. The `radosgw-admin` tool does not have a `bucket versioning` write command to enable/disable versioning.
- **What was changed:** Replaced with the correct S3 API equivalent: `aws s3api put-bucket-versioning --bucket my-bucket --versioning-configuration Status=Enabled --endpoint-url $AWS_ENDPOINT_URL`, which uses the already-defined `$AWS_ENDPOINT_URL` variable from earlier in the post.
- **Why:** Bucket versioning is managed through the S3 API, not the radosgw-admin CLI. The `radosgw-admin` tool supports bucket operations like `bucket stats`, `bucket list`, `bucket rm`, etc., but versioning control is an S3 API operation.

## Review Notes
- The `radosgw-admin usage show` command (monitoring section) requires that usage logging be enabled on the RGW daemon (`rgw_enable_usage_log = true`). This is not mentioned in the post but is a minor caveat rather than an error.
- The `AWS_ENDPOINT_URL` environment variable is set and then `--endpoint-url` is also passed explicitly in the `aws s3 mb` command. Both work, but the explicit flag is redundant when the env var is set. This is a style preference, not an error.
- All kubectl commands correctly target the `rook-ceph` namespace and `deploy/rook-ceph-tools`, which is the standard Rook toolbox deployment.
- The port-forward command and dashboard URL pattern are correct for Rook-managed Ceph clusters.
