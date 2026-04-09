# Validation Summary: How to Create an ObjectBucketClaim for S3 Storage in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph Object Gateway (RGW)
- Kubernetes (ObjectBucketClaim CRD, Secrets, ConfigMaps, Deployments)
- S3-compatible object storage
- AWS CLI

## Sources Consulted
- Rook official documentation on Object Bucket Claims: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- lib-bucket-provisioner API (objectbucket.io/v1alpha1 CRD specification)
- Kubernetes documentation on kubectl exec and environment variable expansion

## Issues Found

### 1. Secret description incorrectly mentioned "endpoint" (Line 17)
- **What was wrong:** The bullet point stated the Secret contains "access key, secret key, endpoint." The endpoint information (BUCKET_HOST, BUCKET_PORT) is stored in the auto-created ConfigMap, not the Secret. The Secret only contains AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
- **What was changed:** Removed "endpoint" from the Secret description.
- **Why:** Verified against official Rook documentation which confirms the Secret contains only the two credential keys.

### 2. kubectl exec command would fail due to local shell variable expansion (Line 143)
- **What was wrong:** The command `kubectl -n my-app exec -it deploy/s3-app -- aws s3 ls --endpoint-url http://$BUCKET_HOST:$BUCKET_PORT` would have `$BUCKET_HOST` and `$BUCKET_PORT` expanded by the user's local shell before being sent to the pod. Since these variables only exist inside the pod's environment, they would be empty locally, causing the command to fail.
- **What was changed:** Wrapped the command in `sh -c '...'` so that the environment variables are expanded inside the pod: `kubectl -n my-app exec -it deploy/s3-app -- sh -c 'aws s3 ls --endpoint-url http://$BUCKET_HOST:$BUCKET_PORT'`
- **Why:** Shell variable expansion in kubectl exec happens on the client side unless explicitly delegated to a shell inside the container.

### 3. Fixed bucket name section lacked important caveat (Lines 165-177)
- **What was wrong:** The section presented using `bucketName` as a straightforward alternative to `generateBucketName` without noting that Rook discourages this approach for new buckets.
- **What was changed:** Added a note that Rook recommends using `generateBucketName` for new buckets since bucket names must be unique across the entire object store.
- **Why:** The official Rook documentation explicitly states `bucketName` is "not recommended for new buckets since names must be unique within an entire object store."

## Review Notes
- The `additionalConfig` quota fields (`maxSize`, `maxObjects`) are user-account-level quotas, not bucket-level quotas. The blog does not make this distinction, which could matter in multi-bucket scenarios. Rook also supports `bucketMaxObjects` and `bucketMaxSize` for individual bucket quotas.
- The blog uses `"10Gi"` for `maxSize`; the official Rook docs use `"2G"` in their example. Both notations are accepted by Ceph RGW, but readers should be aware of the difference between GiB and GB.
- The StorageClass provisioner name `rook-ceph.ceph.rook.io/bucket` includes the operator namespace as a prefix by default. If the operator is deployed in a different namespace, this prefix would change.
- The ConfigMap keys `BUCKET_REGION` and `BUCKET_SUBREGION` shown in the example output are part of the lib-bucket-provisioner standard and appear in practice, though the Rook documentation page only explicitly lists `BUCKET_HOST`, `BUCKET_PORT`, and `BUCKET_NAME`.
