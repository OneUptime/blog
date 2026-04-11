# Validation Summary: How to Optimize MySQL Server for Low Memory Environments

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL Performance Schema
- Linux memory monitoring (`free -m`)
- tmpfs (`/dev/shm`)
- MySQL configuration (`my.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Startup Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-init-startup-configuration.html)
- MySQL 8.0 Reference Manual: `innodb_buffer_pool_size` (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size)
- MySQL 8.0 Reference Manual: `innodb_buffer_pool_instances` (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances)
- MySQL 8.0 Reference Manual: `innodb_log_buffer_size` (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_log_buffer_size)
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema memory summary tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html)
- MySQL 8.0 Reference Manual: `performance_schema.memory_summary_global_by_event_name` table columns

## Issues Found

### Issue 1: Incorrect column name in Performance Schema query
- **What was wrong:** The SQL query to check Performance Schema memory usage used `current_alloc`, which is not a column in `performance_schema.memory_summary_global_by_event_name`. That column belongs to the `sys.memory_global_by_current_bytes` view.
- **What was changed:** Replaced `SUM(current_alloc)` with `SUM(CURRENT_NUMBER_OF_BYTES_USED)` and used uppercase column/table identifiers to match the canonical Performance Schema naming convention.
- **Why:** The original query would fail with an "Unknown column" error. `CURRENT_NUMBER_OF_BYTES_USED` is the correct column in the `performance_schema.memory_summary_global_by_event_name` table.

### Issue 2: Misleading description of InnoDB log buffer default
- **What was wrong:** The text stated "the default is fine" while setting `innodb_log_buffer_size = 8M`. The MySQL 8.0 default is 16M, so 8M is actually a reduction to half the default, not the default value.
- **What was changed:** Replaced "On a low-traffic server, the default is fine:" with "The default is 16M, which can be halved on a low-traffic server:" to accurately describe the change being made.
- **Why:** Readers following this guide would be misled into thinking 8M is the default, when it is actually a deliberate reduction.

### Issue 3: Missing `read_buffer_size` in complete my.cnf example
- **What was wrong:** The "Complete Low-Memory my.cnf Example" section was missing `read_buffer_size = 512K`, which was included in the "Reduce Per-Session Buffers" section earlier in the post.
- **What was changed:** Added `read_buffer_size = 512K` to the complete configuration example.
- **Why:** The complete example should be a copy-paste-ready configuration that includes all the settings discussed in the post. Omitting a recommended setting creates an inconsistency.

## Review Notes
- The per-session buffer values of 512K for `sort_buffer_size`, `join_buffer_size`, and `read_rnd_buffer_size` are actually at or above the MySQL 8.0 defaults (256K each). The `read_buffer_size` at 512K is 4x the default (128K). While the section title says "Reduce," these values are reasonable explicit settings for a low-memory configuration and ensure predictable behavior regardless of prior tuning. This is not incorrect, but readers should be aware these are not reductions from MySQL 8.0 defaults.
- The `tmpdir = /dev/shm` advice, while valid, should be used cautiously on low-memory servers since it trades RAM for disk I/O speed. On a 512MB-1GB server, large temporary tables in `/dev/shm` could compete with the InnoDB buffer pool and OS for limited RAM. The post does caveat this with "If the server has more CPU than disk I/O."
- The `thread_stack = 192K` is below the MySQL 8.0 default of 286720 bytes (~280K on 64-bit systems). This is a valid reduction but could cause issues with complex stored procedures or deeply nested queries. The post could mention this caveat.
- The post does not specify which MySQL version it targets. All configuration parameters and syntax are valid for MySQL 8.0, which is the current GA release.
