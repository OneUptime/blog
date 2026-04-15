# Validation Summary: How to Use MaterializedMySQL Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedMySQL database engine)
- MySQL (binlog replication, GTID)
- CDC (Change Data Capture)
- ReplacingMergeTree (ClickHouse table engine)

## Sources Consulted
- ClickHouse official documentation for MaterializedMySQL (historical, pre-removal): https://clickhouse.com/docs/en/engines/database-engines/materialized-mysql
- ClickHouse GitHub PR #73879 — removal of MaterializedMySQL (merged December 2024): https://github.com/ClickHouse/ClickHouse/pull/73879
- ClickHouse GitHub PR #84516 — final cleanup of MaterializedMySQL remnants (merged July 2025): https://github.com/ClickHouse/ClickHouse/pull/84516
- MySQL documentation on GTID-based replication and binlog configuration

## Issues Found

1. **MaterializedMySQL has been removed from ClickHouse (Critical):** The engine was removed in ClickHouse version 24.12 (December 2024, PR #73879) and all remaining code was cleaned up in PR #84516 (July 2025). The post presented the feature as currently available with no mention of its removal. **Fix:** Added a prominent deprecation notice at the top of the post clarifying the engine was removed in v24.12, that it was always experimental, and suggesting alternatives (MaterializedPostgreSQL or external CDC tools like Debezium).

2. **Missing GTID prerequisites:** The official ClickHouse documentation required `gtid_mode = ON` and `enforce_gtid_consistency = ON` in the MySQL configuration. The post's `my.cnf` example omitted these required settings. **Fix:** Added `gtid_mode = ON` and `enforce_gtid_consistency = ON` to the MySQL configuration snippet.

3. **Missing authentication plugin requirement:** The official docs required `default_authentication_plugin = mysql_native_password` in the MySQL config. The post omitted this. **Fix:** Added `default_authentication_plugin = mysql_native_password` to the MySQL configuration snippet.

4. **Missing experimental setting:** MaterializedMySQL was always an experimental feature and required `SET allow_experimental_database_materialized_mysql = 1` before use. The post did not mention this prerequisite. **Fix:** Added the SET command before the CREATE DATABASE example.

## Review Notes
- The core technical content (CREATE DATABASE syntax, ReplacingMergeTree mapping, `_sign`/`_version` virtual columns, settings names and behavior, DDL support categories) was all accurate per the historical documentation.
- The `expire_logs_days` MySQL setting is deprecated in MySQL 8.0+ in favor of `binlog_expire_logs_seconds`, but still functions. Not changed since the post doesn't specify a MySQL version.
- The MySQL GRANT privileges listed (REPLICATION SLAVE, REPLICATION CLIENT, SELECT) are reasonable but the official ClickHouse docs did not explicitly enumerate required MySQL privileges. The RELOAD privilege may also have been needed for the initial dump phase.
- The `system.databases` query for checking sync status is a reasonable approach but was not documented in the official MaterializedMySQL documentation.
- Users on ClickHouse versions prior to 24.12 can still use this guide, but for modern ClickHouse deployments, alternative CDC solutions should be pursued.
