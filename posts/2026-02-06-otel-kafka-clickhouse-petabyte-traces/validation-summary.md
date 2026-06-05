# Validation Summary: How to Build an OpenTelemetry + Kafka + ClickHouse Pipeline for Petabyte-Scale

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Apache Kafka
- ClickHouse MergeTree
- ClickHouse Kafka table engine
- Protocol Buffers
- Distributed tracing

## Sources Consulted
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Protocol protobuf definitions: https://github.com/open-telemetry/opentelemetry-proto
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse Protobuf format documentation: https://clickhouse.com/docs/interfaces/formats/Protobuf
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse LowCardinality data type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse TTL documentation: https://clickhouse.com/blog/using-ttl-to-manage-data-lifecycles-in-clickhouse

## Issues Found
- The OpenTelemetry Collector Kafka exporter snippet used top-level `topic` and `encoding` fields. Current Kafka exporter documentation uses signal-specific settings such as `traces.topic` and `traces.encoding`, so the configuration was updated accordingly.
- The ClickHouse Kafka engine example used `kafka_format = 'Protobuf'` without `kafka_schema`. ClickHouse requires an external schema for Protobuf input, so the example now includes `kafka_schema = 'trace_row.proto:TraceRow'`.
- The post implied that ClickHouse could directly consume the Collector's raw `otlp_proto` Kafka messages into the flat trace table with `SELECT *`. Raw OTLP protobuf messages are nested OTLP export payloads, not flat trace rows, so the text now clarifies that raw OTLP requires a decoding/flattening consumer, while the Kafka engine example applies to a flattened schema-compatible topic.

## Review Notes
- The ClickHouse schema is a reasonable simplified trace schema, but production deployments should tune sort keys, materialized columns, map serialization, skip indexes, replication, and sharding based on actual query patterns and cardinality.
- The Kafka partition count and retention recommendations are plausible starting points, not universal requirements.
