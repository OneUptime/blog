# Validation Summary: How to Configure OBC Settings in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph Object Storage (RGW)
- Kubernetes ObjectBucketClaim (OBC) via lib-bucket-provisioner
- Helm (Kubernetes package manager)
- Kubernetes StorageClass, ConfigMap, Secret resources

## Sources Consulted
- Rook Ceph OBC documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook Ceph Operator Helm Chart docs: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- lib-bucket-provisioner ObjectBucketClaim types (Go source): https://github.com/kube-object-storage/lib-bucket-provisioner/blob/master/pkg/apis/objectbucket.io/v1alpha1/objectbucketclaim_types.go
- Rook v1.9 OBC documentation: https://rook.io/docs/rook/v1.9/ceph-object-bucket-claim.html

## Issues Found
1. **Invalid `region` parameter in StorageClass**: The StorageClass example included `region: us-east-1` as a parameter. This is not a documented or valid parameter for the Rook-Ceph bucket provisioner StorageClass. The only valid parameters are `objectStoreName`, `objectStoreNamespace`, and optionally `bucketName` (for existing buckets). Removed the `region` line from the StorageClass YAML.

## Review Notes
- The OBC quota example uses `maxSize` and `maxObjects` under `additionalConfig`, which are user-level quota fields. For per-bucket quotas, `bucketMaxSize` and `bucketMaxObjects` would be more appropriate. The current usage is technically valid but applies quotas at the user level rather than the individual bucket level.
- The post uses `bucketName` (explicit name) in the OBC spec, which is valid. However, the Rook documentation recommends `generateBucketName` (prefix-based random name generation) to avoid cross-namespace name collisions in production.
- The provisioner string `rook-ceph.ceph.rook.io/bucket` assumes the operator is deployed in the `rook-ceph` namespace. If deployed in a different namespace, the prefix would change accordingly.
