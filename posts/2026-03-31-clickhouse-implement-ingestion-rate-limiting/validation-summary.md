# Validation Summary: How to Implement Ingestion Rate Limiting for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, users.xml configuration, async inserts)
- ClickHouse Kafka table engine
- Bash scripting / clickhouse-client
- ClickHouse system tables (system.processes, system.parts)

## Sources Consulted
- [ClickHouse system.processes table documentation](https://clickhouse.com/docs/en/operations/system-tables/processes)
- [ClickHouse Kafka table engine documentation](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- [ClickHouse Asynchronous Inserts documentation](https://clickhouse.com/docs/optimize/asynchronous-inserts)
- ClickHouse settings reference (async_insert_busy_timeout_ms, max_concurrent_queries_for_user, max_insert_threads, max_insert_block_size)

## Issues Found
1. **`is_currently_executing` column does not exist in `system.processes`** — The monitoring query referenced a non-existent column. By definition, all queries in `system.processes` are currently executing, so the column would be redundant anyway. Removed `is_currently_executing` from both the SELECT and GROUP BY clauses, leaving the valid `query_kind` grouping.

## Review Notes
- `async_insert_busy_timeout_ms` is still valid as of ClickHouse 24.2+, where it functions as an alias for `async_insert_busy_timeout_max_ms` under the adaptive timeout system (`async_insert_use_adaptive_busy_timeout`). Users on very recent versions may prefer to explicitly configure `async_insert_busy_timeout_min_ms` / `async_insert_busy_timeout_max_ms` for finer control.
- `max_rows_to_read` in the `CREATE USER` example is a read-side limit; it applies to any SELECT-style reads the ingestion user performs (including `INSERT ... SELECT`), which is reasonable context but worth noting is not an insert-throughput limit.
- The bash throttle's `sleep "0.${SLEEP}"` construction assumes `SLEEP < 1000`; for very small batch latencies or very high throughput targets this could overflow the decimal portion, but the example is illustrative and reasonable.
- All Kafka engine settings used (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`, `kafka_max_block_size`, `kafka_poll_timeout_ms`, `kafka_num_consumers`) are valid per the official Kafka engine documentation.
- `query_kind`, `system.parts` columns (`rows`, `active`, `database`, `table`) are all valid.
