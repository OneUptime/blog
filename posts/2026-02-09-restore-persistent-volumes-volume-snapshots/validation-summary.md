# Validation Summary: How to Restore Persistent Volumes from VolumeSnapshots in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumeClaims
- Kubernetes VolumeSnapshots
- CSI snapshot and restore
- Kubernetes StorageClasses
- kubectl
- Kubernetes CronJobs
- Gateway API ReferenceGrant

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CSI Volume Snapshot & Restore documentation: https://kubernetes-csi.github.io/docs/snapshot-restore-feature
- Kubernetes CSI Cross-Namespace Data Sources documentation: https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html

## Issues Found
- The cross-namespace restore example incorrectly used `spec.dataSource` with `kind: VolumeSnapshotContent`. Kubernetes PVC `dataSource` only supports a local `VolumeSnapshot` or `PersistentVolumeClaim`; cross-namespace references require `dataSourceRef` with the CrossNamespaceVolumeDataSource feature and a `ReferenceGrant`. Updated the example to use `dataSourceRef` and added a `ReferenceGrant` in the source snapshot namespace.
- The "copy the snapshot" approach used `kubectl get volumesnapshot ... -o yaml | sed ... | kubectl apply`, which would copy generated metadata/status and would not correctly create an independent usable snapshot binding. Replaced it with a same-namespace restore fallback for clusters without cross-namespace data sources enabled.
- The CronJob restore test created a timestamped namespace but restored into and cleaned up a different hard-coded namespace (`snapshot-test`). Updated the test to restore into the snapshot's current namespace using a unique test PVC name, then delete that PVC.
- The basic PVC restore comments stated that the access mode must match the original PVC and that the StorageClass must support snapshots. Adjusted the wording: the access mode should be compatible with the restored volume, and the StorageClass should be backed by the same CSI driver as the snapshot.

## Review Notes
The main restore pattern using a PVC with `dataSource` pointing to a same-namespace `VolumeSnapshot` is current and correct. Cross-namespace snapshot restore remains feature-gated and requires cluster-level setup, including Gateway API `ReferenceGrant` support and CSI provisioner support.
