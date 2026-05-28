# Validation Summary: How to Create a Backup Plan for Compute Engine Instances Using Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Backup and DR Service
- Compute Engine
- Backup plans and backup plan associations
- Backup vaults
- Google Cloud CLI
- Cloud Logging and Cloud Monitoring
- Linux application-consistent snapshots

## Sources Consulted
- Google Cloud CLI: `gcloud backup-dr backup-plans create` - https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/backup-plans/create
- Google Cloud CLI: `gcloud backup-dr backup-plan-associations create` - https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/backup-plan-associations/create
- Backup and DR: Back up Compute Engine instances - https://docs.cloud.google.com/backup-disaster-recovery/docs/cloud-console/compute/compute-instance-backup
- Backup and DR: Restore a Compute Engine instance from a backup vault - https://docs.cloud.google.com/backup-disaster-recovery/docs/cloud-console/compute/compute-instance-restore
- Google Cloud CLI: `gcloud backup-dr backups restore compute` - https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/backups/restore/compute
- Google Cloud CLI: `gcloud backup-dr backups list` and `describe` - https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/backups/list
- Backup and DR: Backup and restore job logs for vaulted backups - https://docs.cloud.google.com/backup-disaster-recovery/docs/monitor-reports/backupvault-backup-recovery-jobs
- Backup and DR: Configure a log-based alert for vaulted resources - https://docs.cloud.google.com/backup-disaster-recovery/docs/monitor-reports/configure-alerts-vault
- Compute Engine: Create Linux application consistent disk snapshots - https://docs.cloud.google.com/compute/docs/disks/creating-linux-application-consistent-pd-snapshots

## Issues Found
- The prerequisites incorrectly required a deployed management console and backup appliance for the backup-vault workflow. Updated prerequisites to match Google-managed Backup and DR backups for Compute Engine: API enabled, backup vault, IAM roles, and vault access.
- The backup plan creation command omitted a backup rule even though the post described creating a scheduled plan. Added a valid `--backup-rule` with recurrence, retention, timezone, and backup window fields.
- Step 2 used `backup-plan-associations create` as if it created a backup rule. Replaced it with `backup-plans update --add-backup-rule` and replaced the unsupported YAML example with repeated `--backup-rule` flags.
- The VM association examples used a zonal location and VM names in the resource URI. Updated them to use the VM region for the association location and the Compute Engine instance ID in the resource URI.
- The application-consistency section used an unsupported public agent installer URL and service name. Replaced it with the supported `--compute-instance-properties=guest-flush=true` backup plan setting and the documented Linux script paths.
- The monitoring commands referenced a non-existent `gcloud backup-dr backup-jobs` command and an invalid Backup and DR metric filter. Replaced them with supported `backups list` and `backups describe` commands plus a Cloud Logging query for failed scheduled backup jobs.
- The restore command used the wrong command group and unsupported restore flags. Updated it to `gcloud backup-dr backups restore compute` with `--backup-vault`, `--data-source`, `--name`, `--target-project`, `--target-zone`, and `--network-interface`.

## Review Notes
The MySQL and PostgreSQL pre/post script examples remain illustrative. Real production scripts should avoid hard-coded passwords, handle lock lifetimes carefully, and be tested under the exact database version and workload.
