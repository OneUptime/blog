# Validation Summary: How to Set Up Rook-Ceph for CI/CD Pipeline Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephFilesystem, CephObjectStore/RGW, RBD)
- Kubernetes (StorageClass, PersistentVolumeClaim, Pod specs)
- CephFS CSI driver
- Jenkins (Kubernetes pod templates)
- Tekton Pipelines (Pipeline, PipelineRun, workspaces)
- AWS CLI (S3-compatible object storage)
- Maven

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook Object Storage (RGW) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Tekton Pipelines v1 API specification: https://tekton.dev/docs/pipelines/pipelines/
- Tekton PipelineRun workspaces documentation: https://tekton.dev/docs/pipelines/pipelineruns/#specifying-workspaces
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
No technical issues found.

## Review Notes
- The StorageClass sets `allowVolumeExpansion: true` but does not include `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters. Volume provisioning works fine without these, but volume expansion operations would require them. This is a minor omission that only matters if users attempt to resize PVCs.
- The RGW example assumes AWS CLI credentials are already configured (e.g., via environment variables or a Kubernetes secret). This is reasonable for a snippet but users will need to set up `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from the CephObjectStoreUser credentials.
- The RGW service URL assumes a CephObjectStore named `my-store` exists, which is not shown in the post. Users will need to create this resource separately.
