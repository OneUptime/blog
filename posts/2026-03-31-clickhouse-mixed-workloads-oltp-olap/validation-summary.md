# Validation Summary: How to Handle Mixed Workloads (OLTP + OLAP) with ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (OLAP database)
- ReplacingMergeTree engine
- ClickHouse access control (CREATE USER, SETTINGS)
- system.query_log monitoring
- Distributed table architecture (shard/replica routing)

## Sources Consulted
- ClickHouse official documentation: CREATE USER syntax (https://clickhouse.com/docs/en/sql-reference/statements/create/user)
- ClickHouse official documentation: Settings — priority (https://clickhouse.com/docs/en/operations/settings/settings#priority)
- ClickHouse official documentation: ReplacingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree)
- ClickHouse official documentation: system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse blog: Essential Monitoring Queries (https://clickhouse.com/blog/monitoring-troubleshooting-select-queries-clickhouse)

## Issues Found
1. **Inverted `priority` semantics (line 45)**: The post stated "Higher `priority` values get more CPU scheduling priority." This is incorrect. In ClickHouse, **lower** numeric `priority` values mean higher CPU scheduling priority (i.e., priority `1` is higher than priority `10`). Fixed the text to: "Lower `priority` values get more CPU scheduling priority (priority `1` runs before priority `10`)."

## Review Notes
- The `CREATE USER ... SETTINGS` syntax with `sha256_password` identification is correct and follows current ClickHouse documentation.
- The `ReplacingMergeTree(_ver)` usage with `ORDER BY user_id` and the `FINAL` keyword for read-time deduplication is accurate.
- All `system.query_log` column names (`user`, `query_kind`, `memory_usage`, `query_duration_ms`, `event_date`) are verified correct against the official schema.
- The architectural advice about separating insert and query paths via shard/replica routing is sound.
- The summary recommendation to use a dedicated OLTP database with CDC for heavy transactional needs is appropriate guidance.
