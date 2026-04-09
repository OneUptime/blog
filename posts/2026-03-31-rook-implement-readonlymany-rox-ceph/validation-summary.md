# Validation Summary: How to Implement ReadOnlyMany (ROX) Storage with Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (PersistentVolume, PersistentVolumeClaim, Deployment, Job, access modes)
- Rook-Ceph (CephFS CSI driver, static provisioning)
- CephFS (shared filesystem with ROX support)

## Sources Consulted
- Kubernetes Persistent Volumes - Access Modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Rook CephFS Filesystem Storage: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFS Static Provisioning: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/#static-provisioning
- Rook Ceph CSI Drivers: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Kubernetes Deployments API (apps/v1): https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
1. **Missing required `selector` and `template.metadata.labels` in Deployment YAML**: The Deployment under "Using ROX PVC in Inference Deployments" was missing the required `spec.selector` field and `spec.template.metadata.labels`. In the `apps/v1` API, `spec.selector` is a required field and must match the pod template labels. Without these fields, `kubectl apply` would reject the manifest with a validation error. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` with `app: model-server`.

## Review Notes
- The CSI driver name `rook-ceph.cephfs.csi.ceph.com` is correct for the default `rook-ceph` operator namespace. The driver name follows the pattern `{operator-namespace}.cephfs.csi.ceph.com`, so users with a non-default namespace would need to adjust.
- The static PV example omits the `rootPath` volumeAttribute, which some Rook static provisioning examples include. This is acceptable here because the post instructs the user to copy the `volumeHandle` from the source PV, which encodes the subvolume path information.
- All Kubernetes YAML manifests use correct `apiVersion` values (`v1` for PV/PVC, `batch/v1` for Job, `apps/v1` for Deployment).
- The `ReadOnlyMany` access mode is correctly described and is supported by CephFS via the Rook CSI driver (added in Rook v1.4 / Ceph-CSI 3.0).
