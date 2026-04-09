# Validation Summary: How to Configure Object Expiration Policies in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- AWS CLI (`aws s3api`, `aws s3`)
- S3 Lifecycle Configuration API (`PutBucketLifecycleConfiguration`, `GetBucketLifecycleConfiguration`)
- S3 Bucket Versioning
- `radosgw-admin` CLI
- kubectl

## Sources Consulted
- AWS S3 API Reference for PutBucketLifecycleConfiguration: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html
- AWS S3 API LifecycleRule structure: https://docs.aws.amazon.com/AmazonS3/latest/API/API_LifecycleRule.html
- AWS S3 API LifecycleExpiration structure: https://docs.aws.amazon.com/AmazonS3/latest/API/API_LifecycleExpiration.html
- AWS CLI reference for `s3api put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI reference for `s3api put-bucket-versioning`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- Ceph RGW S3 Bucket Lifecycle documentation: https://docs.ceph.com/en/latest/radosgw/bucketpolicy/
- Rook Ceph Object Store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found
1. **`ExpiredObjectDeleteMarker` misplaced at rule level**: In the "Versioned Bucket Expiration" section, `"ExpiredObjectDeleteMarker": true` was placed as a top-level property of the rule object. Per the S3 API specification, `ExpiredObjectDeleteMarker` is a field within the `Expiration` element, not a direct child of the rule. Fixed by wrapping it in an `"Expiration": { "ExpiredObjectDeleteMarker": true }` block. Without this fix, the AWS CLI would reject the lifecycle configuration with a validation error.

## Review Notes
- `NewerNoncurrentVersions` within `NoncurrentVersionExpiration` is a relatively recent S3 API addition. Ceph RGW added support for this in Pacific (v16.x) and later. Users on older Ceph versions may need to omit this field.
- Tag-based lifecycle filtering (`Filter.Tag`) is supported in Ceph RGW but was added in later versions (Nautilus/Octopus era). Users should verify their Ceph version supports it.
- The Kubernetes service endpoint format `http://rook-ceph-rgw-my-store.rook-ceph.svc` is correct for a Rook CephObjectStore named "my-store" in the "rook-ceph" namespace.
- All AWS CLI commands use the correct flags and syntax for interacting with an S3-compatible endpoint.
