# Validation Summary: How to Configure GKE Backup for Google Cloud to Create Scheduled Cluster Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Backup for GKE
- Google Cloud CLI (`gcloud`)
- Kubernetes namespaces, PersistentVolumeClaims, and ProtectedApplications
- Terraform Google provider

## Sources Consulted
- Backup for GKE overview: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/concepts/backup-for-gke
- Enable Backup for GKE for a cluster: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/enable-gke-cluster
- Plan a set of backups: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/backup-plan
- Plan a set of restores: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/restore-plan
- Restore a backup: https://docs.cloud.google.com/kubernetes-engine/docs/add-on/backup-for-gke/how-to/restore
- `gcloud beta container backup-restore backup-plans create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backup-plans/create
- `gcloud beta container backup-restore backups create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backups/create
- `gcloud beta container backup-restore restore-plans create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/restore-plans/create
- `gcloud beta container backup-restore restores create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/restores/create
- Terraform `google_gke_backup_backup_plan` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/gke_backup_backup_plan

## Issues Found
- Removed the unsupported `--backup-order=DEFAULT` flag from the backup plan creation command. The current `gcloud beta container backup-restore backup-plans create` reference does not list this flag.
- Clarified that cron schedules are interpreted as UTC, so the daily schedule runs at 2 AM UTC.
- Corrected the "Selective Backup with Labels" section to describe `ProtectedApplication` selection, because the command uses `--selected-applications`, not label selectors. Added the prerequisite that matching `ProtectedApplication` resources must exist first.
- Corrected restore plan flag values from uppercase enum names to current `gcloud` values such as `restore-volume-data-from-backup` and `delete-and-restore`.
- Replaced the unsupported `--cluster-resource-restore-scope` flag with the documented `--cluster-resource-conflict-policy=use-existing-version` and `--cluster-resource-scope-all-group-kinds` flags.
- Updated the restore mode examples to use the current lowercase hyphenated values documented by Google Cloud.

## Review Notes
The Google Cloud CLI commands remain in the `beta` command group, so the command surface can change. The Terraform backup plan example matches the documented Google provider resource shape.
