# Validation Summary: How to Schedule Automated Rancher Backups

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup Operator
- Kubernetes
- `kubectl`
- Prometheus Operator
- Amazon S3 / S3-compatible object storage

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Backing up Rancher: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher backup CRD definition: https://github.com/rancher/backup-restore-operator/blob/release/v8.x/charts/rancher-backup-crd/templates/backup.yaml
- Rancher backup controller: https://github.com/rancher/backup-restore-operator/blob/release/v8.x/pkg/controllers/backup/controller.go
- Rancher backup metrics implementation: https://github.com/rancher/backup-restore-operator/blob/release/v8.x/pkg/monitoring/metrics.go
- Rancher chart Prometheus rules: https://github.com/rancher/backup-restore-operator/blob/release/v8.x/charts/rancher-backup/templates/prometheus-rules.yaml

## Issues Found
- The post used `rancher-resource-set`, which is deprecated in Rancher v2.11 and removed from current docs. Updated the examples to `rancher-resource-set-full`, which is a current supported resource set.
- The S3 endpoint examples used `s3.amazonaws.com` while the Rancher docs document region-specific S3 endpoints. Updated the examples to `s3.us-east-1.amazonaws.com` to match the configured region.
- The `kubectl get backups.resources.cattle.io` example output did not match the Backup CRD printer columns and incorrectly implied that each scheduled run appears as a separate Backup object. Updated the explanation and sample output to reflect the actual columns and the `Latest-Backup` status field.
- The Prometheus alert used `kube_customresource_status_condition`, which is not the metric exposed by the Rancher backup operator itself. Replaced it with an alert based on the operator's documented metrics, specifically `rancher_backups_failed_total`, and moved the example rule to the operator namespace used by the official chart.
- The statement that changing `schedule` is picked up "immediately" was too strong. Updated it to say the new schedule is used for future runs.
- The pause/resume guidance suggested removing the `schedule` field as a supported way to pause recurring backups. The operator does not expose a dedicated pause flag, so the post was corrected to use deleting and later reapplying the Backup custom resource.
- The post referenced GCS and Azure Blob as backup targets, but the Rancher backup documentation for this operator covers S3-compatible object storage and persistent volumes. Updated the storage wording to match documented support.

## Review Notes
- The post now uses `rancher-resource-set-full`, which includes secrets in the backup. Rancher documentation strongly recommends enabling encryption when storing backups that include sensitive data.
- The monitoring example assumes the backup operator metrics endpoint is enabled; this is disabled by default in the Helm chart.
- The Rancher docs still state the backup operator applies to Rancher v2.5.0 and later, but resource set naming changed over time. The post has been updated to current resource set names that match current Rancher documentation.
