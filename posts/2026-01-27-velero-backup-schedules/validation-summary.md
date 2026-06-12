# Validation Summary: How to Configure Velero Backup Schedules for Kubernetes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Velero (v1.13.0)
- velero-plugin-for-aws (v1.9.0)
- velero-plugin-for-gcp (v1.9.0)
- velero-plugin-for-microsoft-azure (v1.9.0)
- Kubernetes (Schedule, Restore, VolumeSnapshotLocation CRDs)
- AWS S3 / IAM
- Google Cloud Storage / IAM
- Azure Blob Storage
- Restic / Kopia (file system backup)
- Prometheus Operator (ServiceMonitor, PrometheusRule)

## Sources Consulted
- Velero official docs: https://velero.io/docs/v1.13/
- Velero install reference: https://velero.io/docs/v1.13/customize-installation/
- Velero AWS plugin: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero GCP plugin: https://github.com/vmware-tanzu/velero-plugin-for-gcp
- Velero Azure plugin: https://github.com/vmware-tanzu/velero-plugin-for-microsoft-azure (v1.9.0 README)
- Velero v1.13.0 release: https://github.com/vmware-tanzu/velero/releases/tag/v1.13.0
- Velero metrics source: pkg/metrics/metrics.go at v1.13.0
- Velero CRD types: restore_types.go, schedule_types.go, backup_types.go

## Issues Found

1. **Azure backup-location-config missing `storageAccountKeyEnvVar`** — The Azure install command used storage account access key auth but did not include `storageAccountKeyEnvVar=AZURE_STORAGE_ACCOUNT_ACCESS_KEY` in `--backup-location-config`. Without this, the Azure plugin would attempt to use AAD authentication and the install would fail. Added the missing key to the `--backup-location-config` value.

2. **Fictitious Prometheus metric `velero_schedule_paused`** — The `VeleroSchedulePaused` alert referenced a metric that does not exist in Velero v1.13.0. Replaced it with a `VeleroBackupPartialFailure` alert using the real metric `velero_backup_partial_failure_total`, which surfaces a related, useful failure signal.

## Review Notes

- Verified `velero_backup_failure_total` and `velero_backup_last_successful_timestamp` are real metrics in v1.13.0.
- Verified release artifact `velero-v1.13.0-linux-amd64.tar.gz` exists. The `vmware-tanzu` GitHub org was renamed to `velero-io`, but the original URL still resolves via 301 redirect, so the `wget` command will continue to work.
- Confirmed the asymmetry between the CLI flag `--namespace-mappings` (plural) and the Restore CRD field `namespaceMapping` (singular). Both forms are used correctly in the post.
- Confirmed the Schedule template boolean field is `includeClusterResources` (used correctly in the YAML example).
- The Velero AWS IAM policy matches the recommended policy from the velero-plugin-for-aws docs.
- The GCP IAM grants (`roles/compute.storageAdmin`, `roles/storage.admin`) are broader than Velero's recommended custom role but are not technically incorrect — they will work, just with more privileges than strictly needed. A future revision could narrow these.
- The `restore-config.yaml` example excludes `persistentvolumes` while setting `restorePVs: true`. These are not contradictory (PVs can still be restored via PVC-driven dynamic provisioning), but readers may want to remove `persistentvolumes` from `excludedResources` if they explicitly want PV objects restored. Not technically incorrect.
- The `--use-node-agent` and `--default-volumes-to-fs-backup` flags are correct for Velero 1.10+ (replacing the deprecated `--use-restic` and `--default-volumes-to-restic`).
