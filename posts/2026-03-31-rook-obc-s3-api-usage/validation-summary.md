# Validation Summary: How to Use the S3 API via OBC-Provisioned Buckets in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Kubernetes (ObjectBucketClaim, ConfigMap, Secret, Deployment)
- ObjectBucketClaim (OBC) via lib-bucket-provisioner (`objectbucket.io/v1alpha1`)
- AWS CLI (S3 commands with custom endpoint)
- boto3 (Python AWS SDK)
- S3 API (upload, download, list, delete, presigned URLs)

## Sources Consulted
- Rook official documentation for ObjectBucketClaim: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook upstream example: https://github.com/rook/rook/blob/master/deploy/examples/object-bucket-claim-retain.yaml
- Rook upstream example: https://github.com/rook/rook/blob/master/deploy/examples/object-bucket-claim-delete.yaml
- boto3 S3 client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Kubernetes API reference for Deployment, ConfigMap, Secret, and envFrom

## Issues Found
No technical issues found.

## Review Notes
- The OBC YAML uses `bucketName` (explicit name) rather than `generateBucketName` (auto-generated prefix + random suffix). Both are valid; upstream examples prefer `generateBucketName` to avoid name collisions, but `bucketName` is correct for the tutorial's clarity.
- The `storageClassName: rook-ceph-bucket` is a conventional community example name. Upstream examples use `rook-ceph-delete-bucket` or `rook-ceph-retain-bucket` to encode the reclaim policy, but the generic name is fine for a tutorial.
- The ConfigMap also contains `BUCKET_REGION` and `BUCKET_SUBREGION` keys that are not mentioned. This is not an error — the post covers the essential keys needed for S3 access.
- The `maxSize: "5Gi"` format uses a Kubernetes-style binary suffix. Upstream examples use `"2G"` (decimal). Both are accepted by Rook's parser which uses Kubernetes resource quantity parsing.
- The `base64 -d` flag in the kubectl secret extraction works on Linux. On macOS, `base64 -D` or `base64 --decode` may be needed, but this is standard Kubernetes tutorial convention.
