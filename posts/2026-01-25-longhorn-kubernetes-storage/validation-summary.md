# Validation Summary: How to Implement Longhorn for Kubernetes Storage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Longhorn
- Helm
- Kubernetes PersistentVolumeClaims and StorageClasses
- CSI VolumeSnapshots
- Longhorn backup targets and recurring jobs
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Longhorn 1.12.0 Quick Installation: https://longhorn.io/docs/1.12.0/deploy/install/
- Longhorn 1.12.0 Install with Helm: https://longhorn.io/docs/1.12.0/deploy/install/install-with-helm/
- Longhorn 1.12.0 Customizing Default Settings: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn 1.12.0 ReadWriteMany Volumes: https://longhorn.io/docs/1.12.0/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn 1.12.0 StorageClass Parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn 1.12.0 CSI VolumeSnapshot Associated with Longhorn Snapshot: https://longhorn.io/docs/1.12.0/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn 1.12.0 Setting a Backup Target: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn 1.12.0 Recurring Snapshots and Backups: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.12.0 Restore from a Backup: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn 1.12.0 Node Maintenance and Kubernetes Upgrade Guide: https://longhorn.io/docs/1.12.0/maintenance/maintenance/
- Longhorn 1.12.0 Metrics for Monitoring: https://longhorn.io/docs/1.12.0/monitoring/metrics/
- CNCF Longhorn project page: https://www.cncf.io/projects/longhorn/

## Issues Found
- Updated Longhorn's CNCF maturity from sandbox to incubating. CNCF lists Longhorn as an incubating project since November 4, 2021.
- Corrected the claim that Longhorn only supports ReadWriteOnce. Longhorn supports RWX volumes through NFSv4 share-manager pods.
- Updated the Kubernetes prerequisite from 1.21+ to 1.25+, matching current Longhorn installation requirements.
- Clarified that `open-iscsi` is required for nodes hosting V1 volumes and added the NFSv4 client prerequisite for NFS backups and RWX volumes.
- Added the RHEL/CentOS/Fedora initiator name setup command from the Longhorn open-iscsi installation guidance.
- Fixed the Helm setting from `defaultSettings.replicaCount` to `defaultSettings.defaultReplicaCount` and added `--create-namespace`.
- Replaced obsolete Setting CR examples for backup target configuration with the current `longhorn-default-resource` ConfigMap format.
- Added `recurring-job.longhorn.io/source: enabled` to the PVC label example because Longhorn does not synchronize recurring-job labels from PVCs unless the source label is enabled.
- Updated backup restore commands to use `backups.longhorn.io` and to retrieve the exact backup URL and size from the Backup CR status before creating the restore Volume.
- Added `dataEngine: v1` to the backup restore Volume manifest, matching current Longhorn restore examples.
- Replaced the node scheduling annotation flow with `kubectl cordon` / `kubectl uncordon`, since current Longhorn maintenance guidance automatically disables and re-enables Longhorn scheduling when Kubernetes nodes are cordoned or uncordoned.

## Review Notes
The remaining examples are broadly accurate for Longhorn 1.12.x and Kubernetes `networking.k8s.io/v1`, `storage.k8s.io/v1`, and `snapshot.storage.k8s.io/v1` APIs. The VolumeSnapshot examples assume CSI snapshot CRDs and the snapshot controller are installed if the Kubernetes distribution does not provide them.
