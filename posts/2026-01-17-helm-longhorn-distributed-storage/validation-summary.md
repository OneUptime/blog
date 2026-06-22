# Validation Summary: How to Deploy Longhorn Distributed Storage with Helm on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- Kubernetes StorageClass and PVC resources
- Longhorn RecurringJob and Volume custom resources
- S3-compatible backup targets
- Prometheus ServiceMonitor and metrics
- Grafana

## Sources Consulted
- Longhorn 1.12.0 Quick Installation: https://longhorn.io/docs/1.12.0/deploy/install/
- Longhorn 1.12.0 Helm chart values: https://raw.githubusercontent.com/longhorn/charts/v1.12.x/charts/longhorn/values.yaml
- Longhorn 1.12.0 Customizing Default Settings: https://longhorn.io/docs/1.12.0/advanced-resources/deploy/customizing-default-settings/
- Longhorn 1.12.0 Storage Class Parameters: https://longhorn.io/docs/1.12.0/references/storage-class-parameters/
- Longhorn 1.12.0 Create Longhorn Volumes: https://longhorn.io/docs/1.12.0/nodes-and-volumes/volumes/create-volumes/
- Longhorn 1.12.0 Recurring Snapshots and Backups: https://longhorn.io/docs/1.12.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.12.0 Storage Tags: https://longhorn.io/docs/1.12.0/nodes-and-volumes/nodes/storage-tags/
- Longhorn 1.12.0 CRD manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.12.0/deploy/longhorn.yaml
- Longhorn Backup Target documentation: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- SUSE Storage Longhorn metrics reference: https://documentation.suse.com/cloudnative/storage/1.11/en/observability/longhorn-metrics.html

## Issues Found
- Replaced deprecated `environment_check.sh` usage with the current `longhornctl check preflight` workflow.
- Updated RHEL/CentOS iSCSI installation commands to include the official `tsflags=noscripts` install and initiator name setup.
- Added NFSv4 client prerequisites because Longhorn backup and RWX features require NFSv4 support.
- Moved Helm backup target configuration from obsolete `defaultSettings.backupTarget` fields to current `defaultBackupStore` chart values.
- Replaced obsolete `guaranteedEngineManagerCPU` and `guaranteedReplicaManagerCPU` chart settings with `guaranteedInstanceManagerCPU`.
- Corrected ServiceMonitor Helm values from top-level `serviceMonitor.enabled` to `metrics.serviceMonitor.enabled`.
- Corrected restore-from-backup example to use a StorageClass `fromBackup` parameter instead of an unsupported PVC annotation.
- Added `recurring-job.longhorn.io/source: enabled` to the PVC recurring job example because PVC recurring job labels do not take effect without the source label.
- Corrected the DR volume standby field from `standby` to the Longhorn CRD field `Standby`, and added required practical volume fields such as `size`, `accessMode`, and `frontend`.
- Replaced Kubernetes node labels for disk selection with Longhorn Node custom resource tags, because `diskSelector` and `nodeSelector` match Longhorn storage tags, not arbitrary Kubernetes node labels.

## Review Notes
The post is now technically valid for current Longhorn 1.12.x documentation. The examples remain generic and should still be adapted for specific Kubernetes distributions, CPU architectures, ingress controllers, and backup providers.
