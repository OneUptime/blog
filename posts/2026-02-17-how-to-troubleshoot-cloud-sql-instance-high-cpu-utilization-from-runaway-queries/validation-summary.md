# Validation Summary: How to Troubleshoot Cloud SQL Instance High CPU Utilization from Runaway Queries

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud Monitoring
- gcloud CLI
- MySQL
- PostgreSQL
- Query Insights
- SQL query optimization

## Sources Consulted
- Google Cloud SDK documentation for `gcloud sql instances patch`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud Monitoring documentation for retrieving time-series data: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics
- Google Cloud SQL metrics reference: https://docs.cloud.google.com/sql/docs/sqlserver/admin-api/metrics
- Google Cloud SQL for MySQL Query Insights documentation: https://docs.cloud.google.com/sql/docs/mysql/using-query-insights
- Google Cloud SQL for PostgreSQL database flags documentation: https://docs.cloud.google.com/sql/docs/postgres/flags
- MySQL 8.4 Reference Manual for `KILL`: https://dev.mysql.com/doc/refman/8.4/en/kill.html
- MySQL 8.4 Reference Manual for `max_execution_time`: https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html
- PostgreSQL documentation for `pg_stat_statements`: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation for administrative signaling functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation for `statement_timeout`: https://www.postgresql.org/docs/current/runtime-config-client.html

## Issues Found
- The Cloud Monitoring examples used `date -u -v-1H`, which is BSD/macOS-specific and fails in Linux environments such as Cloud Shell. Changed the examples to use `date -u -d '1 hour ago'`.
- The MySQL slow query log example implied that `mysql.slow_log` is always queryable when slow logging is enabled. Clarified that this applies when slow logging is enabled and `log_output` includes `TABLE`.
- The PostgreSQL buffer usage note described high buffer usage as an indicator of CPU-intensive work. Clarified that it indicates I/O or cache-heavy work that often correlates with expensive queries.
- The MySQL timeout example described `max_execution_time` as a general query timeout. Clarified that it applies to read-only `SELECT` statements.
- The PostgreSQL timeout example used `gcloud sql instances patch --database-flags=statement_timeout=300000`, but `statement_timeout` is not listed in the Cloud SQL for PostgreSQL supported flags page. Replaced it with PostgreSQL `ALTER DATABASE` and `ALTER ROLE` examples.

## Review Notes
The remaining SQL examples and gcloud Query Insights flags align with current official documentation. For production use, operators should preserve any existing Cloud SQL database flags when patching flags, because replacing database flags without including existing values can remove previous flag settings.
