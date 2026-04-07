# Validation Summary: How to Create an S3-Compatible Bucket in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Object Storage via CephObjectStore and RGW)
- Kubernetes (StorageClass, ObjectBucketClaim, ConfigMap, Secret, Deployment)
- S3 API (AWS CLI for bucket operations)
- radosgw-admin CLI
- S3 Bucket Policies

## Sources Consulted
- Rook official documentation: Object Bucket Claim (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/)
- Rook official documentation: Object Store (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Rook official documentation: Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Ceph documentation: radosgw-admin (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Kubernetes API reference: StorageClass (https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/storage-class-v1/)

## Issues Found

1. **`radosgw-admin bucket stats` shown outside toolbox context**: In Method 2, the `radosgw-admin bucket stats` command was listed after the "Exit the tools pod" comment, but `radosgw-admin` is only available inside the Rook toolbox pod. Fixed by changing it to a `kubectl exec` invocation against the toolbox deployment.

2. **Missing AWS credential configuration for manual method**: The `aws s3 mb` and `aws s3 ls` commands in Method 2 require AWS credentials but the post only said "Note the access_key and secret_key from the output" without showing how to configure them. Added explicit `export AWS_ACCESS_KEY_ID` and `export AWS_SECRET_ACCESS_KEY` commands before the AWS CLI calls.

3. **Mixed execution contexts in a single code block**: Method 2 had toolbox commands (`radosgw-admin`) and host commands (`aws s3`) in the same code block, which was confusing. Split into two separate code blocks with explanatory text between them to clarify the execution context.

## Review Notes
- The RGW service name uses `rook-ceph-rgw-my-store-a` (with `-a` suffix) in the ConfigMap example and bucket policy section but `rook-ceph-rgw-my-store` (without suffix) in Method 2. Both can be valid depending on the Rook version and daemon configuration, but users should verify their actual service name with `kubectl get svc -n rook-ceph`.
- The OBC API version `objectbucket.io/v1alpha1` is correct but still in alpha. Users should check for updates in newer Rook releases.
- The StorageClass provisioner `rook-ceph.ceph.rook.io/bucket` and all OBC spec fields (`bucketName`, `storageClassName`, `additionalConfig` with `maxSize`/`maxObjects`) are accurate per current Rook documentation.
- The bucket policy ARN format `arn:aws:iam:::user/myuser` is correct for Ceph RGW's S3-compatible implementation.
