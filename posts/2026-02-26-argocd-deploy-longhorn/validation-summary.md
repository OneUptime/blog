# Validation Summary: How to Deploy Longhorn with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Longhorn
- Argo CD
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- PromQL
- S3-compatible backup targets

## Sources Consulted
- Longhorn installation requirements and environment check script: https://longhorn.io/docs/1.6.0/deploy/install/ and https://raw.githubusercontent.com/longhorn/longhorn/v1.6.0/scripts/environment_check.sh
- Longhorn Helm chart v1.6.0 values and templates: https://github.com/longhorn/charts/tree/longhorn-1.6.0/charts/longhorn
- Longhorn backup target documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn recurring jobs documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.6.0/references/storage-class-parameters/
- Longhorn restore from backup documentation: https://longhorn.io/docs/1.6.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn Prometheus monitoring and metrics documentation: https://longhorn.io/docs/1.6.0/monitoring/prometheus-and-grafana-setup/ and https://longhorn.io/docs/1.6.0/monitoring/metrics/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD sync options and automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/ and https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD custom health check documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The prerequisite check Job tested tools inside the `longhorn-manager` container rather than on Kubernetes nodes. Replaced it with Longhorn v1.6.0's official `environment_check.sh`, which deploys privileged node checks and validates host prerequisites such as iSCSI, NFS, packages, and mount propagation.
- The Argo CD Helm values included duplicate `longhornManager` keys, so the first block would be overwritten by YAML parsing. Consolidated the Longhorn manager configuration.
- The Longhorn v1.6.0 chart does not expose `longhornManager.resources` or `longhornDriver.resources` values. Removed those unsupported values and kept supported node selector and toleration settings.
- The Longhorn chart recommends disabling the pre-upgrade checker Job when using Argo CD or other GitOps tooling. Added `preUpgradeChecker.jobEnabled: false`.
- The PromQL examples used incorrect labels and did not filter current-state series. Updated `longhorn_volume_state` and `longhorn_volume_robustness` queries to compare against `1`, changed robustness filtering to use the `state` label, and changed backup error detection to `longhorn_backup_state == 4`.
- The disaster recovery snippet used a Kubernetes `dataSource` with a non-existent `LonghornBackup` object reference. Replaced it with Longhorn's documented restore flow: create a Longhorn `Volume` from `fromBackup`, then bind a Kubernetes PV and PVC to the restored volume.

## Review Notes
- All YAML snippets parse successfully after the corrections.
- Helm rendering was not run because `helm` is not installed in the workspace.
- The post pins Longhorn chart `1.6.0`, which is valid for the article's examples but older than current Longhorn releases as of 2026-05-20. Future updates should revisit version-specific values before upgrading the chart.
