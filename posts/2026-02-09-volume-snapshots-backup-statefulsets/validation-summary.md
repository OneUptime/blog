# Validation Summary: How to Implement Volume Snapshots for Backup and Restore of StatefulSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes VolumeSnapshot, VolumeSnapshotClass, and VolumeSnapshotContent APIs
- Kubernetes StatefulSets, PersistentVolumeClaims, CronJobs, RBAC, and Secrets
- CSI external-snapshotter and snapshot controller
- Longhorn CSI snapshots
- PostgreSQL and MySQL snapshot consistency commands
- Velero CSI snapshot backup and CSI snapshot data movement
- PrometheusRule monitoring examples

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI VolumeSnapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Kubernetes CSI snapshot controller documentation: https://kubernetes-csi.github.io/docs/snapshot-controller.html
- Kubernetes CSI external-snapshotter v8.4.0 manifests: https://github.com/kubernetes-csi/external-snapshotter/tree/v8.4.0
- Longhorn CSI VolumeSnapshot documentation: https://longhorn.io/docs/latest/snapshots-and-backups/csi-snapshot-support/
- Longhorn CSI VolumeSnapshot associated with Longhorn snapshot documentation: https://longhorn.io/docs/latest/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Velero CSI support documentation: https://velero.io/docs/v1.18/csi/
- Velero CSI snapshot data movement documentation: https://velero.io/docs/v1.18/csi-snapshot-data-movement/
- Velero v1.18.1 release notes: https://github.com/velero-io/velero/releases/tag/v1.18.1
- Velero AWS plugin repository: https://github.com/velero-io/velero-plugin-for-aws
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- Corrected the CSI snapshot lifecycle explanation. The original text said the external-snapshotter sidecar directly handled a VolumeSnapshot request; Kubernetes documents that the snapshot controller creates and binds VolumeSnapshotContent objects, while the CSI external-snapshotter sidecar watches VolumeSnapshotContent and calls the CSI driver.
- Updated external-snapshotter CRD and snapshot-controller URLs from v6.3.0 to v8.4.0, and updated the controller pod label selector to match the current manifest label.
- Added creation of the `postgres-secret` before applying the PostgreSQL StatefulSet, because the StatefulSet referenced the Secret but the tutorial did not create it.
- Fixed the MySQL consistency command so `$MYSQL_ROOT_PASSWORD` is expanded inside the target pod rather than by the local shell.
- Removed the CronJob's dependency on `jq` because `bitnami/kubectl` images do not guarantee it. Replaced it with `kubectl`, `awk`, and `date` cleanup logic.
- Added `watch` permission to the CronJob Role so `kubectl wait` can observe VolumeSnapshot readiness.
- Corrected the Velero object-storage section. Standard CSI snapshot backups do not necessarily copy snapshot data to object storage; Velero requires CSI snapshot data movement for that workflow. Updated the Velero CLI, plugin version, install command, and backup command accordingly.
- Qualified the Prometheus alert example so it only applies when kube-state-metrics is configured to expose VolumeSnapshot custom resource metrics.

## Review Notes
- The examples remain driver-dependent. Longhorn supports the shown `parameters.type: snap`, but other CSI drivers require different VolumeSnapshotClass parameters.
- The application-consistency examples are simplified. Production PostgreSQL and MySQL workflows should coordinate write quiescing, checkpoints, locks, and snapshot timing with the application's operational requirements.
- The CronJob example assumes a kubectl container image with GNU-compatible `date`, `awk`, and `xargs`.
