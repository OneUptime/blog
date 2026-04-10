# Validation Summary: How to Use COSI (Container Object Storage Interface) with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes COSI (Container Object Storage Interface)
- Rook Ceph Operator
- Ceph RGW (RADOS Gateway)
- Kubernetes CRDs (BucketClass, BucketClaim, BucketAccess, BucketAccessClass)

## Sources Consulted
- Official COSI consolidated repo: https://github.com/kubernetes-sigs/container-object-storage-interface
- COSI API types (v1alpha1): https://github.com/kubernetes-sigs/container-object-storage-interface-api/blob/main/apis/objectstorage/v1alpha1/types.go
- Rook COSI documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/cosi/
- Rook COSI example YAMLs: https://github.com/rook/rook/tree/master/deploy/examples/cosi
- Rook COSI driver source code: https://github.com/rook/rook/tree/master/pkg/operator/ceph/object/cosi
- Ceph COSI driver source: https://github.com/ceph/ceph-cosi

## Issues Found

1. **Incorrect COSI driver name**: The post used `rook-ceph.ceph.rook.io` as the driver name in BucketClass and BucketAccessClass. The correct driver name is `rook-ceph.ceph.objectstorage.k8s.io`, as constructed from the Rook driver prefix (`rook-ceph`) and ceph-cosi provisioner name (`ceph.objectstorage.k8s.io`). Fixed in both YAML snippets.

2. **Incorrect COSI controller namespace**: The post claimed the controller runs in `objectstorage-system`. The correct namespace is `container-object-storage-system` (for the consolidated repo). Fixed the verification command.

3. **Outdated installation commands**: The post referenced two separate repos (`container-object-storage-interface-api` and `container-object-storage-interface-controller`) which have been archived and consolidated into `container-object-storage-interface`. Updated to a single `kubectl apply -k` command against the consolidated repo.

4. **Missing CephCOSIDriver CR requirement**: The post claimed the COSI driver deploys automatically when a CephObjectStore exists. In reality, a `CephCOSIDriver` custom resource must also be created. Added the CR YAML example and corrected the explanation.

5. **Incorrect driver pod label**: The post used `app=rook-ceph-cosi-driver` but the correct label is `app=ceph-cosi-driver`. Fixed the pod listing command.

6. **Wrong BucketClaim field name**: The post used `storageClassName` in the BucketClaim spec, but the correct COSI v1alpha1 field is `bucketClassName`. Fixed.

7. **Wrong BucketClass parameters**: The post used `objectStoreName`, `objectStoreNamespace`, and `region`. The correct Rook COSI parameters are `objectStoreUserSecretName` and `objectStoreUserSecretNamespace`, which reference the secret created by a `CephObjectStoreUser`. The `region` parameter does not exist. Fixed.

8. **Wrong BucketAccessClass parameters**: Same issue as BucketClass -- used `objectStoreName` and `objectStoreNamespace` instead of `objectStoreUserSecretName` and `objectStoreUserSecretNamespace`. Fixed.

## Review Notes
- COSI is currently at v1alpha1 (used in this post) but the consolidated repo's main branch has moved to v1alpha2 with breaking changes (e.g., BucketClass/BucketAccessClass fields move under `spec`). The post should note the alpha status and potential for API changes.
- The post does not mention the prerequisite of creating a `CephObjectStoreUser` resource, whose secret is referenced by the BucketClass and BucketAccessClass parameters. A future revision could add this step for completeness.
- The BucketInfo secret structure is more specific than described -- credentials are nested under `spec.secretS3` with fields `endpoint`, `region`, `accessKeyID`, and `accessSecretKey`. The post's general description is not wrong but could be more precise.
