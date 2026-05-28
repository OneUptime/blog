# Validation Summary: How to Use Connection Draining and Failover Strategies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- Cloud SQL high availability and failover
- gcloud CLI
- PgBouncer
- Google Kubernetes Engine
- SQLAlchemy
- psycopg2
- Cloud SQL Admin API
- Cloud SQL Auth Proxy
- Cloud Monitoring
- BigQuery audit log queries

## Sources Consulted
- Cloud SQL for PostgreSQL high availability: https://docs.cloud.google.com/sql/docs/postgres/high-availability
- Cloud SQL Admin API overview: https://docs.cloud.google.com/sql/docs/postgres/admin-api
- Cloud SQL Admin API instances.failover reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances/failover
- gcloud sql instances create reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- gcloud sql instances failover reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/failover
- Cloud SQL Auth Proxy documentation: https://docs.cloud.google.com/sql/docs/postgres/sql-proxy
- Cloud SQL Auth Proxy source/help text: https://github.com/GoogleCloudPlatform/cloud-sql-proxy
- Cloud SQL metrics reference: https://docs.cloud.google.com/sql/docs/postgres/admin-api/metrics
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- PgBouncer configuration reference: https://www.pgbouncer.org/config
- PgBouncer admin command reference: https://www.pgbouncer.org/usage.html
- SQLAlchemy 2.0 pooling and disconnect handling: https://docs.sqlalchemy.org/en/20/core/pooling.html
- SQLAlchemy 2.0 core events: https://docs.sqlalchemy.org/en/20/core/events.html

## Issues Found
- Updated the failover downtime claim from "30 seconds to a few minutes" to Google's current guidance that Cloud SQL is typically unavailable for about 60 seconds, with environment-specific variation.
- Replaced the SQLAlchemy usage example's undefined `Order` model with a concrete `session.execute(text(...))` insert so the snippet is self-contained.
- Reworked the connection draining example. The original code called undefined `set_max_connections()` and `get_settings_version()` methods and used an incorrect `google.cloud.sqladmin_v1` import. It now uses PgBouncer `DISABLE`, `PAUSE`, `RESUME`, and `ENABLE` commands for draining, and uses the documented Cloud SQL Admin API discovery client with `settingsVersion`.
- Corrected the Cloud SQL Auth Proxy section so it no longer implies that the proxy preserves existing database connections during failover. It now states that existing connections are still lost and applications must reconnect.
- Updated the Cloud SQL Auth Proxy container image from `2.8.0` to `2.22.0`, matching the current version shown in Google's documentation.
- Replaced the stale `gcloud alpha monitoring policies create` threshold flags with the current `gcloud monitoring policies create --if="< 1" --duration=60s` syntax.

## Review Notes
- `gcloud` and `cloud-sql-proxy` were not installed in the local environment, so CLI validation was performed against official Google Cloud reference documentation and the Cloud SQL Auth Proxy upstream source/help text.
- The PgBouncer config options used in the post are valid, but `server_reset_query_always = 1` is a workaround setting in transaction pooling and should be used only when the application behavior requires it.
- The examples still use placeholder credentials and host names; production code should load these from a secret manager or workload identity rather than hard-coding them.
