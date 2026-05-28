# Validation Summary: How to Copy Cloud Spanner Backups Across Regions for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner backups and copied backups
- Google Cloud CLI (`gcloud`)
- Python Cloud Functions
- Google Cloud Scheduler
- Disaster recovery planning

## Sources Consulted
- Cloud Spanner backups overview: https://cloud.google.com/spanner/docs/backup
- Cloud Spanner manage backups, including copy backup and list backup examples: https://cloud.google.com/spanner/docs/backup/manage-backups
- Cloud Spanner restore from backup: https://cloud.google.com/spanner/docs/backup/restore-backups
- Cloud Spanner restore overview: https://cloud.google.com/spanner/docs/backup/restore-backup-overview
- Google Cloud SDK reference for `gcloud spanner backups copy`: https://cloud.google.com/sdk/gcloud/reference/spanner/backups/copy
- Google Cloud SDK reference for `gcloud spanner backups describe`: https://cloud.google.com/sdk/gcloud/reference/spanner/backups/describe
- Google Cloud SDK reference for `gcloud spanner databases restore`: https://cloud.google.com/sdk/gcloud/reference/spanner/databases/restore
- Google Cloud SDK reference for `gcloud spanner operations list`: https://cloud.google.com/sdk/gcloud/reference/spanner/operations/list
- Google Cloud SDK reference for `gcloud spanner instances create`: https://cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud SDK reference for `gcloud spanner instances update`: https://cloud.google.com/sdk/gcloud/reference/spanner/instances/update
- Google Cloud Python Spanner Database Admin client reference: https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_admin_database_v1.services.database_admin.DatabaseAdminClient

## Issues Found
- The DR instance creation command used `--display-name`, which is not a valid required flag for `gcloud spanner instances create` in the current SDK reference. Changed it to `--description`, matching the official command syntax.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference pages.
- The backup copy, backup describe, operations list, restore, instance update, Python `DatabaseAdminClient.copy_backup`, and `list_backups` examples align with current official documentation.
- Spanner documentation notes that a backup copy cannot be initiated if the source or target Google Cloud region is down, so automated copies must run before a regional outage to be useful for disaster recovery.
