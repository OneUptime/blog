# Validation Summary: How to Enable and Analyze Slow Query Logs in Cloud SQL MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for MySQL
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring alerting policies
- MySQL slow query log
- MySQL Performance Schema
- mysqldumpslow
- Percona Toolkit pt-query-digest

## Sources Consulted
- Google Cloud SQL for MySQL database flags: https://docs.cloud.google.com/sql/docs/mysql/flags
- Google Cloud SQL for MySQL instance logging: https://docs.cloud.google.com/sql/docs/mysql/logging
- Google Cloud platform logs reference for Cloud SQL MySQL slow logs: https://docs.cloud.google.com/logging/docs/api/platform-logs
- Google Cloud Logging logs-based counter metrics: https://cloud.google.com/logging/docs/logs-based-metrics/counter-metrics
- Google Cloud SDK `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring aggregation API reference: https://docs.cloud.google.com/monitoring/api/v3/aggregation
- MySQL 8.0 slow query log reference: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL mysqldumpslow reference: https://dev.mysql.com/doc/refman/9.0/en/mysqldumpslow.html
- MySQL Performance Schema timing reference: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL Performance Schema table I/O by index usage reference: https://dev.mysql.com/doc/refman/en/performance-schema-table-wait-summary-tables.html
- Percona Toolkit pt-query-digest documentation: https://docs.percona.com/percona-toolkit/pt-query-digest.html

## Issues Found
- Added a note that `gcloud sql instances patch --database-flags` overwrites the full database flag list and can restart the instance. This is documented behavior in Cloud SQL and is important because the original examples could unintentionally clear existing flags.
- Corrected the sample slow query log `SET timestamp` value so it matches the displayed `# Time` line for `2025-06-15T10:23:45Z`.
- Fixed the Cloud Monitoring alert creation command. The original command used non-current flags `--condition-threshold-value` and `--condition-threshold-duration`; the current `gcloud monitoring policies create` syntax uses `--if` and `--duration`. Added an aggregation setting so the "per minute" condition is represented as a 60-second delta.

## Review Notes
The MySQL slow query log flags, Cloud SQL slow-log integration through `log_output=FILE`, Cloud Logging log name, `mysqldumpslow` sort options, Performance Schema timer conversions, and `pt-query-digest` usage were consistent with official documentation. The `log_queries_not_using_indexes` flag can create high log volume, so production users should consider throttling or temporary use when enabling it broadly.
