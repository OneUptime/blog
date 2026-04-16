# Validation Summary: How to Monitor Kafka-to-ClickHouse Pipeline Health

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (system tables: `system.kafka_consumers`, `system.query_log`, `system.metrics`)
- Apache Kafka (consumer state, partition assignments)
- ClickHouse Kafka table engine
- `clickhouse-client` CLI
- SQL (ClickHouse dialect: `quantile`, `multiIf`, `dateDiff`, `toStartOfMinute`, `LowCardinality`, `MergeTree`, `TTL`)

## Sources Consulted
- ClickHouse `system.kafka_consumers` documentation: https://clickhouse.com/docs/en/operations/system-tables/kafka_consumers
- ClickHouse `system.metrics` documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka

## Issues Found
The Consumer State Monitoring SQL query referenced several columns that do not exist on `system.kafka_consumers`. Fixed:

1. `assignment AS partitions` — column does not exist. Replaced with the actual nested columns `assignments.topic`, `assignments.partition_id`, and `assignments.current_offset`.
2. `messages_processed` — column does not exist. Replaced with the correct name `num_messages_read`.
3. `rows_written`, `bytes_written` — these columns do not exist on `system.kafka_consumers` (they belong to query/insert profiling, not consumer state). Removed.
4. `last_commit_timestamp` — column does not exist. Replaced with the correct name `last_commit_time` (also updated the derived `seconds_since_commit` expression).
5. `exceptions_while_parsing` — column does not exist. Replaced with the actual nested column `exceptions.text` (Array(String) of the last 10 exception messages) and added `length(exceptions.text) AS recent_exception_count` so the alert threshold still has a numeric value to compare against. Updated the bulleted alert guidance and the "Alerting Thresholds" block accordingly.

The Kafka metric names `KafkaConsumersWithAssignment` and `KafkaWrites` were verified as real entries in `system.metrics` and left unchanged. All `system.query_log` references (`type = 'QueryFinish'`, `query_kind = 'Insert'`, `tables[1]`, `written_rows`, `event_time`) were verified as correct.

## Review Notes
- The "End-to-End Latency", "Error Rate Dashboard", "Pipeline Health Check Table", and the `clickhouse-client` populate script all reference user tables (`events`, `dead_letters`, `pipeline_health_log`) — these are illustrative and not part of any system schema, so no verification was needed beyond syntax.
- `system.kafka_consumers` only retains the last 10 exception entries per consumer, so `recent_exception_count` will saturate at 10. For long-term parsing-error tracking, the post's separate `dead_letters`/error-rate dashboard is the right complement.
- The `tables[1] LIKE '%kafka%'` filter assumes the Kafka engine table (or its materialized-view target) has "kafka" in its name; readers should adapt this to their naming convention.
