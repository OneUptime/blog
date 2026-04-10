# Validation Summary: How to Configure BucketClass for COSI in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (COSI driver)
- Container Object Storage Interface (COSI)
- Kubernetes BucketClass custom resource
- CephObjectStore / CephObjectStoreUser
- kubectl CLI

## Sources Consulted
- Rook COSI documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/cosi/
- Rook COSI example manifests: https://github.com/rook/rook/tree/master/deploy/examples/cosi/
- COSI consolidated repo (kubernetes-sigs): https://github.com/kubernetes-sigs/container-object-storage-interface
- Retired COSI API repo: https://github.com/kubernetes-sigs/container-object-storage-interface-api (now under kubernetes-retired)
- Retired COSI controller repo: https://github.com/kubernetes-sigs/container-object-storage-interface-controller (now under kubernetes-retired)
- Rook COSI driver source code (controller.go, cephcosidriver.yaml)

## Issues Found

1. **COSI controller installation commands were outdated**: The post referenced two separate repos (`container-object-storage-interface-api` and `container-object-storage-interface-controller`) which have been retired and consolidated into a single repo (`container-object-storage-interface`). Fixed to use the single consolidated repo install command.

2. **Rook COSI driver file path was wrong**: The post referenced `driver.yaml` which does not exist. The correct file is `cephcosidriver.yaml` in the `deploy/examples/cosi/` directory. Fixed the URL accordingly.

3. **Driver name was incorrect**: The post used `rook-ceph.ceph.rook.io` as the driverName. The actual Rook COSI driver name is `rook-ceph.ceph.objectstorage.k8s.io`, as confirmed in Rook's example manifests and source code. Fixed all occurrences.

4. **Deletion policy values had wrong capitalization**: The post used lowercase `delete` and `retain`, but the COSI CRD requires capitalized values `Delete` and `Retain`. This is enforced by enum validation in the CRD. Fixed all occurrences.

5. **BucketClass parameters were fabricated**: The post listed `objectStoreName`, `objectStoreNamespace`, `region`, `bucketMaxObjects`, and `bucketMaxSize` as BucketClass parameters. None of these exist in Rook's COSI driver. The actual parameters are `objectStoreUserSecretName` and `objectStoreUserSecretNamespace`, which reference a CephObjectStoreUser secret. These appear to have been confused with parameters from the older non-COSI OBC (ObjectBucketClaim) system. Fixed the parameters table and all YAML examples.

## Review Notes
- The COSI API is currently at v1alpha1 in Rook's examples, though a v1alpha2 version exists in the consolidated COSI repo. The v1alpha1 usage is consistent with Rook's current state and is acceptable.
- In v1alpha1, `driverName`, `deletionPolicy`, and `parameters` are top-level fields (no `spec` wrapper). This will change in v1alpha2 where they move under `spec`. Readers should be aware that future COSI versions will require schema changes.
- The "BucketClass with Quotas" section was renamed to "BucketClass with Retain Policy" since quota parameters (`bucketMaxObjects`, `bucketMaxSize`) are not supported in Rook's COSI driver parameters. Quotas may be managed through CephObjectStore configuration separately.
