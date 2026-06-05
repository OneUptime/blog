# Validation Summary: How to Build a Telemetry Data Lake with OpenTelemetry, Kafka,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol JSON encoding
- Apache Kafka
- Apache Spark Structured Streaming
- PySpark
- Apache Iceberg
- Apache Parquet
- Trino
- DuckDB
- S3-compatible object storage

## Sources Consulted
- OpenTelemetry Collector Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Proto trace JSON example: https://github.com/open-telemetry/opentelemetry-proto/blob/main/examples/trace.json
- Apache Spark Structured Streaming Kafka integration guide: https://spark.apache.org/docs/4.1.0/structured-streaming-kafka-integration.html
- Apache Spark SQL built-in functions documentation: https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html
- Apache Iceberg Spark Structured Streaming documentation: https://iceberg.apache.org/docs/1.9.0/spark-structured-streaming/
- Apache Iceberg Spark procedures documentation: https://iceberg.apache.org/docs/1.8.0/docs/spark-procedures/
- Apache Iceberg configuration and table properties documentation: https://iceberg.apache.org/docs/latest/configuration/
- Trino Iceberg connector documentation: https://trino.io/docs/current/connector/iceberg.html
- DuckDB Iceberg extension documentation: https://duckdb.org/docs/current/core_extensions/iceberg/overview.html

## Issues Found
- The Kafka exporter example used the deprecated/removed top-level `topic` and `encoding` fields. Current Kafka exporter configuration uses signal-specific settings such as `traces.topic` and `traces.encoding`. Updated the Collector YAML accordingly.
- The Spark streaming example referenced `otlp_schema` without defining it, so the code would fail before parsing Kafka messages. Added a minimal OTLP trace JSON schema matching the current lowerCamelCase OTLP/JSON field names.
- The Spark streaming example only selected a subset of the columns defined in the Iceberg table. Added `span_kind`, `status_message`, `attributes`, `resource_attributes`, and `events` transformations so the streaming output matches the table schema.
- The timestamp conversion divided nanoseconds by `1e9` and cast the result to `timestamp`. Replaced it with Spark's `timestamp_micros` function after converting OTLP nanoseconds to microseconds, which is the documented Spark function for epoch-microsecond timestamp creation.
- The Iceberg streaming write used `.option("path", "lakehouse.telemetry.traces").start()`. Current Iceberg Structured Streaming documentation recommends `.toTable("database.table_name")` for Spark versions newer than 3.0. Updated the example to write with `.toTable("lakehouse.telemetry.traces")`.
- The `rewrite_data_files` sort order omitted explicit null ordering. Iceberg documents sort order strings in the form `ColumnName SortDirection NullOrder`, so the example now uses `timestamp ASC NULLS LAST, service_name ASC NULLS LAST`.

## Review Notes
The example remains intentionally minimal: it flattens common scalar OTLP attribute values into `MAP<STRING, STRING>` and does not preserve nested `arrayValue` or `kvlistValue` attribute payloads. That is acceptable for the table schema shown, but a production telemetry lake may want a richer attribute representation.
