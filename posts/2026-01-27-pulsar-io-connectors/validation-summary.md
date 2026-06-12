# Validation Summary: How to Use Pulsar IO Connectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar IO connectors
- Pulsar source and sink connector APIs
- Pulsar Admin CLI
- Debezium PostgreSQL source connector
- Elasticsearch sink connector
- Maven NAR packaging
- Java custom connector development
- Prometheus/OpenTelemetry-style connector monitoring

## Sources Consulted
- Apache Pulsar documentation: How to develop Pulsar connectors - https://pulsar.apache.org/docs/next/io-develop/
- Apache Pulsar documentation: Connector Admin CLI - https://pulsar.apache.org/docs/next/io-cli/
- Apache Pulsar documentation: Built-in connectors - https://pulsar.apache.org/docs/4.2.x/io-connectors/
- Apache Pulsar 3.0 documentation: Built-in connectors - https://pulsar.apache.org/docs/3.0.x/io-connectors/
- Apache Pulsar 3.0 documentation: Debezium source connector - https://pulsar.apache.org/docs/3.0.x/io-debezium-source/
- Apache Pulsar 3.0 documentation: Elasticsearch sink connector - https://pulsar.apache.org/docs/3.0.x/io-elasticsearch-sink/
- Apache Pulsar 3.0 documentation: JDBC sink connector - https://pulsar.apache.org/docs/3.0.x/io-jdbc-sink/
- Apache Pulsar documentation: Metrics reference - https://pulsar.apache.org/docs/next/reference-metrics/
- Apache Pulsar documentation: Messaging dead letter topics - https://pulsar.apache.org/docs/next/concepts-messaging/
- Apache Pulsar Sink REST API reference - https://pulsar.apache.org/sink-rest-api/
- Elasticsearch Java API Client documentation - https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/current/index.html

## Issues Found
- The post treated "JDBC Source" as a built-in Pulsar database source connector and used Kafka Connect JDBC-style source options. Pulsar's built-in database CDC source is documented as Debezium, so the source diagram, connector list, and source deployment YAML were changed to Debezium PostgreSQL settings.
- The source connector Java example returned `null` when no records were available and used an undefined `SourceRecord` type. Pulsar's `Source.read()` contract expects a `Record<T>` and connector examples use blocking reads, so the snippet now blocks, returns a simple `Record<byte[]>`, and closes JDBC resources.
- The Elasticsearch Java snippet used `RestHighLevelClient`, which is deprecated in the Elasticsearch Java ecosystem. It was updated to the current Elasticsearch Java API Client pattern.
- The built-in connector overview listed S3 as a built-in sink in places where current Pulsar docs list HDFS sinks, not S3. Those references were changed to HDFS.
- The custom connector project structure placed `resources/` at the project root, which Maven would not package by default. It was corrected to `src/main/resources/META-INF/services/pulsar-io.yaml`.
- The Maven example declared `java.version` without wiring it to the compiler. It was changed to `maven.compiler.release` so Maven uses Java 17.
- The CLI examples used `pulsar-admin sinks stats`, but the documented connector admin CLI has `status`, not `stats`. Those commands were changed to `pulsar-admin sinks status`.
- The monitoring table included non-documented connector metrics such as `pulsar_connector_exceptions_total` and `pulsar_sink_write_latency_ms`. These were replaced with documented source/sink metrics such as `pulsar_sink_last_invocation`, `pulsar_source_last_invocation`, `pulsar_sink_sink_exceptions_total`, and `pulsar_source_source_exceptions_total`.
- The dead letter queue YAML placed DLQ settings under connector-specific `configs` and used `maxRedeliveryCount`. It was changed to sink-level settings using `deadLetterTopic`, `maxMessageRetries`, and `negativeAckRedeliveryDelayMs`.
- The schema example showed `schemaDefinition` under connector `configs`, which is not a generic Pulsar connector configuration field. It was narrowed to the documented top-level `schemaType: AVRO` guidance.

## Review Notes
- Some connector examples remain conceptual and omit imports and full build files for brevity, which is acceptable for the post's current tutorial style.
- The Debezium example targets Pulsar 3.0.x connector naming and configuration. Future updates should revisit Debezium property names because upstream Debezium has renamed some whitelist properties to include-list terminology in newer versions.
