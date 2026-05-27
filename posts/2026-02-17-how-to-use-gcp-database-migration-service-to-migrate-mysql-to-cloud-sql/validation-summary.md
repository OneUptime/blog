# Validation Summary: How to Use GCP Database Migration Service to Migrate MySQL to Cloud SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Database Migration Service
- Cloud SQL for MySQL
- MySQL replication and binary logging
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud Database Migration Service: Configure your MySQL source database - https://docs.cloud.google.com/database-migration/docs/mysql/configure-source-database
- Google Cloud Database Migration Service: Create a source connection profile - https://docs.cloud.google.com/database-migration/docs/mysql/create-source-connection-profile
- Google Cloud Database Migration Service: Create a migration job to an existing destination instance - https://docs.cloud.google.com/database-migration/docs/mysql/create-migration-job-existing-instance
- Google Cloud SDK: `gcloud database-migration connection-profiles create mysql` - https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/mysql
- Google Cloud SDK: `gcloud database-migration migration-jobs create` - https://cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SDK: `gcloud database-migration migration-jobs promote` - https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/promote
- Cloud SQL for MySQL replication lag documentation - https://docs.cloud.google.com/sql/docs/mysql/replication/replication-lag
- Database Migration Service supported databases - https://docs.cloud.google.com/database-migration/docs/supported-databases

## Issues Found
- The DMS connection profile commands used invalid generic syntax and `--mysql-*` flags. Updated the examples to use the current `gcloud database-migration connection-profiles create mysql` subcommand with `--host`, `--port`, `--username`, `--password`, and `--cloudsql-instance`.
- The SSL connection profile example used non-current flag names. Updated it to use `--ssl-type`, `--ca-certificate`, `--client-certificate`, and `--private-key`.
- The replication user grants were incomplete for a continuous managed dump migration. Added `EXECUTE`, `SHOW VIEW`, `RELOAD`, and `TRIGGER`, and noted `LOCK TABLES` for Amazon RDS or Amazon Aurora sources.
- The guide created an existing Cloud SQL destination but did not demote it before starting the migration job. Added the required `gcloud database-migration migration-jobs demote-destination` step.
- The Cloud SQL instance creation command used `--storage-size=100GB`, but the flag expects an integer number of GB. Updated it to `--storage-size=100`.
- The replication lag command referenced `durationSinceLastVpcPeering`, which is not a replication lag field. Replaced it with `SHOW SLAVE STATUS\G` and directed readers to inspect `Seconds_Behind_Master`.
- The promotion description implied DMS stops source writes automatically. Updated it to clarify that replication is stopped and Cloud SQL is promoted, while application writes to the source should be stopped before promotion.
- The GTID comment described GTID as recommended in all cases. Adjusted the wording because Database Migration Service supports `GTID_MODE` set to `ON` or `OFF` depending on migration requirements.

## Review Notes
The post remains a valid technical tutorial. Google Cloud documentation now also lists MySQL 5.5 and 8.4 support for some source types, but the post's narrower prerequisite list of MySQL 5.6, 5.7, and 8.0 is still technically valid for the example scenario.
