# Validation Summary: How to Configure Ceph Object Storage (S3) on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- Ceph (RADOS Gateway / RGW)
- Rook-Ceph operator
- Kubernetes (Deployments, StorageClasses, Ingress)
- S3-compatible object storage API
- ObjectBucketClaim (OBC) / Container Object Storage Interface
- AWS CLI (`aws s3`, `aws s3api`, `aws sns`)
- radosgw-admin
- cert-manager / nginx-ingress (in passing)

## Sources Consulted
- Rook CephObjectStore CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CephObjectStoreUser CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-user-crd/
- Rook ObjectBucketClaim docs: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph bucket notifications: https://docs.ceph.com/en/latest/radosgw/notifications/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
1. **`healthCheck.bucket.interval` is no longer a valid field on the CephObjectStore spec.** The current Rook CephObjectStore CRD only supports `healthCheck.startupProbe` and `healthCheck.readinessProbe` sub-fields (with `disabled`, `periodSeconds`, `failureThreshold`, etc.). The legacy `healthCheck.bucket` block has been removed in recent Rook versions. Replaced the snippet with a current-format example using `startupProbe` and `readinessProbe`.

All other technical content was verified correct:
- CephObjectStore spec (`metadataPool`, `dataPool.erasureCoded`, `preservePoolsOnDelete`, `gateway.*`, placement tolerations) matches the CRD schema.
- CephObjectStoreUser spec including `quotas.maxBuckets`, `quotas.maxSize`, `quotas.maxObjects`.
- Secret naming convention `rook-ceph-object-user-<store>-<user>` and the `AccessKey` / `SecretKey` data keys.
- ObjectBucketClaim `objectbucket.io/v1alpha1` API, `generateBucketName`, `storageClassName`, `additionalConfig.maxObjects`, `additionalConfig.maxSize`.
- StorageClass provisioner `rook-ceph.ceph.rook.io/bucket` (correct because the operator namespace is `rook-ceph`).
- OBC-generated ConfigMap (`BUCKET_NAME`, `BUCKET_HOST`, `BUCKET_PORT`) and Secret (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- RGW service name pattern `rook-ceph-rgw-<store-name>` and pod label `app=rook-ceph-rgw`.
- `aws sns create-topic ... --attributes '{"push-endpoint":"..."}'` form and ARN `arn:aws:sns:default::bucket-events` match the Ceph notifications API examples.
- `radosgw-admin bucket stats --bucket=…`, `bucket list`, `user info --uid=…`, `usage show` are valid subcommands.

## Review Notes
- The lifecycle policy snippet references `StorageClass: COLD`. This is a generic example — for transitions to work, the RGW must be configured with a matching storage class (e.g., via `radosgw-admin zonegroup placement add ... --storage-class COLD` and an appropriate tier configuration). Readers should be aware this is not enabled out of the box. Not changed since the snippet is illustrative of the S3 API surface.
- `additionalConfig.maxObjects` / `maxSize` on an ObjectBucketClaim apply as **user-level** quotas (covering all buckets owned by the OBC's auto-generated user). If readers want per-bucket quotas they should use `bucketMaxObjects` / `bucketMaxSize` (available in newer Rook releases).
- Ceph's SNS-style endpoint is an SNS-compatible REST API exposed by the RGW, not actual AWS SNS — the example works in practice because the AWS CLI's SNS command marshals the request in a way the RGW understands.
- The 2+1 erasure-coded `dataPool` requires at least 3 OSDs and tolerates one failure, which lines up with the "at least 3 OSDs" prerequisite.
