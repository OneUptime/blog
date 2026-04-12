# Validation Summary: How to Configure Binary Log Format (ROW, STATEMENT, MIXED) in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL binary logging (`binlog_format`)
- MySQL replication (STATEMENT, ROW, MIXED formats)
- `binlog_row_image` and `binlog_row_metadata` configuration
- `mysqlbinlog` utility

## Sources Consulted
- MySQL 8.0 Reference Manual — Binary Logging Options: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual — Mixed Binary Logging Format: https://dev.mysql.com/doc/refman/8.0/en/binary-log-mixed.html
- MySQL 8.0 Reference Manual — Determination of Safe and Unsafe Statements: https://dev.mysql.com/doc/refman/8.0/en/replication-rbr-safe-unsafe.html
- MySQL 8.0 Reference Manual — Setting The Binary Log Format: https://dev.mysql.com/doc/refman/8.0/en/binary-log-setting.html
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.4 Reference Manual — Binary Logging Options: https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html

## Issues Found

1. **`NOW()` incorrectly listed as unsafe for MIXED mode (line 19):** The post listed `NOW()` as a function that causes MIXED mode to switch from STATEMENT to ROW format. `NOW()` is actually safe for statement-based replication because MySQL logs the timestamp via `SET TIMESTAMP` in the binary log, ensuring replicas get the same value. Replaced `NOW()` with `SYSDATE()`, which is genuinely unsafe because it returns wall-clock time unaffected by `SET TIMESTAMP`. Fixed in the MIXED format description.

2. **SQL command in bash code block (lines 97-102):** `SHOW BINARY LOGS;` was inside a ` ```bash ` code block. Changed to ` ```sql ` with SQL-style comments (`--`) instead of shell comments (`#`).

3. **Misleading `FLUSH TABLES WITH READ LOCK` procedure (lines 110-117):** The "Changing Format on a Live System" section used `FLUSH TABLES WITH READ LOCK` with a comment claiming it would "Flush all existing connections." This is incorrect — `FTWRL` flushes open table handles and acquires a global read lock; it does not disconnect or affect existing client sessions. Additionally, `SET GLOBAL binlog_format` only affects newly created sessions, not existing ones, so the FTWRL was unnecessary. Simplified to just `SET GLOBAL binlog_format = 'ROW'` with a note that existing sessions keep their current format.

4. **Missing deprecation notice:** `binlog_format` is deprecated as of MySQL 8.0.34 (July 2023) and may be removed in a future version. Added a brief note in the introduction since the post was published in 2026 when this deprecation is well-established.

## Review Notes
- The `binlog_row_image` values (FULL, MINIMAL, NOBLOB) and `binlog_row_metadata` values (MINIMAL, FULL) are correct.
- The replica procedure (`STOP REPLICA` / `START REPLICA`) uses correct MySQL 8.0.22+ syntax.
- The warning message example for unsafe STATEMENT-mode logging is realistic and representative of actual MySQL output.
- The `STATEMENT Format Risks` code examples use `UUID()` which is correctly identified as unsafe; `NOW()` in those examples does not make the statement unsafe but `UUID()` does, so the examples are still valid demonstrations.
