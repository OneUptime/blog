# Validation Summary: How to Use InnoDB Change Buffering in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Change Buffer
- InnoDB Buffer Pool
- Performance Schema
- information_schema.INNODB_METRICS

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Change Buffer: https://dev.mysql.com/doc/refman/8.0/en/innodb-change-buffer.html
- MySQL 8.0 Reference Manual — innodb_change_buffering: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_change_buffering
- MySQL 8.0 Reference Manual — innodb_change_buffer_max_size: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_change_buffer_max_size
- MySQL 8.0 Reference Manual — INNODB_METRICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html
- MySQL 8.0 Reference Manual — Server Status Variable Reference: https://dev.mysql.com/doc/refman/8.0/en/server-status-variable-reference.html
- MySQL 8.0 Reference Manual — Performance Schema Event Timing: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.4 Reference Manual — InnoDB Parameters: https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html

## Issues Found

1. **Incorrect InnoDB metric names in the Key Metrics table.** The post used `ibuf_merged_inserts`, `ibuf_merged_delete_marks`, and `ibuf_discarded_inserts`. The correct `information_schema.INNODB_METRICS` names are `ibuf_merges_insert`, `ibuf_merges_delete_mark`, and `ibuf_merges_discard_insert`. Fixed the table to use the correct names.

2. **"Viewing Pending Merges" section queried `performance_schema.global_status` for `Innodb_ibuf_*` variables that do not exist.** MySQL does not expose change buffer metrics as server status variables. These metrics are only available through `information_schema.INNODB_METRICS`. Replaced the query with the correct `information_schema.INNODB_METRICS` query.

## Review Notes
- In MySQL 8.4, the default value of `innodb_change_buffering` changed from `all` to `none`. The variable still exists and is functional, but the default is now off. Users on MySQL 8.4+ should be aware that change buffering is disabled by default. The post does not mention this version-specific change.
- The Performance Schema wait events query (`WHERE name LIKE '%ibuf%'`) is valid SQL but may return few or no results depending on instrumentation configuration. It is not the primary way to monitor change buffer activity; `INNODB_METRICS` and `SHOW ENGINE INNODB STATUS` are more reliable.
- The post's advice to disable change buffering on SSDs is reasonable but should be tested per-workload, as the post correctly notes.
