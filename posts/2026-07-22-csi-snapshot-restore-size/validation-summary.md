# Validation Summary: How restoreSize Works When Recreating a PVC from a CSI Snapshot

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- `VolumeSnapshot` and `VolumeSnapshotContent`
- PersistentVolumes and PersistentVolumeClaims
- CSI snapshot restore and volume expansion
- `kubectl`

## Sources Consulted

- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes API: PersistentVolume v1](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/)
- [Kubernetes CSI Developer Documentation: Volume Expansion](https://kubernetes-csi.github.io/docs/volume-expansion.html)
- [Kubernetes: Storage Classes and Volume Expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/#allow-volume-expansion)
- [Kubernetes: Preventing Unauthorized Volume Mode Conversion](https://kubernetes.io/blog/2024/04/30/prevent-unauthorized-volume-mode-conversion-ga/)
- [Kubernetes CSI external-provisioner snapshot restore checks](https://github.com/kubernetes-csi/external-provisioner/blob/master/pkg/controller/controller.go)

## Issues Found

- The post referred to a PV's provisioned capacity as `status.capacity.storage`. PersistentVolume capacity is stored in `spec.capacity.storage`; the prose was corrected to match the API and the existing command example.
- The larger-restore explanation implied that normal Kubernetes expansion handling could expose the extra filesystem capacity after initial provisioning. The CSI specification instead requires a plugin that accepts a larger snapshot restore to provide the requested size and resize a mounted filesystem by or before `NodePublishVolume`; otherwise it may reject the request with `OUT_OF_RANGE`. The affected paragraphs were corrected.
- The volume-mode section implied that `sourceVolumeMode` is always recorded automatically. It is automatic for dynamically provisioned snapshots, but an administrator must populate it for a pre-provisioned snapshot. The explanation was corrected because Kubernetes cannot enforce mode compatibility when the source mode is unknown.

## Review Notes

The PVC manifest uses the stable `snapshot.storage.k8s.io/v1` API and is valid. The `kubectl get`, JSONPath, command-substitution, `describe`, and `exec` examples are syntactically correct. `ReadWriteOncePod` is only available for CSI volumes on Kubernetes 1.22 or later and became stable in Kubernetes 1.29; this does not affect the example, which requests `ReadWriteOnce`.
