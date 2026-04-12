# Validation Summary: How to Define and Track MySQL SLIs and SLOs

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (Performance Schema, replication status variables)
- Prometheus (PromQL, alerting rules)
- mysqld_exporter (Prometheus MySQL exporter)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Statement Digest Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-digest-summary-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Event Timing (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)
- MySQL 8.0 Reference Manual: Server Status Variables — `Com_*`, `Aborted_connects`, `Connections` (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0.25 Release Notes for QUANTILE column additions
- Prometheus mysqld_exporter documentation for metric names (`mysql_up`, `mysql_global_status_*`, `mysql_slave_status_*`)

## Issues Found

1. **Incorrect proxy metric for Error Rate SLI (line 19)**: The SLI table listed `Com_*` error counters as the proxy metric for error rate. `Com_*` variables (e.g., `Com_select`, `Com_insert`) are statement execution counters that track how many times each statement type has been executed — they are not error counters. Changed to `Aborted_connects`, `Connection_errors_*` to match what the post actually uses in its error rate tracking section.

2. **Wrong MySQL version for `QUANTILE_99` (line 67)**: The note claimed `QUANTILE_99` requires MySQL 8.0.26+. The quantile columns (`QUANTILE_95`, `QUANTILE_99`, `QUANTILE_999`) in `events_statements_summary_by_digest` were added in MySQL 8.0.25. Changed to "MySQL 8.0.25+".

## Review Notes
- The Prometheus metric `mysql_slave_status_seconds_behind_master` and the MySQL variable `Seconds_Behind_Master` use legacy "slave/master" terminology. MySQL 8.0.22+ introduced `SHOW REPLICA STATUS` with `Seconds_Behind_Source` as the updated names, but the old names still work and mysqld_exporter still uses the legacy metric names.
- The `avg_over_time(mysql_up[30d])` PromQL expression requires Prometheus to have at least 30 days of data retention configured, which is worth noting for readers with default retention settings (typically 15 days).
- The alert rules use `labels` implicitly via annotations but omit `labels` blocks — this is fine for basic setups but production deployments typically add severity labels for routing.
