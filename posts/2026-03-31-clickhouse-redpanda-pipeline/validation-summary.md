# Validation Summary: How to Build a Redpanda to ClickHouse Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Kafka table engine, MergeTree engine, Materialized Views)
- Redpanda (Kafka-compatible streaming platform)
- rpk (Redpanda CLI)
- librdkafka (underlying Kafka client library used by ClickHouse)
- Avro / AvroConfluent format with Schema Registry

## Sources Consulted
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse AvroConfluent format documentation: https://clickhouse.com/docs/interfaces/formats/AvroConfluent
- ClickHouse format settings documentation: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- Redpanda rpk CLI documentation: https://docs.redpanda.com/current/reference/rpk/

## Issues Found

1. **Missing `kafka_handle_error_mode = 'stream'` setting**: The materialized view used `WHERE length(_error) = 0` to filter malformed messages, but the `_error` virtual column is only available when `kafka_handle_error_mode = 'stream'` is set on the Kafka engine table. Added this setting to the first CREATE TABLE example and added an explanatory sentence.

2. **Wrong Avro format name**: `kafka_format = 'Avro'` was used with a schema registry, but ClickHouse requires `'AvroConfluent'` for Avro messages using the Confluent wire format (with schema registry). Changed to `kafka_format = 'AvroConfluent'`.

3. **Wrong schema registry URL setting name**: `kafka_schema_registry_url` is not a valid ClickHouse setting. The correct setting is `format_avro_schema_registry_url`. Changed accordingly.

4. **Invalid `kafka_ssl_ca_location` in CREATE TABLE**: `kafka_ssl_ca_location` is not a valid CREATE TABLE SETTINGS parameter. SSL certificate paths are librdkafka properties that must be configured in the ClickHouse server XML config file (`/etc/clickhouse-server/config.d/kafka.xml`), not inline in the CREATE TABLE statement. Removed it from the SQL and added an XML config example showing the correct approach.

## Review Notes
- The `toStartOfSecond(now())` call in the latency benchmarking query is technically a no-op since `now()` returns `DateTime` (second precision), not `DateTime64`. It works but is redundant. Left as-is since it does not cause errors and would be meaningful if the column were `DateTime64`.
- The claim that "Redpanda's typical end-to-end latency to ClickHouse is under 1 second" with `kafka_flush_interval_ms = 1000` is optimistic — the flush interval alone is 1 second, and total latency includes Redpanda broker processing, network transfer, and ClickHouse ingestion. Actual latency will depend heavily on workload and configuration. Left as-is since it is a reasonable ballpark for low-volume workloads.
