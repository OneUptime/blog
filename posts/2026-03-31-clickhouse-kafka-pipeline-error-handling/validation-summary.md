# Validation Summary: How to Build a Kafka to ClickHouse Pipeline with Error Handling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree, Materialized Views)
- Apache Kafka (topics, consumer groups, retention)
- SQL (ClickHouse dialect)
- `kafka-configs.sh` CLI tool

## Sources Consulted
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `system.kafka_consumers` documentation: https://clickhouse.com/docs/en/operations/system-tables/kafka_consumers
- ClickHouse MaterializedView engine documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- Apache Kafka `kafka-configs.sh` CLI reference: https://kafka.apache.org/documentation/#basic_ops_modify_topic

## Issues Found
1. **Incorrect column names in `system.kafka_consumers` query** (Monitoring Pipeline Health section).
   - The post queried columns `topic`, `partition`, `offset_committed`, `offset_fetched`, `consumer_group`, none of which exist in `system.kafka_consumers`.
   - The actual schema uses nested columns (`assignments.topic`, `assignments.partition_id`, `assignments.current_offset`) and does not expose separate committed/fetched offsets or a `consumer_group` field.
   - **Fix:** Replaced the query with correct columns: `database`, `table`, `consumer_id`, `assignments.topic`, `assignments.partition_id`, `assignments.current_offset`, `num_messages_read`, `last_poll_time`.

## Review Notes
- `kafka_handle_error_mode = 'stream'` and the `_error` / `_raw_message` virtual columns are correctly described. Note that ClickHouse also supports `kafka_handle_error_mode = 'dead_letter_queue'` as an alternative, which could be worth mentioning in a future update since the post's title emphasizes DLQs.
- The `kafka_events_dlq` table at the end is defined as a standalone MergeTree table but is never wired up to an actual Kafka consumer or producer. The post leaves the DLQ ingestion mechanism as an exercise to the reader — this is not technically wrong but could be clearer.
- The architecture diagram at the top depicts validation happening *before* the Kafka engine table, but in the implementation validation happens *inside* materialized views reading from the Kafka engine table. The diagram is a simplification; not incorrect, but the flow description could be tightened in a future revision.
- All other SQL (Kafka engine DDL, MergeTree DDL, MVs) and the `kafka-configs.sh` command are correct.
