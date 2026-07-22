# Validation Summary: Dynamic vs. Static CSI Snapshots: When to Create or Import VolumeSnapshotContent

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- Kubernetes CSI snapshot controller and external-snapshotter
- `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`
- PersistentVolumeClaims, StorageClasses, and snapshot-based volume restore
- `kubectl`

## Sources Consulted

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI external-snapshotter documentation](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI external-snapshotter v8.6.0](https://github.com/kubernetes-csi/external-snapshotter/tree/v8.6.0)
- [kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes 1.30: Preventing unauthorized volume mode conversion moves to GA](https://kubernetes.io/blog/2024/04/30/prevent-unauthorized-volume-mode-conversion-ga/)

## Issues Found

- The retained-snapshot example implied that a retained `VolumeSnapshotContent` can simply be rebound. A retained content object is released but remains tied to the old `VolumeSnapshot` identity and is not available for a new binding. Changed the example to say that the preserved backend snapshot's Kubernetes metadata must be recreated for deliberate re-import.
- The static-binding explanation said that setting `volumeSnapshotClassName` requires the content to already use the same class name. Pre-provisioned binding does not require a class, and the common snapshot controller can copy a request's class name onto the content while completing the binding. Replaced the requirement with the simpler, accurate guidance to omit the optional field from both objects for this one-off import.
- The `sourceVolumeMode` guidance treated the field as something to set only when known. Current Kubernetes guidance requires administrators to populate it for pre-provisioned content so volume-mode conversion protection can be enforced. Changed the text to require a verified `Filesystem` or `Block` value and to emphasize administrator responsibility for accuracy.

## Review Notes

- The `snapshot.storage.k8s.io/v1` manifests use the current GA snapshot API and valid field names.
- The `kubectl wait` JSONPath form, JSONPath inspection commands, namespace flags, and timeout syntax are current.
- The static-import readiness caveat is correct: `ListSnapshots` is optional in CSI, and the external-snapshotter assumes a pre-provisioned snapshot is ready when the driver does not advertise that capability. A restore test is therefore still essential.
- Snapshot CRDs, the common snapshot controller, a compatible CSI driver, and its external-snapshotter sidecar must already be installed in the target cluster.
