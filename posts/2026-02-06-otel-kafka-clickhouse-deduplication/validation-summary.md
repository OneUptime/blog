# Validation Summary: Use Real-Time Deduplication in OpenTelemetry Kafka-to-ClickHouse Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Kafka receiver
- OpenTelemetry ClickHouse exporter
- OpenTelemetry transform processor and OTTL
- Apache Kafka
- kafka-python
- ClickHouse
- Python
- Bloom filters

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CREATE MATERIALIZED VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse argMax aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- OpenTelemetry Collector Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md
- OpenTelemetry Collector ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- OpenTelemetry Collector ClickHouse exporter trace table template: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/clickhouseexporter/internal/sqltemplates/traces_table.sql
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/2.2.13/apidoc/KafkaProducer.html
- Apache Kafka producer configuration documentation: https://kafka.apache.org/30/configuration/producer-configs/

## Issues Found
- The ClickHouse `ReplacingMergeTree` table used lowercase, simplified column names that would not match the current OpenTelemetry Collector ClickHouse exporter's trace schema when `create_schema: false` is used. I updated the table to use the exporter's current trace column names and core types, added a default `IngestedAt` version column, and changed the deduplication key to `ORDER BY (TraceId, SpanId)`.
- The text said `ReplacingMergeTree` retained the highest `insert_time`, but the corrected table uses `IngestedAt`. I updated the explanation.
- The query examples filtered on lowercase `timestamp`, which no longer matched the corrected schema. I changed them to `Timestamp`.
- The Kafka Bloom filter example did not explain that JSON parsing is only valid for OTLP JSON payloads and that forwarding individual spans is not the same as forwarding full OTLP resource/scope payloads. I added that caveat and noted that `otlp_proto` pipelines must decode and re-encode OTLP Protobuf.
- The Collector-level deduplication section claimed stock Collector processors could deduplicate spans. The transform processor can add attributes, but it does not provide stateful deduplication. I changed the section to "Collector-Level Dedup Keys" and clarified that a custom processor, exporter, or downstream store must enforce uniqueness.
- The OTTL example used non-current ID accessors. I updated it to use `trace_id.string` and `span_id.string`, matching current transform processor examples.
- The materialized view section implied that a ClickHouse materialized view can deduplicate globally before inserting into the final table. ClickHouse materialized view aggregation runs per inserted block, so it will not deduplicate duplicates that arrive in separate insert batches unless the target engine also merges or the query uses `FINAL`. I renamed the section to "Materialized View Block Dedup" and added that limitation.
- The materialized view example used lowercase column names that no longer matched the corrected target schema. I updated the example to use `Timestamp`, `TraceId`, `SpanId`, `ServiceName`, `SpanName`, and `Duration`.
- The "Real-time accuracy" recommendation overstated a Bloom filter's guarantees because Bloom filters can have false positives and the example keeps state in memory. I changed it to "Real-time filtering" and added the relevant caveat.

## Review Notes
- I could not run a live ClickHouse server or OpenTelemetry Collector in this workspace, so validation was documentation-based rather than an end-to-end pipeline execution.
- The Bloom filter example is still intentionally simplified. A production implementation should use durable or replicated dedup state, flush producer sends before committing offsets, and preserve full OTLP resource/scope structure if another OpenTelemetry Collector consumes the output topic.
