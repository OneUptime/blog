# Validation Summary: How to Use Crossplane to Manage Ceph Object Buckets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Crossplane (Kubernetes-native infrastructure management)
- Kubernetes StorageClass, RBAC, Deployments
- Object Bucket Claims (OBC) via lib-bucket-provisioner
- provider-kubernetes (Crossplane provider for arbitrary K8s resources)

## Sources Consulted
- Rook Ceph Object Bucket Claim documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Crossplane Compositions documentation (v2.2): https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Composite Resource Definitions documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- lib-bucket-provisioner design document: https://github.com/kube-object-storage/lib-bucket-provisioner/blob/master/doc/design/object-bucket-lib.md
- provider-kubernetes GitHub repository and CRDs: https://github.com/crossplane-contrib/provider-kubernetes

## Issues Found
1. **Missing RBAC ClusterRole for Crossplane to manage OBCs**: The Crossplane Composition section directly composed an `ObjectBucketClaim` without mentioning that Crossplane needs explicit RBAC permissions to manage OBC resources. Without a ClusterRole labeled `rbac.crossplane.io/aggregate-to-crossplane: "true"` granting access to the `objectbucket.io` API group, Crossplane cannot create or manage OBCs. Added the required ClusterRole YAML and an explanatory note before the Composition definition.

## Review Notes
- The `BUCKET_REGION` key listed in the OBC ConfigMap comment is part of the lib-bucket-provisioner spec but is not prominently documented in Rook's own OBC page. It may or may not be populated depending on the Rook/RGW configuration. This is not incorrect but could be slightly misleading.
- The Deployment example in "Consuming Bucket Credentials" omits required fields like `spec.selector` and `template.metadata.labels`. This is acceptable as an abbreviated snippet focused on the `envFrom` pattern, but would not apply as-is.
- Crossplane's `mode: Resources` composition mode (used implicitly in this post) has been deprecated in Crossplane v1.17+ in favor of `mode: Pipeline` with composition functions. The examples still work but may need updating for future Crossplane versions.
