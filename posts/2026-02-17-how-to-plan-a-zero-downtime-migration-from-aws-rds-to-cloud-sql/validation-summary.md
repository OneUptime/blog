# Validation Summary: How to Plan a Zero-Downtime Migration from AWS RDS to Cloud SQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL and MySQL
- Google Cloud Database Migration Service
- Amazon RDS for PostgreSQL and MySQL
- AWS CLI
- Google Cloud CLI
- PostgreSQL and MySQL replication

## Sources Consulted
- Google Cloud Database Migration Service PostgreSQL existing destination migration guide: https://docs.cloud.google.com/database-migration/docs/postgres/create-migration-job-existing-instance
- Google Cloud Database Migration Service PostgreSQL source configuration guide: https://cloud.google.com/database-migration/docs/postgres/configure-source-database
- Google Cloud Database Migration Service MySQL source configuration guide: https://docs.cloud.google.com/database-migration/docs/mysql/configure-source-database
- Google Cloud Database Migration Service migration job metrics: https://docs.cloud.google.com/database-migration/docs/postgres/migration-job-metrics
- Google Cloud SDK reference for Database Migration Service connection profiles: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud SDK reference for Database Migration Service migration jobs: https://cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SQL PostgreSQL instance creation guide: https://docs.cloud.google.com/sql/docs/postgres/create-instance
- AWS RDS for PostgreSQL logical replication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html
- AWS RDS for MySQL binary logging documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.BinaryFormat.html

## Issues Found
- The DMS connection profile commands used the base `connection-profiles create` command with `--provider` flags. Updated them to the current PostgreSQL subcommand syntax: `gcloud database-migration connection-profiles create postgresql`.
- The destination Cloud SQL setup created the target application database before migration. Replaced that with guidance to keep an existing DMS destination empty except for system configuration data.
- The migration flow for an existing Cloud SQL destination omitted the required demotion step. Added `gcloud database-migration migration-jobs demote-destination`.
- The replication lag command only printed job state and phase, not lag. Clarified that actual lag should be checked in the DMS Monitoring tab or Cloud Monitoring metrics.
- The MySQL preparation omitted binary log retention and used a pending reboot for the dynamic RDS MySQL `binlog_format` parameter. Added `mysql.rds_set_configuration('binlog retention hours', 168)` and changed the parameter apply method to `immediate`.
- The Cloud SQL storage size example used `100GB`; changed it to `100`, matching the gcloud flag's GB value convention.
- The PostgreSQL reboot note implied a predictable sub-minute interruption. Reworded it to require a maintenance window and note that duration varies.
- The rollback section suggested switching back to RDS after cutover without accounting for writes accepted by Cloud SQL. Updated it to warn that reverse replication or resynchronization is required to avoid data loss.

## Review Notes
The article remains a PostgreSQL-oriented CLI example while also mentioning MySQL concepts. A future revision could split PostgreSQL and MySQL into separate command paths, because DMS setup details differ by engine.
