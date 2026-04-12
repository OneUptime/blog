# Validation Summary: How to Handle MySQL Table Fragmentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- `information_schema.TABLES` and `information_schema.INNODB_METRICS`
- Percona Toolkit (`pt-online-schema-change`)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB INFORMATION_SCHEMA Metrics Table (https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html)
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA INNODB_METRICS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html)
- MySQL 8.0 Reference Manual — OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual — The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- Percona Toolkit documentation — pt-online-schema-change (https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)

## Issues Found
1. **Incorrect reference to Performance Schema:** The section "Measuring Fragmentation with InnoDB Metrics" stated "Use Performance Schema to check page-level statistics" but the query targets `information_schema.INNODB_METRICS`, which is part of the Information Schema, not Performance Schema. Fixed to reference `information_schema.INNODB_METRICS` directly.

2. **Non-existent metric name `buffer_page_read_total`:** The `INNODB_METRICS` table does not contain a metric called `buffer_page_read_total`. MySQL provides per-page-type read metrics (e.g., `buffer_page_read_index_leaf`, `buffer_page_read_index_non_leaf`) but no single aggregate metric by that name. Removed this metric from the query, as the remaining three metrics (`index_page_splits`, `index_page_merge_attempts`, `index_page_merge_successful`) are the ones directly relevant to measuring fragmentation.

## Review Notes
- The EXPLAIN example in "Understanding When Fragmentation Is Harmful" suggests that the `rows` estimate changes with fragmentation. In practice, the `rows` estimate in EXPLAIN reflects index statistics rather than page fill levels. Fragmentation primarily affects I/O cost (more pages read), which is not directly visible in EXPLAIN output. This is not strictly wrong but could be made more precise in a future revision.
- The `INNODB_METRICS` counters referenced (`index_page_splits`, `index_page_merge_attempts`, `index_page_merge_successful`) are disabled by default in MySQL 8.0. Readers will need to enable them with `SET GLOBAL innodb_monitor_enable = '<metric_name>';` before they produce non-zero values. The post could mention this in a future update.
- The `pt-online-schema-change` example passes `--password=secret` on the command line, which exposes the password in the process list. This is common in examples but a production security concern. A note about using `--ask-pass` or a config file would be a nice addition.
