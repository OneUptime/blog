# Validation Summary: How to Snapshot Legacy In-Tree Volumes After Migrating to a CSI Driver

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes CSI Migration
- Container Storage Interface (CSI) drivers
- Kubernetes VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- Static CSI volume import and PersistentVolume pre-binding
- Provider snapshot import and snapshot-based PVC restoration
- `kubectl`

## Sources Consulted
- Kubernetes: Migrating to CSI Drivers from In-tree Plugins (https://kubernetes.io/docs/concepts/storage/volumes/#migrating-to-csi-drivers-from-in-tree-plugins)
- Kubernetes: In-Tree to CSI Volume Migration Status Update (https://kubernetes.io/blog/2021/12/10/storage-in-tree-to-csi-migration-status-update/)
- Kubernetes: Volume Snapshots (https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- Kubernetes: Volume Snapshot Classes (https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- Kubernetes: Volume Snapshot Moves to GA, including pre-existing snapshot import and restore examples (https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/)
- Kubernetes: Persistent Volumes, including reclaim behavior, deletion protection, and pre-binding (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- Kubernetes API reference: PersistentVolume v1 (https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/)
- Kubernetes API reference: PersistentVolumeClaim v1 (https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- Kubernetes: Well-Known Labels, Annotations and Taints (`pv.kubernetes.io/migrated-to`) (https://kubernetes.io/docs/reference/labels-annotations-taints/#pv-kubernetes-io-migrated-to)
- Kubernetes: `kubectl wait` reference (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- Kubernetes CSI Developer Documentation: CSI external-snapshotter (https://kubernetes-csi.github.io/docs/external-snapshotter.html)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes CSI Migration's operation translation from converting a stored in-tree PersistentVolume source into native `spec.csi` form. Current Kubernetes documentation lists provisioning/deletion, attach/detach, mount/unmount, and resizing as migration-supported operations; the Kubernetes migration status guidance calls for manual CSI PV re-import to use snapshots.
- The `snapshot.storage.k8s.io/v1` examples use current field names. The pre-provisioned snapshot manifest correctly pairs `source.snapshotHandle` with `volumeSnapshotRef`, declares `sourceVolumeMode`, and binds the namespaced `VolumeSnapshot` through `volumeSnapshotContentName`.
- The static PV/PVC example is structurally valid and correctly uses matching `storageClassName`, `claimRef`, and `volumeName` fields for explicit pre-binding. The post appropriately labels the CSI driver, handle, topology, attributes, and secret requirements as vendor-specific.
- The `kubectl wait --for=jsonpath='{.status.readyToUse}'=true` syntax is supported by the current `kubectl` reference. The restore-size and isolated restore-validation guidance is also correct.
- The post is intentionally provider-neutral. Operators must continue to use their CSI driver's documentation for the exact `volumeHandle`, topology, secret references, static-import support, and accepted provider snapshot identifiers.
