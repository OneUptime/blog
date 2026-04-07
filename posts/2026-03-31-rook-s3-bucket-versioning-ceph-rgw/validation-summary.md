# Validation Summary: How to Set Up S3 Bucket Versioning in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook
- Ceph RGW (RADOS Gateway)
- S3-compatible object storage
- AWS CLI (for S3 API interaction)
- S3 bucket versioning
- S3 lifecycle policies

## Sources Consulted
- Ceph RGW S3 bucket versioning documentation: https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#put-bucket-versioning
- AWS CLI S3API reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS S3 versioning documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- Rook Ceph object store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- AWS S3 lifecycle configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found
No technical issues found.

## Review Notes
- All AWS CLI commands use correct flags and syntax for interacting with Ceph RGW as an S3-compatible endpoint.
- The `put-bucket-versioning` command correctly uses `Status=Enabled` and `Status=Suspended` values.
- The `get-object` command correctly places the output file (`/tmp/restored-v1.txt`) as a positional argument, which is valid AWS CLI syntax.
- The lifecycle policy JSON uses the correct `NoncurrentVersionExpiration` with `NoncurrentDays` field for expiring non-current object versions.
- The `Filter` with empty `Prefix` is the correct way to apply a lifecycle rule to all objects in the bucket.
- The Rook Ceph RGW service endpoint format (`http://rook-ceph-rgw-my-store.rook-ceph:80`) follows the standard Rook naming convention for in-cluster access.
- Ceph RGW's S3 versioning implementation is highly compatible with AWS S3, making the post's claim of identical behavior reasonable for the operations covered.
