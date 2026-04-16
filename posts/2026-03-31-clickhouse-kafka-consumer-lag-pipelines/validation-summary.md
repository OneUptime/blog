# Validation Summary: How to Handle Kafka Consumer Lag in ClickHouse Pipelines

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse Kafka Engine (`system.kafka_consumers`, `system.query_log`, `ALTER TABLE ... MODIFY SETTING`, `DETACH`/`ATTACH`)
- Apache Kafka consumer groups, partition assignment, offset management
- `kafka-consumer-groups.sh` administrative CLI

## Sources Consulted
- ClickHouse `system.kafka_consumers` reference: https://clickhouse.com/docs/en/operations/system-tables/kafka_consumers
- ClickHouse Kafka Engine reference (settings: `kafka_max_block_size`, `kafka_poll_max_batch_size`, `kafka_flush_interval_ms`, `kafka_num_consumers`): https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `system.query_log` reference (`type`, `query_kind`, `event_time`): https://clickhouse.com/docs/en/operations/system-tables/query_log
- Apache Kafka `kafka-consumer-groups.sh` documentation (`--describe`, `--reset-offsets`, `--to-latest`, `--execute`)

## Issues Found
- **Incorrect schema for `system.kafka_consumers`**: The original SQL query selected non-existent columns `topic`, `partition`, `offset_fetched`, `offset_committed`, and `consumer_group`, and computed `lag` as `offset_fetched - offset_committed`. The actual table exposes nested arrays (`assignments.topic`, `assignments.partition_id`, `assignments.current_offset`) and does not contain a broker high-watermark column, so per-partition lag cannot be derived from this table alone. I rewrote the query to use the real columns (`database`, `table`, `consumer_id`, `assignments.topic`, `assignments.partition_id`, `assignments.current_offset`, `last_poll_time`, `num_messages_read`, `num_commits`) and updated the surrounding paragraph to clarify that true lag requires comparing these offsets against the high watermark reported by `kafka-consumer-groups.sh`.

## Review Notes
- The Kafka Engine settings (`kafka_max_block_size = 131072`, `kafka_poll_max_batch_size`, `kafka_flush_interval_ms`, `kafka_num_consumers`) are all valid and the comment "Process 128K messages at once" matches `131072 = 128 * 1024`.
- `kafka_num_consumers` per node should not exceed the topic's partition count and is also bounded by the number of physical cores on the server. The post's example of `kafka_num_consumers = 12` on a single node assumes the host has at least 12 cores; readers operating on smaller hardware should adjust accordingly.
- The `system.query_log` query correctly uses `type = 'QueryFinish'` and `query_kind = 'Insert'`, which are the canonical filter values.
- `kafka-consumer-groups.sh` flags (`--bootstrap-server`, `--describe`, `--group`, `--reset-offsets`, `--to-latest`, `--execute`) match the current Kafka tooling.
- The `rdkafka_stat` JSON column on `system.kafka_consumers` is an alternative source for in-process lag metrics, but parsing it is non-trivial and outside the scope of this post.
