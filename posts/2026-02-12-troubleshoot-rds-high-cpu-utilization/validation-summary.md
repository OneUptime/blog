# Validation Summary: How to Troubleshoot RDS High CPU Utilization

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Amazon RDS
- Amazon CloudWatch metrics and logs
- RDS Enhanced Monitoring
- RDS Performance Insights / CloudWatch Database Insights
- AWS CLI
- PostgreSQL
- MySQL
- RDS Proxy
- Python

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon RDS User Guide: Viewing OS metrics using CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.CloudWatchLogs.html
- Amazon RDS User Guide: Monitoring OS metrics with Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html
- Amazon RDS User Guide: Analyzing queries with the Top SQL tab in Performance Insights - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.Components.AvgActiveSessions.TopLoadItemsTable.TopSQL.html
- Amazon RDS User Guide: Turning Performance Insights on and off for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html
- Amazon RDS User Guide: Modifying an Amazon RDS DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.Modifying.html
- PostgreSQL Documentation: `CREATE INDEX` - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: `REFRESH MATERIALIZED VIEW` - https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- PostgreSQL Documentation: `pg_stat_statements` - https://www.postgresql.org/docs/current/pgstatstatements.html
- MySQL Reference Manual: Performance Schema statement summary tables - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html
- MySQL Reference Manual: `EXPLAIN` output format - https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
- The CloudWatch command used macOS/BSD `date -v-2H`, which fails on typical Linux shells. Replaced the dynamic timestamp generation with a small `python3` command that produces UTC ISO-8601 timestamps for both start and end time.
- The Enhanced Monitoring logs example used `/aws/rds/enhanced-monitoring` as the log group. Amazon RDS publishes Enhanced Monitoring OS metrics to the `RDSOSMetrics` CloudWatch Logs group, so the command was updated.
- The PostgreSQL `pg_stat_statements` query did not mention that the extension must be enabled. Added "if enabled" to avoid implying the view is always present.
- The PostgreSQL `CREATE INDEX CONCURRENTLY` explanation said it creates the index "without locking the table." PostgreSQL still takes locks, but it does not block normal reads and writes, so the wording was corrected.
- The materialized view example used `REFRESH MATERIALIZED VIEW CONCURRENTLY` without first creating a unique index on the materialized view. PostgreSQL requires a suitable unique index for concurrent refreshes, so a unique index on `(day, status)` was added.
- The RDS scale-up example described the impact as "brief downtime." AWS documents that changing DB instance class causes an outage during the change; updated the wording to avoid overpromising duration.

## Review Notes
- Performance Insights remains usable on the review date, June 3, 2026, but AWS has announced changes after June 30, 2026: the Performance Insights console experience is moving under CloudWatch Database Insights, and Advanced mode is required for some features. Future posts should refer to Database Insights alongside Performance Insights.
