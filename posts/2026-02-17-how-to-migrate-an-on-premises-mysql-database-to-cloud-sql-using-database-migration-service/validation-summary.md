# Validation Summary: How to Migrate an On-Premises MySQL Database to Cloud SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Database Migration Service
- Cloud SQL for MySQL
- MySQL binary logs and GTID
- Google Cloud CLI
- Cloud VPN, Cloud Interconnect, public IP, and reverse SSH connectivity

## Sources Consulted
- Google Cloud Database Migration Service for MySQL - Configure your source: https://docs.cloud.google.com/database-migration/docs/mysql/configure-source-database
- Google Cloud Database Migration Service for MySQL - Create a source connection profile: https://docs.cloud.google.com/database-migration/docs/mysql/create-source-connection-profile
- Google Cloud Database Migration Service for MySQL - Create a migration job to an existing destination instance: https://docs.cloud.google.com/database-migration/docs/mysql/create-migration-job-existing-instance
- Google Cloud SDK reference - gcloud database-migration connection-profiles create mysql: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/mysql
- Google Cloud SDK reference - gcloud database-migration connection-profiles create cloudsql: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/cloudsql
- Google Cloud SDK reference - gcloud database-migration migration-jobs create: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SDK reference - gcloud database-migration migration-jobs start: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/start
- Cloud SQL for MySQL features: https://docs.cloud.google.com/sql/docs/mysql/features
- MySQL 8.0 Reference Manual - Binary Logging Options and Variables: https://dev.mysql.com/doc/mysql/8.0/en/replication-options-binary-log.html

## Issues Found
- The DMS migration user grants were incomplete for a continuous migration with a managed dump. Added `SHOW VIEW`, `TRIGGER`, and `EXECUTE`, and removed the unnecessary `SHOW DATABASES` grant.
- The source connection profile commands used the wrong gcloud syntax and obsolete SSL flag names. Updated them to use `connection-profiles create mysql` and the documented `--ssl-type`, `--ca-certificate`, `--client-certificate`, and `--private-key` flags.
- The existing Cloud SQL destination connection profile command used the wrong syntax. Updated it to use `connection-profiles create mysql` with `--cloudsql-instance`.
- The flow omitted demoting an existing Cloud SQL destination before starting the migration. Added the required `gcloud database-migration migration-jobs demote-destination` step.
- The binary log retention examples used only `expire_logs_days`, which is deprecated in MySQL 8.0 and removed in newer MySQL releases. Updated the configuration and runtime examples to prefer `binlog_expire_logs_seconds`, while noting `expire_logs_days` for MySQL 5.5-5.7.
- The Cloud SQL storage engine note was too soft. Updated it to state that Cloud SQL for MySQL supports only InnoDB.

## Review Notes
The post is technically relevant and covers an active migration workflow. The examples are still placeholders and require project-specific values, networking choices, and instance sizing before use in production.
