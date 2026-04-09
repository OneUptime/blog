# Validation Summary: How to Use ObjectBucketClaims with Application Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (object storage provisioner)
- Kubernetes (StorageClass, Deployments, Secrets, ConfigMaps)
- ObjectBucketClaim (objectbucket.io/v1alpha1 CRD)
- Ceph RGW (RADOS Gateway, S3-compatible)
- AWS CLI (for S3 operations)

## Sources Consulted
- Rook Ceph ObjectBucketClaim documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- lib-bucket-provisioner ObjectBucketClaim types: https://github.com/kube-object-storage/lib-bucket-provisioner
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes ConfigMap/Secret injection documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/

## Issues Found
1. **Step 5: Environment variables referenced in host shell instead of inside the pod** — The original commands used `$BUCKET_HOST`, `$BUCKET_PORT`, and `$BUCKET_NAME` directly in the host shell context (e.g., `ENDPOINT="http://${BUCKET_HOST}:${BUCKET_PORT}"` and passing `$BUCKET_NAME` to `kubectl exec`). These variables are injected via `envFrom` into the pod, so they only exist inside the pod's environment, not the host shell. The commands as written would produce empty strings and fail. Fixed by wrapping the `aws` commands in `sh -c '...'` with single quotes so the variables are expanded inside the pod where they are defined.

## Review Notes
- The StorageClass provisioner string `rook-ceph.ceph.rook.io/bucket` assumes Rook is deployed in the `rook-ceph` namespace. If deployed in a different namespace, the prefix must match that namespace (e.g., `my-namespace.ceph.rook.io/bucket`). This is a common default and acceptable for a tutorial.
- The `amazon/aws-cli:latest` image tag is used for convenience but pinning to a specific version would be more reproducible in production.
- The `--no-verify-ssl` flag is used in the list command but not the copy command. This is not an error per se (the copy may also need it if using self-signed certs), but the inconsistency is minor and could be intentional for brevity.
