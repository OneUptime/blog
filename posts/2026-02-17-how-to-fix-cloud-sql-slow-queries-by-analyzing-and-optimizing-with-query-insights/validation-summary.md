# Validation Summary: How to Fix Cloud SQL Slow Queries by Analyzing and Optimizing

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL Query Insights
- gcloud CLI
- PostgreSQL
- pg_stat_statements
- MySQL Performance Schema
- SQLAlchemy
- sqlcommenter

## Sources Consulted
- Google Cloud SQL for PostgreSQL Query Insights documentation: https://cloud.google.com/sql/docs/postgres/using-query-insights
- Google Cloud SDK `gcloud sql instances patch` reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SQL for PostgreSQL database flags documentation: https://cloud.google.com/sql/docs/postgres/flags
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- MySQL Performance Schema statement digest documentation: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html
- MySQL Performance Schema event timing documentation: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-waits-current-table.html
- SQLAlchemy `before_cursor_execute` event documentation: https://docs.sqlalchemy.org/en/14/core/events.html
- sqlcommenter specification: https://google.github.io/sqlcommenter/spec/

## Issues Found
- The post described the programmatic PostgreSQL and MySQL queries as querying "insights data". These queries read database-local statistics from `pg_stat_statements` and Performance Schema, not the Query Insights dashboard data directly. Changed the wording to "related database statistics programmatically".
- The Query Insights `query-string-length` description said the maximum was 4500. Google Cloud documents 4500 bytes for Cloud SQL Enterprise edition, with higher limits available on Enterprise Plus. Updated the description to avoid implying a universal maximum.
- The PostgreSQL `pg_stat_statements` example only mentioned enabling the extension in a comment. Added `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;` and clarified that loading the module at the instance level can require a restart.
- The SQLAlchemy application-tagging example called `cursor.execute()` inside the `before_cursor_execute` listener, which would execute SQL from within the hook instead of modifying the statement SQLAlchemy sends. Updated it to use `retval=True` and return the modified statement and parameters.
- The SQLAlchemy example used a generic SQL comment format rather than sqlcommenter's serialized key/value format. Updated it to append `/*application='order_service',action='get_orders'*/`, which uses supported Query Insights tag keys and sqlcommenter-style quoting.

## Review Notes
The PostgreSQL `pg_stat_statements` column names used in the examples, including `total_exec_time`, `mean_exec_time`, `max_exec_time`, and `stddev_exec_time`, are valid for current PostgreSQL versions. Older PostgreSQL versions used different timing column names, so this post assumes a currently supported Cloud SQL PostgreSQL version.
