# Validation Summary: How to Create BucketClaims with COSI in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph
- COSI (Container Object Storage Interface)
- Kubernetes
- Ceph RGW (RADOS Gateway)
- S3 object storage protocol

## Sources Consulted
- Kubernetes COSI blog post: https://kubernetes.io/blog/2022/09/02/cosi-kubernetes-object-storage-management/
- Kubernetes Enhancement Proposal 1979 (COSI): https://github.com/kubernetes/enhancements/blob/master/keps/sig-storage/1979-object-storage-support/README.md
- COSI API GitHub repository: https://github.com/kubernetes-sigs/container-object-storage-interface-api
- Rook COSI documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/cosi/
- Ceph COSI driver repository: https://github.com/ceph/ceph-cosi
- Rook COSI driver design document: https://github.com/rook/rook/blob/master/design/ceph/object/ceph-cosi-driver.md

## Issues Found

1. **Incorrect field name `existingBucketID`**: The BucketClaim spec field for referencing a pre-existing bucket is `existingBucketName`, not `existingBucketID`. This appeared in both the "BucketClaim Spec Fields" section and the "Claiming an Existing Bucket" section. Fixed both occurrences.

2. **Multi-Protocol section was incorrect**: The text stated "Ceph RGW also supports the Swift protocol" but the YAML example showed `azure` instead of Swift — an internal inconsistency. More importantly, the Ceph COSI driver only supports the S3 protocol currently. While the COSI specification defines `s3`, `azure`, and `gcs` as protocol options, the Ceph driver implementation only supports S3. Corrected the text to clarify this distinction and removed the unsupported protocol from the YAML example.

3. **Incorrect `bucketID` status field**: The post listed `bucketID` as a BucketClaim status field, but this field exists on the Bucket resource, not on BucketClaim. Removed this from the status fields list.

4. **Incorrect casing for `deletionPolicy` values**: The BucketClass `deletionPolicy` values should be capitalized (`Delete` and `Retain`), not lowercase (`delete` and `retain`). Fixed the casing.

## Review Notes
- The COSI API is currently at `v1alpha1`, with `v1alpha2` in development. The post should be revisited when the API graduates to a newer version, as field names and behavior may change.
- The exact Rook COSI driver deployment name (`rook-ceph-cosi-driver`) and pod label could not be independently confirmed in official documentation; it is derived from the CephCOSIDriver custom resource and may vary by deployment. Users should verify against their actual cluster.
- The COSI controller deployment name `controller-manager` in the troubleshooting section follows the standard COSI sidecar naming but may differ depending on how COSI was installed.
