# Validation Summary: How to Use the MySQL Clone Plugin for Rapid Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.17+)
- MySQL Clone Plugin
- MySQL Performance Schema
- MySQL Replication (GTID-based)

## Sources Consulted
- MySQL 8.0 Reference Manual: Clone Plugin - https://dev.mysql.com/doc/refman/8.0/en/clone-plugin.html
- MySQL 8.0 Reference Manual: Clone Plugin Options and Variables - https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-options-variables.html
- MySQL 8.0 Reference Manual: Monitoring Cloning Operations - https://dev.mysql.com/doc/refman/8.0/en/clone-plugin-monitoring.html

## Issues Found
1. **`clone_max_data_bandwidth` value and unit comment were incorrect.** The blog post set the value to `104857600` with a comment stating "bytes/sec" and "100 MB/s". According to the official MySQL documentation, this variable's unit is MiB/sec (mebibytes per second), not bytes/sec. The value `104857600` would exceed the maximum allowed value of `1048576`. Fixed the value to `100` (for ~100 MiB/s) and corrected the unit comment from "bytes/sec" to "MiB/sec". The corresponding `my.cnf` entry was also updated.
2. **`clone_buffer_size` comment was misleading.** The comment said "Set network transfer buffer size" but according to the documentation, `clone_buffer_size` defines the intermediate buffer size for local clone operations, not network transfers. Fixed the comment to "Set local clone buffer size" and clarified the unit as MiB.

## Review Notes
- The `ROUND(BINLOG_POSITION)` in the `clone_status` query is unnecessary since `BINLOG_POSITION` is a BIGINT column, but it does not cause errors and was left as-is.
- The post uses `CHANGE REPLICATION SOURCE TO` syntax which is correct for MySQL 8.0.23+. Older 8.0 versions would need `CHANGE MASTER TO`.
- All other SQL syntax, privilege requirements, Performance Schema column names, and configuration variables were verified as correct.
