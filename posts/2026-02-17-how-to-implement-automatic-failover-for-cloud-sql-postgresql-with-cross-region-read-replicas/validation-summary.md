# Validation Summary: Use Automatic Failover for Cloud SQL PostgreSQL with Cross-Region Read Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL cross-region read replicas
- Cloud SQL Enterprise Plus Advanced DR
- gcloud CLI
- Cloud Monitoring
- Cloud Functions
- Pub/Sub
- Python
- SQLAlchemy
- pg8000
- Cloud SQL Admin API

## Sources Consulted
- Cloud SQL for PostgreSQL: Promote replicas for regional migration or disaster recovery: https://docs.cloud.google.com/sql/docs/postgres/replication/cross-region-replicas
- Cloud SQL for PostgreSQL: Use advanced disaster recovery (DR): https://docs.cloud.google.com/sql/docs/postgres/use-advanced-disaster-recovery
- Cloud SQL for PostgreSQL: Create read replicas: https://docs.cloud.google.com/sql/docs/postgres/replication/create-replica
- Cloud SQL for PostgreSQL: Manage read replicas: https://docs.cloud.google.com/sql/docs/postgres/replication/manage-replicas
- Cloud SQL for PostgreSQL: Replication lag: https://docs.cloud.google.com/sql/docs/postgres/replication/replication-lag
- Cloud SQL Admin API: instances.promoteReplica: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/instances/promoteReplica
- Cloud SQL Admin API client libraries: https://docs.cloud.google.com/sql/docs/postgres/admin-api/libraries
- Cloud SQL for PostgreSQL SQLAlchemy Unix socket sample: https://docs.cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-sqlalchemy-connect-unix
- Cloud Monitoring Pub/Sub notification schema: https://docs.cloud.google.com/monitoring/support/notification-options
- Cloud SQL for PostgreSQL high availability overview: https://cloud.google.com/sql/docs/postgres/high-availability

## Issues Found
- The post described cross-region read replicas as automatic failover targets. Google documents standard read replica promotion as manual and intentional, distinct from HA failover. Updated the title, description, intro, and failover wording to use controlled failover and guarded failover invocation.
- The post used `gcloud sql instances patch replica-europe --failover-target`, which is not the Cloud SQL PostgreSQL Advanced DR command. Replaced it with `gcloud sql instances patch primary-db --failover-dr-replica-name=replica-europe` and updated verification commands.
- The DR configuration omitted Enterprise Plus requirements. Added `--edition=ENTERPRISE_PLUS` and matching `--database-version=POSTGRES_15` where needed for the primary and DR-capable replicas.
- The manual failover command used regular promotion for the designated DR scenario. Updated it to `gcloud sql instances promote-replica replica-europe --failover` and clarified that regular promotion applies to non-DR replicas.
- The Cloud Monitoring metric path used `database/postgresql/replication/replica_byte_lag`; the documented metric is `database/postgres/replication/replica_byte_lag`. Corrected the metric filter.
- The SQLAlchemy Unix socket sample built a raw URL and passed `unix_sock` through `connect_args`. Updated it to use `engine.URL.create(..., query={'unix_sock': ...})`, matching the official Cloud SQL SQLAlchemy pg8000 sample and avoiding password escaping issues.
- The read replica connection context manager caught exceptions raised by query execution and retried them against the primary, which could hide read query errors and unintentionally run reads in a write transaction. Changed fallback to happen only when connecting to the replica fails.
- The Cloud Function Pub/Sub handler decoded `event['data']` as bytes directly. Pub/Sub background events provide base64-encoded data, so the sample now uses `base64.b64decode`.
- The Cloud Function sample used an incorrect Cloud SQL Admin client class and did not pass the Advanced DR failover parameter. Updated it to use the documented Python discovery client for `sqladmin` and call `instances().promoteReplica(..., failover=True).execute()`.
- The notification `topic_path` variable was created inside the try block but used in the except block. Moved it before the promotion attempt.

## Review Notes
- The local environment does not have `gcloud` installed, so CLI flags were verified against official Google Cloud documentation instead of local `--help` output.
- Python code blocks were syntax-checked with `python3` after edits.
