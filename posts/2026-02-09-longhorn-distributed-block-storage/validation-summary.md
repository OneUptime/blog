# Validation Summary: How to Configure Longhorn Distributed Block Storage with Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Longhorn
- Helm
- CSI persistent volumes and volume snapshots
- AWS S3 backup targets
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn backup target configuration: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn storage class parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn CSI VolumeSnapshot for Longhorn snapshots: https://longhorn.io/docs/latest/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn CSI VolumeSnapshot for Longhorn backups: https://longhorn.io/docs/latest/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-backup/
- Longhorn backup creation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/create-a-backup/
- Longhorn Prometheus and Grafana setup: https://longhorn.io/docs/latest/monitoring/prometheus-and-grafana-setup/
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Kubernetes PersistentVolumeClaim data sources and snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The Helm install command used `defaultSettings.backupTarget` and `defaultSettings.backupTargetCredentialSecret`. Current Longhorn Helm values use `defaultBackupStore.backupTarget` and `defaultBackupStore.backupTargetCredentialSecret`, so the command was updated.
- The Helm install command configured a backup target credential secret before the guide created that secret. The secret creation was moved into the installation flow, and the later backup section now notes that the command is only needed if the secret was not created during installation.
- The AWS backup secret example included `AWS_ENDPOINTS=https://s3.amazonaws.com`. Longhorn's AWS S3 example only requires `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`; `AWS_ENDPOINTS` is for S3-compatible endpoints such as GCS or custom object stores, so it was removed from the AWS example.
- The backup target ConfigMap used `longhorn-default-setting` with direct `backup-target` keys. Current Longhorn documentation uses `longhorn-default-resource` with a `default-resource.yaml` data entry, so the manifest was corrected.
- The CSI `VolumeSnapshotClass` omitted the Longhorn snapshot parameter. Longhorn requires `parameters.type: snap` for CSI VolumeSnapshots associated with in-cluster Longhorn snapshots, so the parameter was added.
- The snapshot creation command only applied the `VolumeSnapshot` object. It now applies the `VolumeSnapshotClass` before the snapshot object.
- The backup CRD example used `apiVersion: longhorn.io/v1beta1`, described backups as full copies, and referenced the Kubernetes `VolumeSnapshot` name as `snapshotName`. Current Longhorn examples use `longhorn.io/v1beta2`; backups are incremental by default unless `backupMode: full` is set, and `snapshotName` must be the Longhorn snapshot name. The example and prose were updated.

## Review Notes
The guide assumes the cluster already has CSI snapshot CRDs and a snapshot controller installed; some Kubernetes distributions include these, while others require installing the external snapshotter components separately.
