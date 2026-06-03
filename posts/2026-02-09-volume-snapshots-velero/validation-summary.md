# Validation Summary: Using Velero with Volume Snapshots for Kubernetes Persistent Volume Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes CSI VolumeSnapshot API
- CSI external-snapshotter
- AWS EBS CSI snapshots
- Helm
- Prometheus / PromQL
- PostgreSQL backup hooks

## Sources Consulted
- Velero CSI support documentation: https://velero.io/docs/v1.18/csi/
- Velero Backup API type reference: https://velero.io/docs/v1.18/api-types/backup/
- Velero Backup Hooks documentation: https://velero.io/docs/v1.18/backup-hooks/
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero Backup Storage Locations and Volume Snapshot Locations: https://velero.io/docs/v1.18/locations/
- Velero AWS plugin README: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero Helm chart values: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- Kubernetes CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Kubernetes CSI Volume Snapshot and Restore documentation: https://kubernetes-csi.github.io/docs/snapshot-restore-feature
- Velero GitHub releases: https://github.com/velero-io/velero/releases

## Issues Found
- The post used external-snapshotter `v7.0.1`, which is no longer the current stable external-snapshotter release. Updated the CRD and snapshot-controller URLs to `v8.2.0`, matching the current CSI external-snapshotter documentation.
- The Velero CLI download used `v1.13.0`, and the install command used `velero-plugin-for-aws:v1.9.0` plus the separate `velero-plugin-for-csi:v0.7.0`. Current Velero documentation says CSI support is built into Velero from v1.14 and the separate CSI plugin should not be installed manually. Updated the examples to Velero `v1.18.1`, AWS plugin `v1.14.0`, and removed the CSI plugin from the CLI and Helm examples.
- The CLI install example later demonstrated File System Backup but did not install the node agent required for File System Backup. Added `--use-node-agent` to the Velero install command.
- The VolumeSnapshotClass label explanation omitted the Velero requirement that there should be only one labeled class per CSI driver. Added that caveat.
- The schedule hook example ran `pg_dump` to `/tmp`, which does not make the snapshotted PostgreSQL data volume application-consistent. Replaced it with a `CHECKPOINT` example, added `includedResources: pods` for the hook, and updated the surrounding text to recommend database-native backup or quiescing procedures appropriate to the database engine.
- The post described File System Backup as "formerly Restic." Current Velero documentation describes File System Backup as the current feature and notes that the legacy restic path is deprecated. Removed the outdated parenthetical.
- The best-practices section recommended `pg_start_backup` or `pg_dump` too broadly for database consistency. Updated it to recommend engine-appropriate quiescing or backup commands and listed PostgreSQL options based on recovery goals.

## Review Notes
The remaining Velero backup, schedule, restore, namespace mapping, CSI snapshot timeout, VolumeSnapshotClass, Helm values, and Prometheus examples are consistent with current documentation. `velero` was not installed in the local environment, so CLI flags were validated against official documentation rather than local `velero --help` output.
