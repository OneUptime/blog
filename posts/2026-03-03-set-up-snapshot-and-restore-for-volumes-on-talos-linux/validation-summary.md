# Validation Summary: How to Set Up Snapshot and Restore for Volumes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes VolumeSnapshot API
- Kubernetes CSI external-snapshotter
- Longhorn CSI snapshots
- Rook-Ceph RBD snapshots
- OpenEBS LocalPV ZFS snapshots
- Velero backup and restore
- Kubernetes CronJobs and RBAC

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI snapshot-controller documentation: https://kubernetes-csi.github.io/docs/snapshot-controller.html
- Kubernetes CSI cross-namespace data source documentation: https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html
- Longhorn CSI VolumeSnapshot associated with Longhorn snapshot documentation: https://longhorn.io/docs/1.11.2/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Rook-Ceph snapshot documentation: https://rook.io/docs/rook/v1.11/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- OpenEBS LocalPV ZFS snapshot documentation: https://openebs.io/docs/main/user-guides/local-storage-user-guide/local-pv-zfs/advanced-operations/zfs-snapshot
- Velero CSI support documentation: https://velero.io/docs/v1.17/csi/
- Velero AWS plugin compatibility matrix: https://github.com/vmware-tanzu/velero-plugin-for-aws

## Issues Found
- The snapshot controller installation used `external-snapshotter` `release-6.3`, which current Kubernetes CSI documentation lists as unsupported for newer Kubernetes versions. Updated the CRD and snapshot-controller manifest URLs to `release-8.2`, the current supported release line.
- The post described `VolumeSnapshotContent` as the actual snapshot. Adjusted the wording to say it represents the provisioned snapshot, matching the Kubernetes API model.
- The Longhorn restore PVC comment said the requested storage must be greater than or equal to the original PVC size. Longhorn documentation states the restore PVC size must match the VolumeSnapshot size, so the comment was corrected.
- The test restore example created a PVC in `restore-test` from a `VolumeSnapshot` in the `database` namespace. Standard PVC `dataSource` references are namespace-local unless cross-namespace data sources are explicitly enabled and configured with `dataSourceRef` and ReferenceGrant. Updated the test to restore into the `database` namespace and clean up the test pod and PVC directly.
- The Velero AWS plugin example used `velero/velero-plugin-for-aws:v1.8.0`, which is older than the current Velero 1.17 compatibility matrix. Updated the example to `v1.13.0`.

## Review Notes
The Kubernetes, Longhorn, Rook-Ceph, OpenEBS, and Velero examples are consistent with their official documentation after the edits. The examples still assume the relevant CSI driver is already installed and supports snapshots. Local `kubectl` execution was not possible in this review environment because `kubectl` is not installed, so validation was performed against official documentation and by checking updated manifest URLs.
