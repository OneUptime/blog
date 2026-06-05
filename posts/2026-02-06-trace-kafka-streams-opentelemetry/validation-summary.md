# Validation Summary: How to Trace Apache Kafka Streams Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java API and metrics API
- OpenTelemetry Collector
- Apache Kafka Streams
- Apache Kafka client tracing
- Java
- OTLP/gRPC
- RocksDB-backed Kafka Streams state stores

## Sources Consulted
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry / filter processor examples: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- Apache Kafka Streams DSL documentation: https://kafka.apache.org/38/streams/developer-guide/dsl-api/
- Apache Kafka Streams monitoring documentation: https://kafka.apache.org/43/operations/monitoring/
- Apache Kafka Streams configuration documentation: https://kafka.apache.org/42/configuration/kafka-streams-configs
- Apache Kafka Streams Javadocs for branching APIs: https://kafka.apache.org/42/javadoc/org/apache/kafka/streams/kstream/BranchedKStream.html

## Issues Found
- The OpenTelemetry Java sampler name used `parentbased_traceid_ratio`, which is not a valid current Java SDK sampler value. Updated it to `parentbased_traceidratio` in both command examples and explanatory text.
- The Java agent command sent OTLP traffic to port 4317 but did not explicitly set the OTLP protocol. Current OpenTelemetry Java agent 2.x defaults can use `http/protobuf`, so I added `-Dotel.exporter.otlp.protocol=grpc` to match the Collector's 4317 gRPC receiver.
- The Kafka Streams example used detailed state store latency metrics without enabling the required debug metric recording level. Added `StreamsConfig.METRICS_RECORDING_LEVEL_CONFIG` set to `debug`.
- The state store metric example described `num-entries-active-mem-table` as the number of entries in the state store. Kafka documents that metric as entries in the active memtable only, so I changed the example to use `estimate-num-keys` and updated the metric name and description.
- The state store latency gauge used milliseconds, but Kafka documents `put-latency-avg` for state stores in nanoseconds. Updated the unit to `ns`.
- The state store name extraction assumed the tag key `rocksdb-state-id`, which misses window and session stores such as `rocksdb-window-state-id`. Updated the code to find any tag ending in `-state-id`.
- The Collector filter checked `messaging.kafka.consumer.group == "__consumer_offsets"`, but `__consumer_offsets` is an internal Kafka topic, not a consumer group. Updated the filter to match internal topic names through current and legacy destination attributes and added `error_mode: ignore`.
- Removed unused imports from the Java snippets and added a note that domain-specific helper methods are expected to be implemented elsewhere.

## Review Notes
The guide remains technically valid as an instrumentation pattern. The manual spans shown in Kafka Streams lambdas are useful for business-level visibility, but in production they should be used with careful sampling and low-cardinality attributes to avoid excessive telemetry volume.
