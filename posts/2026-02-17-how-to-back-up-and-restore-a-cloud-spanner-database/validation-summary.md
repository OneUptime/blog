# Validation Summary: How to Back Up and Restore a Cloud Spanner Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Google Cloud CLI (`gcloud`)
- Spanner backups and restores
- Spanner backup schedules
- Disaster recovery concepts

## Sources Consulted
- Cloud Spanner backups overview: https://cloud.google.com/spanner/docs/backup
- Cloud Spanner create backups documentation: https://cloud.google.com/spanner/docs/backup/create-backups
- Cloud Spanner manage backups documentation: https://cloud.google.com/spanner/docs/backup/manage-backups
- Cloud Spanner restore from backup documentation: https://cloud.google.com/spanner/docs/backup/restore-backups
- Cloud Spanner create and manage backup schedules documentation: https://cloud.google.com/spanner/docs/backup/create-manage-backup-schedules
- `gcloud spanner backups create` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/backups/create
- `gcloud spanner backups update-metadata` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/backups/update-metadata
- `gcloud spanner databases restore` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/databases/restore
- `gcloud spanner operations list` reference: https://cloud.google.com/sdk/gcloud/reference/spanner/operations/list
- Cloud Spanner Python client `Backup` type reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_admin_database_v1.types.Backup

## Issues Found
- The post stated that Spanner does not have a built-in backup schedule and recommended Cloud Scheduler plus Cloud Functions. This is outdated: Spanner supports native backup schedules, including full and incremental schedules. I replaced the automation example with a `gcloud spanner backup-schedules create` command.
- The restore section said cross-instance restore requires the same project and same instance configuration. Current Spanner documentation describes destination compatibility in terms of Spanner edition tier, or same instance configuration plus same-or-higher edition. I updated that wording.
- The cost section said backup size is typically similar to database size. Spanner documentation notes that backup storage can be smaller or larger than the live database size and has no exact predictable ratio. I adjusted the wording.

## Review Notes
- The `gcloud` executable is not installed in this local environment, so CLI checks were performed against official Google Cloud SDK reference documentation rather than local `--help` output.
- The backup creation, description, listing, deletion, version time, consistency, and update-metadata examples align with official Cloud Spanner documentation.
