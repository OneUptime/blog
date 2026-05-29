# Validation Summary: How to Back Up and Restore an AlloyDB Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB continuous backups and point-in-time recovery
- AlloyDB on-demand and automated backups
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring
- Cloud Scheduler and Cloud Functions
- Cloud KMS customer-managed encryption keys (CMEK)

## Sources Consulted
- Google Cloud AlloyDB backup and recovery overview: https://docs.cloud.google.com/alloydb/docs/backup/overview
- Google Cloud AlloyDB configure backup plans: https://docs.cloud.google.com/alloydb/docs/backup/configure
- Google Cloud AlloyDB create an on-demand backup: https://docs.cloud.google.com/alloydb/docs/backup/create-on-demand
- Google Cloud AlloyDB use point-in-time recovery: https://docs.cloud.google.com/alloydb/docs/backup/restore-pitr
- Google Cloud AlloyDB restore from a backup: https://docs.cloud.google.com/alloydb/docs/backup/restore
- Google Cloud SDK `gcloud alloydb clusters restore` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/restore
- Google Cloud SDK `gcloud alloydb backups create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/backups/create
- Google Cloud SDK `gcloud alloydb clusters update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/update
- Google Cloud SDK `gcloud alloydb instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud Monitoring metrics list for AlloyDB: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post described only two backup strategies and omitted automated backups. Updated the backup type overview to include continuous, on-demand, and automated backups.
- The post stated that backup data is stored in Google Cloud Storage. The official docs describe AlloyDB backup resources and managed backup storage, but do not present user-managed Cloud Storage as the storage target for standard backups. Reworded the sentence to focus on encryption at rest.
- The on-demand backup example used `--description`, which is not supported by `gcloud alloydb backups create`. Removed the unsupported flag.
- The post stated that on-demand backups persist until explicitly deleted. Current docs state standard on-demand backups can be retained for up to one year. Updated the retention wording.
- The PITR restore command used obsolete or invalid flags: `--backup-source=CONTINUOUS` and `--continuous-backup-source`. Replaced them with the documented `--source-cluster` and `--point-in-time` flags.
- The on-demand restore command used the invalid `--backup-source=BACKUP` flag. Removed it and kept the documented `--backup` flag.
- The PITR restore section implied only read pool instances need to be recreated. Official docs state a primary instance must be created after the restored cluster is created. Updated the note.
- The monitoring example used a non-existent metric, `alloydb.googleapis.com/database/backup/count`, and a `status="FAILED"` metric label. Replaced it with the documented `alloydb.googleapis.com/cluster/last_backup_timestamp` metric and a valid `gcloud monitoring policies create` absence alert example.
- The best-practices monitoring note claimed Cloud Monitoring directly alerts on backup failure status. Reworded it to monitoring backup health with Cloud Monitoring alerts and operation logs.

## Review Notes
The local environment did not have the `gcloud` CLI installed, so command validation was performed against the official Google Cloud SDK and AlloyDB documentation instead of local `--help` output.
