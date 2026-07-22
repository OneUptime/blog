# Validation Summary: Retain vs. Delete: Choosing a Deletion Policy for VolumeSnapshotContent

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes CSI volume snapshots
- `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`
- CSI external-snapshotter and snapshot controller
- `kubectl`
- Velero 1.18 CSI snapshot lifecycle
- Kubernetes finalizers, RBAC, and storage retention controls

## Sources Consulted
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes 1.20: Kubernetes Volume Snapshot Moves to GA](https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshotClass Secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Kubernetes: `kubectl patch`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/)
- [Kubernetes: Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Velero 1.18: Container Storage Interface Snapshot Support](https://velero.io/docs/v1.18/csi/)
- [Velero 1.18: How Velero Works](https://velero.io/docs/v1.18/how-velero-works/)
- [Kubernetes CSI external-snapshotter: VolumeSnapshotContent CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml)
- [Kubernetes CSI external-snapshotter: snapshot controller source](https://github.com/kubernetes-csi/external-snapshotter/blob/master/pkg/common-controller/snapshot_controller.go)
- [Kubernetes CSI external-snapshotter: sidecar controller source](https://github.com/kubernetes-csi/external-snapshotter/blob/master/pkg/sidecar-controller/snapshot_controller.go)

## Issues Found
- The post implied that a `VolumeSnapshotClass` could be changed in place. `VolumeSnapshotClass` objects are immutable. The text now states that deleting and recreating the class with different values does not alter existing `VolumeSnapshotContent` objects.
- The cleanup guidance described the deletion Secret as though the external-snapshotter consulted the `VolumeSnapshotClass` during deletion. For dynamically provisioned snapshots, the controller resolves the class parameters and records the deletion Secret reference in `snapshot.storage.kubernetes.io/deletion-secret-name` and `snapshot.storage.kubernetes.io/deletion-secret-namespace` annotations on the `VolumeSnapshotContent`. The import and reclamation guidance now tells administrators to record and preserve or deliberately replace those annotations and to verify that the referenced Secret remains available.

## Review Notes
- The `snapshot.storage.k8s.io/v1` manifests use the current GA API and the required fields are present. The pre-provisioned binding, `snapshotHandle`, and `sourceVolumeMode` fields match the official API examples.
- The shell commands use valid current `kubectl` JSONPath, custom-column, and JSON merge-patch syntax. JSON merge patch is appropriate because snapshot resources are custom resources and do not support strategic merge patch.
- The Velero lifecycle statement was verified against the versioned Velero 1.18 documentation: Velero patches CSI snapshot content to `Delete` during backup deletion or expiration, even when the source class used `Retain`.
- The example CSI driver name, parameters, provider handle, and Secret references are placeholders and must be replaced with values supported by the deployed driver and backend.
