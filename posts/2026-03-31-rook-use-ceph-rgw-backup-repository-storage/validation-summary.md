# Validation Summary: How to Use Ceph RGW for Backup Repository Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook
- Velero (Kubernetes backup tool)
- Restic (file-level backup tool)
- AWS CLI (S3-compatible commands)
- radosgw-admin CLI
- S3 Object Lock and Lifecycle Policies

## Sources Consulted
- Ceph RGW documentation: https://docs.ceph.com/en/latest/radosgw/
- Velero documentation: https://velero.io/docs/
- Velero AWS plugin releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- Restic S3 backend documentation: https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS CLI S3API reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found
1. **Object Lock requires bucket creation with `--object-lock-enabled-for-bucket`**: Step 1 used `aws s3 mb` to create the bucket, but Step 7 later attempted to enable Object Lock on it. S3 Object Lock must be enabled at bucket creation time using `aws s3api create-bucket --object-lock-enabled-for-bucket`. Changed Step 1 to use `aws s3api create-bucket` with the Object Lock flag, so the bucket is properly configured from the start for the immutable backup use case in Step 7.

## Review Notes
- The Velero plugin version (v1.8.0) is valid but users should check for the latest compatible version for their Velero installation.
- The `compression_mode force` setting will compress all data unconditionally. For backup data that is already compressed (e.g., compressed tarballs), this may waste CPU without storage benefit. The `aggressive` mode could be a better default for mixed workloads, though `force` is reasonable for the backup use case described.
- Ceph RGW's S3 lifecycle support has some limitations compared to AWS S3 — not all transition actions are supported. The expiration and noncurrent version expiration used here are well-supported.
- The `--namespace-mappings` flag in the Velero restore command maps to a namespace called `restored`, which must exist or be created beforehand.
