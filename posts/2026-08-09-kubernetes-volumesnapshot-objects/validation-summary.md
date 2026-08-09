# Validation Summary: Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`: What Does Each Object Do?

## Status

validated

## Post Type

Technical reference and guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- `snapshot.storage.k8s.io/v1` snapshot CRDs
- Kubernetes snapshot controller
- CSI external-snapshotter
- CSI external-provisioner and PVC restore
- `kubectl` and JSONPath

## Sources Consulted

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: Persistent Volumes — Create PersistentVolumeClaim from Volume Snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#create-persistent-volume-claim-from-volume-snapshot)
- [Kubernetes CSI API Reference: Volume Snapshot](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: Snapshot Controller](https://kubernetes-csi.github.io/docs/snapshot-controller.html)
- [Kubernetes CSI: External Snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI: External Provisioner](https://kubernetes-csi.github.io/docs/external-provisioner.html)
- [Kubernetes CSI: Volume Mode Conversion](https://kubernetes-csi.github.io/docs/prevent-volume-mode-conversion.html)
- [External Snapshotter 8.6: VolumeSnapshotClass CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/release-8.6/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml)
- [External Snapshotter 8.6: VolumeSnapshotContent CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/release-8.6/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml)
- [External Provisioner: Snapshot Restore Validation](https://github.com/kubernetes-csi/external-provisioner/blob/master/pkg/controller/controller.go)
- [Container Storage Interface Specification](https://github.com/container-storage-interface/spec/blob/master/csi.proto)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The introduction implied that each storage snapshot is represented by all three objects. It now states that `VolumeSnapshot` and `VolumeSnapshotContent` form the one-to-one binding, while `VolumeSnapshotClass` is shared policy for dynamic provisioning and is not required for every pre-provisioned snapshot.
- The dynamic `VolumeSnapshotContent` description presented `sourceVolumeMode` as always populated. It now qualifies that field because the v1 API defines it as optional.
- Two pre-provisioned lifecycle descriptions incorrectly called `volumeSnapshotRef` a claim reference. They now identify it as a reference to the corresponding `VolumeSnapshot`, which may not exist when an administrator creates the content.
- The default-class description did not explicitly limit selection to a dynamically provisioned snapshot that omits `volumeSnapshotClassName`. The trigger is now stated precisely.
- The dynamic lifecycle described snapshot size as an unconditional CSI result. It now says size is returned when known because CSI defines `size_bytes` as optional and Kubernetes may leave `restoreSize` unset.
- The class section claimed that key `VolumeSnapshotClass` fields are immutable. That categorical claim was removed: the current upstream CRD does not enforce immutability for `driver`, `deletionPolicy`, or `parameters`, even though treating classes as versioned configuration contracts remains appropriate.
- The restore section said only that the target StorageClass needed a driver capable of accessing the snapshot. It now states the enforced rule that `StorageClass.provisioner` must exactly match `VolumeSnapshotContent.spec.driver`, and it names the annotation required to permit a volume-mode change.

## Review Notes

All five YAML snippets parsed successfully and use current GA API versions and field names. The four `kubectl` commands, their flags, and their JSONPath expressions are valid. All documentation links resolve to the intended official pages. The example CSI driver, class, handle, and parameters are intentionally illustrative and must be replaced with values documented by the deployed CSI driver. No deprecated APIs were found.
