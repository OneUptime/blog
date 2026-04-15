# Validation Summary: How to Configure ClickHouse max_threads and max_block_size

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query engine settings, system tables, XML configuration)
- SQL (ClickHouse SQL dialect)

## Sources Consulted
- ClickHouse documentation — Settings reference (max_threads, max_block_size): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse documentation — system.query_log table: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse documentation — Users and roles settings: https://clickhouse.com/docs/en/operations/settings/settings-users
- ClickHouse GitHub issue #37752 (max_threads default behavior): https://github.com/ClickHouse/ClickHouse/issues/37752

## Issues Found
1. **Incorrect column name in system.query_log query**: The blog used `peak_memory_usage` as a column name in the monitoring query against `system.query_log`. The actual column name in `system.query_log` is `memory_usage`. There is no `peak_memory_usage` column in that table. Fixed by changing `peak_memory_usage` to `memory_usage`.

## Review Notes
- The default value of `max_threads` (number of CPU cores, auto-detected) and `max_block_size` (65536) are both confirmed correct.
- All SQL syntax is valid ClickHouse SQL, including the `SETTINGS` clause, `SET` command, `count()`, `today()`, and `toStartOfHour()` functions.
- The XML configuration examples for users.xml and config.xml follow the correct ClickHouse format.
- The `system.settings` query for checking current values is correct.
- The `type = 'QueryFinish'` filter in the query_log query is valid (enum value 2).
- The claim about larger `max_block_size` reducing "hash table rebuild frequency" for aggregations is a simplification — the hash table accumulates across blocks rather than being rebuilt — but the practical advice (larger blocks can help aggregation performance) is sound.
