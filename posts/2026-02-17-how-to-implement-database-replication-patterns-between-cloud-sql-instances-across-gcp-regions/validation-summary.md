# Validation Summary: Use Database Replication Patterns Between Cloud SQL Instances Across GCP Regions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL read replicas and cascading replicas
- Cloud SQL high availability
- Cloud SQL external replication from PostgreSQL
- Google Cloud Monitoring
- SQLAlchemy and pg8000
- PostgreSQL replication and pglogical

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Create read replicas: https://docs.cloud.google.com/sql/docs/postgres/replication/create-replica
- Google Cloud SQL for PostgreSQL: About high availability: https://cloud.google.com/sql/docs/postgres/high-availability
- Google Cloud SQL for PostgreSQL: Configure replication from an external server: https://docs.cloud.google.com/sql/docs/postgres/replication/configure-replication-from-external
- Google Cloud SQL for PostgreSQL: Replication lag: https://docs.cloud.google.com/sql/docs/postgres/replication/replication-lag
- Google Cloud SQL metrics reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/metrics
- Google Cloud SQL for PostgreSQL: SQLAlchemy Unix socket sample: https://docs.cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-sqlalchemy-connect-unix
- Cloud SQL Admin API instances.list reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/list
- SQLAlchemy engine URL documentation: https://docs.sqlalchemy.org/en/21/core/engines.html

## Issues Found
- The SQLAlchemy connection URL was built with an f-string, which can break when usernames or passwords contain reserved URL characters. Changed it to use `sqlalchemy.engine.URL.create`, matching Google Cloud's SQLAlchemy Unix socket sample.
- The Cloud Monitoring HA check treated `database/available_for_failover` as a boolean metric. The metric is an INT64 gauge where values greater than zero mean failover is available, so the check now uses `point.value.int64_value <= 0`.
- The cascading replica section incorrectly said PostgreSQL replicas must connect directly to the primary and then created second-tier replicas from the primary. Cloud SQL for PostgreSQL supports cascading replicas, so the examples now create second-tier replicas from `tier1-replica`.
- The external replication example used unsupported `gcloud sql instances patch --source-ip-address` and `--source-port` flags for configuring a PostgreSQL external primary. Replaced it with the documented source representation instance and Cloud SQL replica JSON/curl workflow.
- The external replication SQL setup omitted pglogical setup needed by Cloud SQL's PostgreSQL external replication workflow. Added `CREATE EXTENSION IF NOT EXISTS pglogical;`.
- The replication lag monitoring snippet used a non-existent `google.cloud.sqladmin_v1beta4.SqlAdminServiceClient` pattern and filtered `replica_byte_lag` by the replica's resource ID. Updated it to use the Cloud SQL Admin API client via `googleapiclient.discovery.build` and filter the lag metric on the primary resource plus `metric.labels.replica_name`.
- The SQLAlchemy 2.x snippet executed a raw SQL string for the replica lag query. Wrapped the statement in `sqlalchemy.text()`.

## Review Notes
The post is now technically valid as a high-level implementation guide. In a future deeper revision, the external migration section could add more operational prerequisites, such as source database flags, firewall allowlisting for the Cloud SQL replica outgoing IP, initial seeding with managed import, and per-database privilege setup.
