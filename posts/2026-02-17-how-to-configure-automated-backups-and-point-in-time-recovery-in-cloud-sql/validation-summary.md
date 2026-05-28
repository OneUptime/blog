# Validation Summary: How to Configure Automated Backups and Point-in-Time Recovery in Cloud SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL automated backups
- Cloud SQL point-in-time recovery
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- PostgreSQL
- MySQL

## Sources Consulted
- Google Cloud SQL backups overview: https://cloud.google.com/sql/docs/postgres/backup-recovery/backups
- Google Cloud SQL backup options: https://cloud.google.com/sql/docs/mysql/backup-recovery/backup-options
- Google Cloud SQL configure PITR for PostgreSQL: https://cloud.google.com/sql/docs/postgres/backup-recovery/configure-pitr
- Google Cloud SQL configure PITR for MySQL: https://cloud.google.com/sql/docs/mysql/backup-recovery/configure-pitr
- Google Cloud SQL perform PITR: https://cloud.google.com/sql/docs/postgres/backup-recovery/pitr
- Google Cloud SQL restore from backup: https://cloud.google.com/sql/docs/mysql/backup-recovery/restoring
- Google Cloud CLI `gcloud sql instances create`: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud CLI `gcloud sql instances patch`: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud CLI `gcloud sql instances clone`: https://cloud.google.com/sdk/gcloud/reference/sql/instances/clone
- Google Cloud CLI `gcloud sql backups list`: https://cloud.google.com/sdk/gcloud/reference/sql/backups/list
- Google Cloud CLI `gcloud sql backups create`: https://cloud.google.com/sdk/gcloud/reference/sql/backups/create
- Google Cloud CLI `gcloud sql backups restore`: https://cloud.google.com/sdk/gcloud/reference/sql/backups/restore
- Terraform Google provider `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance

## Issues Found
- The post described automated backups as full daily snapshots that survive instance deletion. Updated this to explain that Cloud SQL backups are incremental after the first backup and are retained after deletion only when backup retention after deletion is enabled.
- The post described `--retained-backups-count` as a number of days. Updated the wording to describe it as a count of retained automated backups, and noted the current default differences between Enterprise and Enterprise Plus editions.
- The Terraform example used `retained_backups` directly inside `backup_configuration`, which is not a valid field in the current Google provider schema. Removed the invalid direct field and kept the valid `backup_retention_settings.retained_backups` configuration.
- The post said on-demand backups count toward the retention limit. Updated this to state that standard on-demand backups are retained until deleted or until the containing instance is deleted, unless backup retention after deletion is enabled.
- The post claimed Cloud SQL provides free backup storage up to the instance disk size. Updated the cost section to align with current Cloud SQL documentation: backup costs are based on total backup size, storage location, and retention settings.
- The post said backups are stored in the same region as the instance by default. Updated this to the current behavior: Cloud SQL stores backups in the geographically closest multi-region by default, and `--backup-location` sets a custom backup location.

## Review Notes
The `gcloud` commands for enabling backups, enabling PITR, creating/listing/restoring backups, cloning with `--point-in-time`, and exporting SQL dumps match current Google Cloud CLI documentation. The post focuses on standard Cloud SQL backups; enhanced backups and Backup and DR backup vault workflows have different restore and PITR details and could be covered separately in a future update.
