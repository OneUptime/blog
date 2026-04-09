# Validation Summary: How to Set Up Bucket Versioning in Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- AWS CLI (S3 API commands)
- S3-compatible bucket versioning
- Kubernetes ObjectBucketClaim (OBC)
- S3 lifecycle policies

## Sources Consulted
- AWS CLI `s3api` command reference for `put-bucket-versioning`, `get-bucket-versioning`, `list-object-versions`, `get-object`, `delete-object` — https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS S3 Versioning documentation — https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- AWS S3 Lifecycle Configuration documentation — https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Rook Ceph Object Store documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook ObjectBucketClaim documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Ceph RGW S3 API compatibility documentation — https://docs.ceph.com/en/latest/radosgw/s3/

## Issues Found
No technical issues found.

## Review Notes
- The `NewerNoncurrentVersions` field in the lifecycle policy was introduced in later versions of the S3 API. Ceph RGW support for this field depends on the Ceph version (Quincy 17.x and later). Readers using older Ceph versions may need to remove this field and rely solely on `NoncurrentDays`.
- The `ceph.rook.io/bucket-versioning` OBC annotation is used only in this post among the blog's bucket versioning tutorials. Readers should verify this annotation is supported in their specific Rook version.
- The lifecycle policy JSON is shown but no `aws s3api put-bucket-lifecycle-configuration` command is provided to apply it. Readers will need to know the corresponding CLI command to use the policy.
- The `list-object-versions` example output is simplified (omits `ETag`, `Owner`, `StorageClass` fields that appear in real responses), which is acceptable for illustration but readers should expect additional fields in practice.
