# Validation Summary: How to Stream Data from Kafka to ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree, materialized views, system tables)
- Apache Kafka (topics, partitions, consumer groups, CLI tools)
- Confluent Schema Registry with Avro
- Python `kafka-python` producer library
- SQL / ClickHouse query language

## Sources Consulted
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse AvroConfluent format documentation: https://clickhouse.com/docs/interfaces/formats/AvroConfluent
- ClickHouse `system.kafka_consumers` documentation: https://clickhouse.com/docs/operations/system-tables/kafka_consumers
- ClickHouse virtual columns for Kafka engine (`_raw_message`, `_error`) in the Kafka engine docs

## Issues Found

1. **Incorrect Avro format name and schema registry setting** (Using Avro Format section).
   - Before: `kafka_format = 'Avro'` combined with `kafka_schema_registry_url = 'http://localhost:8081'`.
   - Problem: `Avro` format expects Apache Avro container-file data; Kafka messages serialized through Confluent Schema Registry use a different wire format (magic byte + schema ID + binary payload). The Kafka engine has no setting named `kafka_schema_registry_url`.
   - Fix: Changed the format to `AvroConfluent` and the setting to `format_avro_schema_registry_url`, which are the documented names for Schema Registry–integrated Avro consumption.

2. **Non-existent `assignments.committed_offset` column** (Monitoring Consumer Lag section).
   - Before: The query selected `assignments.committed_offset AS committed_offsets` from `system.kafka_consumers`.
   - Problem: `system.kafka_consumers` does not expose a `committed_offset` nested field. The real nested columns are `assignments.topic`, `assignments.partition_id`, `assignments.current_offset`, and `assignments.intent_size`.
   - Fix: Removed the invalid column and replaced it with useful health indicators that do exist: `num_messages_read`, `last_poll_time`, and `last_commit_time`. Also removed the `ARRAY JOIN assignments` and the indexed `assignments.topic[1]` access so the query works as written (the columns are already `Array(...)` types and are easier to read side-by-side per row).

3. **Dead Letter Queue pattern would not capture any rows** (Dead Letter Queue section).
   - Before: A materialized view selected `_raw_message` and filtered with `WHERE toUUIDOrNull(event_id) IS NULL` from a Kafka source table that did not enable error streaming.
   - Problem: Per the ClickHouse docs, `_raw_message` and `_error` virtual columns are populated only when the Kafka table is created with `kafka_handle_error_mode = 'stream'`. Successfully parsed rows carry empty `_raw_message`, so routing would store empty strings. Additionally, `toUUIDOrNull(event_id) IS NULL` filters rows whose JSON parsed fine but whose UUID string was invalid — these never trigger the `_raw_message` path.
   - Fix:
     - Added `kafka_handle_error_mode = 'stream'` to the recreated Kafka table in the "Scaling with Multiple Consumers" section so the DLQ virtual columns are populated.
     - Rewrote the DLQ materialized view to filter on `length(_error) > 0` and project `_error` directly into the `error` column, which is the canonical ClickHouse DLQ pattern for parse failures.
     - Added a short comment noting the `kafka_handle_error_mode = 'stream'` requirement.

## Review Notes

- The Kafka engine has been available since ClickHouse 20.1, so the stated version requirement is accurate.
- `kafka_skip_broken_messages`, `kafka_poll_timeout_ms`, `kafka_flush_interval_ms`, `kafka_num_consumers`, `kafka_max_block_size`, and `kafka_handle_error_mode` are all valid documented settings.
- The `ORDER BY (user_id, ts)` choice on the storage table is reasonable for point lookups by user; analysts querying by time range may prefer `ORDER BY (ts, user_id)` or adding a `projection`. Not a correctness issue.
- The `ALTER TABLE kafka_user_events ADD COLUMN` step in the schema-evolution section works on Kafka-engine tables but requires careful coordination with the producer and materialized view (the post already notes the MV must be recreated).
- `kafka_skip_broken_messages = 100` drops up to 100 malformed messages per block silently. With the revised DLQ pattern (which requires `kafka_handle_error_mode = 'stream'`), operators should consider whether they want skipping *and* DLQ routing or only DLQ routing; the two settings interact.
- The Python producer example relies on the `kafka-python` library; the user needs to `pip install kafka-python` for the script to run. Not a technical inaccuracy, just an implicit dependency.
