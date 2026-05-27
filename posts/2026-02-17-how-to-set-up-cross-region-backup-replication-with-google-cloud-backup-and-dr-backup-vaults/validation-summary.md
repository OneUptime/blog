# Validation Summary: How to Set Up Cross-Region Backup Replication with Google Cloud Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Backup and DR Service
- Backup and DR backup vaults
- Backup and DR backup plans
- Backup and DR backup plan associations
- Compute Engine VM backup and restore
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud Backup and DR backup vault concepts: https://cloud.google.com/backup-disaster-recovery/docs/concepts/backup-vault
- Create and manage a backup vault: https://cloud.google.com/backup-disaster-recovery/docs/cloud-console/backup-vault-create
- Back up Compute Engine instances to a backup vault: https://cloud.google.com/backup-disaster-recovery/docs/cloud-console/compute/compute-instance-backup
- Restore a Compute Engine instance from a backup vault: https://cloud.google.com/backup-disaster-recovery/docs/cloud-console/compute/compute-instance-restore
- Google Cloud CLI reference for `gcloud backup-dr backup-vaults create`: https://cloud.google.com/sdk/gcloud/reference/backup-dr/backup-vaults/create
- Google Cloud CLI reference for `gcloud backup-dr backup-vaults update`: https://cloud.google.com/sdk/gcloud/reference/backup-dr/backup-vaults/update
- Google Cloud CLI reference for `gcloud backup-dr backup-plans create`: https://cloud.google.com/sdk/gcloud/reference/backup-dr/backup-plans/create
- Google Cloud CLI reference for `gcloud backup-dr backups list`: https://cloud.google.com/sdk/gcloud/reference/backup-dr/backups/list
- Google Cloud CLI reference for `gcloud backup-dr backups restore compute`: https://cloud.google.com/sdk/gcloud/reference/backup-dr/backups/restore/compute
- Backup and DR Service metrics: https://cloud.google.com/backup-disaster-recovery/docs/monitor-reports/metrics
- Cloud Monitoring Google Cloud metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_a_b

## Issues Found
- The post described vault-to-vault cross-region replication using a `--add-replication-target` flag. Official `gcloud backup-dr backup-vaults update` documentation does not include that flag. I changed the post to use the supported model: store backups directly in a compatible cross-region or multi-region backup vault.
- The backup vault creation commands used `--backup-minimum-enforce-retention-duration`, which is not the documented flag. I changed it to `--backup-min-enforced-retention` and used the documented relative duration format.
- The backup plan creation commands omitted the required `--backup-rule` flag. I added a daily backup rule with 30-day retention.
- The post implied backup plans alone protect VMs. I added the required backup plan association command for a Compute Engine VM.
- The verification commands only listed backups and implied primary and secondary vaults should contain matching entries. I changed this to list data sources and backups in the configured cross-region vault.
- The monitoring example used a non-documented replication lag metric. I changed it to the documented `backupdr.googleapis.com/storage/stored_bytes` Backup Vault metric.
- The restore command used the wrong command shape and unsupported flags for Compute Engine restore. I changed it to `gcloud backup-dr backups restore compute` with documented flags including `--data-source`, `--name`, `--target-project`, `--target-zone`, and `--network-interface`.
- The cost and multi-region sections described multiple replication targets. I changed them to describe cross-region and multi-region backup vault storage.

## Review Notes
Cross-region backup vault support is documented as public preview for Compute Engine instances and Compute Engine disks. The post now avoids presenting vault-to-vault replication as a Backup and DR backup vault feature.
