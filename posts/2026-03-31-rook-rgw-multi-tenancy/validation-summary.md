# Validation Summary: How to Configure Ceph RGW Multi-Tenancy in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes
- AWS CLI (S3-compatible usage)
- S3 bucket policies

## Sources Consulted
- Ceph RGW Multi-tenancy documentation: https://docs.ceph.com/en/latest/radosgw/multitenancy/
- Ceph RGW Admin Ops (radosgw-admin) documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph RGW Quota Management: https://docs.ceph.com/en/latest/radosgw/admin/#quota-management
- Rook Ceph Object Store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook OBC (ObjectBucketClaim) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found
1. **Step 3 - `--no-sign-request` flag contradicts authenticated bucket creation**: The `aws s3api create-bucket` command included `--no-sign-request`, which tells the AWS CLI to skip signing/authentication entirely. This means the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables set on the same command would be ignored, and the bucket would not be created under the tenant user's namespace. Removed the `--no-sign-request` flag so the request is properly authenticated with the tenant user's credentials.

## Review Notes
- The Step 6 StorageClass example for tenant-aware OBCs is somewhat incomplete. The text mentions setting an `objectStoreUser` parameter to scope bucket provisioning to a tenant, but the YAML example does not include this parameter. Rook's OBC StorageClass does not natively expose a `tenant` parameter; the per-tenant approach relies on creating separate StorageClasses with distinct `objectStoreUser` values pointing to pre-created tenanted users. The example works as a starting point but could be more explicit about how tenant scoping is achieved in practice.
- The bucket policy ARN format `arn:aws:iam::team-beta:root` is specific to Ceph RGW's interpretation of tenant-based ARNs. This is correct for RGW but differs from AWS IAM ARN conventions, which could confuse readers coming from an AWS background.
- The `radosgw-admin bucket list --tenant=` command in the "Checking Tenant Usage" section is valid syntax for filtering buckets by tenant.
