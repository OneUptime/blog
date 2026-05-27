# Validation Summary: How to Tune Indexes in Cloud SQL PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL
- pg_stat_statements
- Cloud SQL Index Advisor
- PostgreSQL statistics views
- PostgreSQL indexes

## Sources Consulted
- Google Cloud SQL for PostgreSQL Index Advisor documentation: https://docs.cloud.google.com/sql/docs/postgres/use-index-advisor
- Google Cloud SQL for PostgreSQL database flags documentation: https://docs.cloud.google.com/sql/docs/postgres/flags
- Google Cloud SQL for PostgreSQL extensions documentation: https://docs.cloud.google.com/sql/docs/postgres/extensions
- Google Cloud SDK `gcloud sql instances patch` reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL cumulative statistics views documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL pg_index catalog documentation: https://www.postgresql.org/docs/current/catalog-pg-index.html

## Issues Found
- The post said to enable `pg_stat_statements` with a `cloudsql.enable_pg_stat_statements` database flag. Current Cloud SQL documentation lists `pg_stat_statements` as a supported extension and does not list that Cloud SQL flag, so the setup was changed to create the extension directly.
- The `pg_stat_statements` queries filtered on `dbname`, which is not a column in the PostgreSQL `pg_stat_statements` view. I changed the filters to use `dbid` matched against `pg_database`.
- The query labeled `rows AS avg_rows_returned` used the cumulative `rows` counter. I changed it to `rows / calls` for an average per execution.
- The Index Advisor query referenced `google_db_advisor_recommendations` and columns that are not documented for Cloud SQL PostgreSQL. I changed it to query `google_db_advisor_recommended_indexes` with documented columns.
- The Index Advisor section did not mention that recommendations require Cloud SQL Enterprise Plus with Query Insights and Index Advisor enabled. I added that requirement.
- The unused-index query selected `tablename` and `indexname`, but PostgreSQL's statistics view uses `relname` and `indexrelname`. I corrected the column references while preserving the displayed aliases.
- The stats-reset check used `pg_stat_bgwriter`, which is cluster/background-writer specific. I changed it to `pg_stat_database` for the current database statistics reset timestamp.
- The redundant-index query used array containment on `pg_index.indkey`, which would treat any subset as redundant and could flag indexes incorrectly. I changed it to compare left-prefix B-tree indexes and excluded expression indexes from that simplified check.

## Review Notes
The post is now technically valid as a practical guide. The redundant-index query is still intentionally conservative and does not attempt to reason about uniqueness, predicates, collations, operator classes, sort order, included columns, or workload-specific ordering needs; those are appropriate caveats for manual review before dropping indexes.
