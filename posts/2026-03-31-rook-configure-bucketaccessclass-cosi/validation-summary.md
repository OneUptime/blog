# Validation Summary: How to Configure BucketAccessClass for COSI in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph Object Storage (RGW)
- COSI (Container Object Storage Interface)
- Kubernetes BucketAccessClass CRD
- Kubernetes BucketAccess CRD
- CephObjectStoreUser

## Sources Consulted
- [Rook COSI Documentation (latest-release)](https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/cosi/)
- [Rook COSI Documentation (v1.12)](https://rook.io/docs/rook/v1.12/Storage-Configuration/Object-Storage-RGW/cosi/)
- [Ceph COSI Driver GitHub Repository](https://github.com/ceph/ceph-cosi)
- [Rook COSI Driver Name Change Discussion (v1.15)](https://github.com/rook/rook/discussions/14297)
- [Kubernetes COSI Introduction Blog Post](https://kubernetes.io/blog/2022/09/02/cosi-kubernetes-object-storage-management/)
- [COSI Specification (kubernetes-sigs)](https://github.com/kubernetes-sigs/container-object-storage-interface)

## Issues Found

1. **Wrong COSI driver name (all YAML examples)**: The post used `driverName: rook-ceph.ceph.rook.io` which is the OBC (Object Bucket Claim) provisioner prefix, not the COSI driver name. Changed to `rook-ceph.ceph.objectstorage.k8s.io` per the official Rook COSI documentation (Rook v1.15+).

2. **Wrong parameter names (all YAML examples)**: The post used `objectStoreName` and `objectStoreNamespace` as parameters. The correct Rook COSI parameters are `objectStoreUserSecretName` and `objectStoreUserSecretNamespace`, which reference the Kubernetes Secret created by a CephObjectStoreUser resource. Changed all instances with appropriate example values (e.g., `rook-ceph-object-user-my-store-cosi`).

3. **Wrong authenticationType casing (all YAML examples)**: The post used `authenticationType: Key` (mixed case). The correct value per the COSI spec and Rook documentation is `KEY` (all uppercase). Changed all instances.

4. **IAM authentication not supported by Rook**: The post included a full IAM authentication section implying Rook supports `authenticationType: IAM`. The Rook COSI driver currently only supports `KEY`-based authentication. The ceph-cosi README lists IAM access policy handling as an outstanding TODO. Removed the IAM YAML example and updated the Authentication Types section to clarify that COSI defines both `KEY` and `IAM`, but Rook currently only supports `KEY`.

5. **Fictional `userCaps` parameter (Role-Based Access Patterns)**: The post showed `userCaps: "buckets=read;objects=read"` as a BucketAccessClass parameter. This is not a documented or supported parameter in Rook's COSI driver. Rewrote the section to correctly show that different access levels are achieved by creating separate CephObjectStoreUser resources with different capabilities, then referencing their secrets in separate BucketAccessClass resources.

6. **Unnecessary `-A` flag on cluster-scoped resource**: `kubectl get bucketaccessclass -A` used the `-A` (all-namespaces) flag, which is meaningless for BucketAccessClass since it is a cluster-scoped resource. Removed the flag.

7. **Inaccurate "How It Works" description**: The post claimed Rook "Creates a new Ceph RGW user" per BucketAccess request. The COSI driver actually uses the existing CephObjectStoreUser referenced by the secret in the parameters. Updated the workflow description to accurately reflect this.

## Review Notes
- COSI is still in alpha (`v1alpha1`). The API may change in future Kubernetes releases.
- The COSI driver name changed from `ceph.objectstorage.k8s.io` (Rook v1.12-v1.14) to `rook-ceph.ceph.objectstorage.k8s.io` (Rook v1.15+). The post now uses the current name. Users on older Rook versions would need the older driver name.
- The Ceph COSI driver lists "Handle access policies for Bucket Access Request" as a TODO, meaning IAM-style authentication support may arrive in future versions.
