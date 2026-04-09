# Validation Summary: How to Configure Lifecycle Policies for Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / Object Store)
- S3 Lifecycle Configuration API
- AWS CLI (s3api commands)
- Kubernetes (kubectl)
- radosgw-admin CLI

## Sources Consulted
- AWS S3 PutBucketLifecycleConfiguration API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html
- AWS S3 Lifecycle Configuration elements documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Ceph RGW S3 Bucket Lifecycle documentation: https://docs.ceph.com/en/latest/radosgw/bucketpolicy/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectStore documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found
- **Misleading section heading "Delete Versioned Object Markers"**: The heading suggested the rule handles S3 delete markers, but the actual rule shown uses `NoncurrentVersionExpiration`, which expires old noncurrent versions of objects. In S3 versioning, "delete markers" are a distinct concept — they are markers placed when an object is deleted in a versioned bucket. Cleaning up expired delete markers requires `"Expiration": { "ExpiredObjectDeleteMarker": true }`, which is a different lifecycle action. Changed the heading to "Expire Noncurrent Versions" to accurately describe the rule being demonstrated.

## Review Notes
- The `NewerNoncurrentVersions` field in `NoncurrentVersionExpiration` is supported in Ceph Quincy (17.x) and later. Users on older Ceph versions (pre-Quincy) may need to remove this field.
- The `radosgw-admin lc process --bucket=my-bucket` command for single-bucket lifecycle processing is available in newer Ceph versions. On older versions, `radosgw-admin lc process` processes all buckets without a `--bucket` filter.
- All AWS CLI commands, JSON lifecycle configuration formats, and Kubernetes commands are correct and follow current conventions.
- The RGW service DNS name `rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local` correctly follows the Rook naming convention for a CephObjectStore named "my-store" in the "rook-ceph" namespace.
