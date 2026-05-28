# Validation Summary: How to Migrate On-Premises SQL Server to Cloud SQL for SQL Server

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud SQL for SQL Server
- Google Cloud Database Migration Service
- Google Cloud CLI
- Cloud Storage
- SQL Server backup and restore
- SQL Server transaction log backups
- SQL Server Agent
- Cloud Scheduler and Cloud Functions

## Sources Consulted
- Cloud SQL for SQL Server database versions and version policies: https://docs.cloud.google.com/sql/docs/sqlserver/db-versions
- Cloud SQL for SQL Server features and unsupported features: https://docs.cloud.google.com/sql/docs/sqlserver/features
- Cloud SQL import/export with BAK and transaction log files: https://docs.cloud.google.com/sql/docs/sqlserver/import-export/import-export-bak
- `gcloud sql import bak` reference: https://cloud.google.com/sdk/gcloud/reference/sql/import/bak
- Database Migration Service for SQL Server scenario overview: https://docs.cloud.google.com/database-migration/docs/sqlserver/scenario-overview
- Database Migration Service supported SQL Server backup file types: https://docs.cloud.google.com/database-migration/docs/sqlserver/supported-backup-files
- Database Migration Service SQL Server backup file preparation and naming conventions: https://docs.cloud.google.com/database-migration/docs/sqlserver/export-backup-files
- Database Migration Service SQL Server source connection profiles: https://docs.cloud.google.com/database-migration/docs/sqlserver/create-source-connection-profile
- Database Migration Service SQL Server destination connection profiles: https://docs.cloud.google.com/database-migration/docs/sqlserver/create-destination-connection-profile
- `gcloud database-migration migration-jobs create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Database Migration Service SQL Server promotion workflow: https://docs.cloud.google.com/database-migration/docs/sqlserver/finalize-migration

## Issues Found
- The supported Cloud SQL for SQL Server versions were outdated. Updated the version list from only 2017/2019 to include currently documented SQL Server 2017, 2019, 2022, and 2025 support, depending on edition.
- The Cloud SQL limitations list incorrectly said SQL Server Agent and linked servers are unavailable. Updated it to reflect current support and noted the important limitations.
- The SSIS/SSRS/SSAS wording was too broad. Updated it to clarify that SSIS and SSRS can run externally and connect to Cloud SQL, while SSAS is unsupported.
- The Cloud SQL create command used `--storage-size 200GB`; the documented flag expects a size in GB. Changed it to `--storage-size 200`.
- The transaction log restore sequence used `--no-recovery false`, which is not the documented way to bring a database online. Updated the sequence to restore the full backup and intermediate logs with `--no-recovery`, then use `--recovery-only`.
- The DMS section incorrectly instructed readers to enable SQL Server CDC tables with `sp_cdc_enable_db` and table-level CDC. Replaced it with the documented homogeneous SQL Server DMS flow using full, optional differential, and transaction log backup files in Cloud Storage.
- The DMS connection profile commands used invalid generic `--type`-based forms. Updated them to use `gcloud database-migration connection-profiles create sqlserver` with the documented source bucket and destination Cloud SQL fields.
- The migration job command used `--databases`, which is not the SQL Server homogeneous migration flag. Changed it to `--sqlserver-databases`.
- The cutover instructions referred to final CDC changes. Updated them to refer to processing the final transaction log backup and the `.trn.final` suffix convention.
- The SQL Server Agent replacement section incorrectly stated Cloud SQL does not include SQL Server Agent. Updated it to cover jobs that may need changes or off-platform alternatives.
- The login migration note incorrectly said Cloud SQL does not support Active Directory. Updated it to mention supported Windows Authentication directory integrations that require explicit configuration.
- The collation note stated a fixed Cloud SQL default. Updated it to say a default collation can be set at instance creation and gave `SQL_Latin1_General_CP1_CI_AS` as an example.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI reference documentation instead of local `--help` output.
