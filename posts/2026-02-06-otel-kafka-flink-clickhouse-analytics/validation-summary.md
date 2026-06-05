# Validation Summary: How to Build a Real-Time Analytics Pipeline: OpenTelemetry to Kafka to Apache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol JSON encoding
- Apache Kafka
- Apache Flink DataStream API
- Apache Flink Kafka connector
- Apache Flink JDBC connector
- ClickHouse
- Java
- SQL

## Sources Consulted
- OpenTelemetry Collector Kafka exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol file exporter examples: https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- Apache Flink windowing documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Flink JDBC connector documentation: https://nightlies.apache.org/flink/flink-docs-master/docs/connectors/datastream/jdbc/
- ClickHouse Java integration documentation: https://clickhouse.com/integrations/java
- ClickHouse TTL documentation: https://clickhouse.com/blog/using-ttl-to-manage-data-lifecycles-in-clickhouse

## Issues Found
- The Flink Java example referenced support classes and imports that were not shown, so the snippet was not a complete Java job as described. Added the required imports and simple `SpanRecord`, accumulator, percentile, stats, aggregate, and window process classes.
- The OTLP JSON parsing for `service.name` was incorrect. OTLP resource attributes are represented as key/value objects in an `attributes` array, not as a direct JSON field named `service.name`. Added a helper that scans resource attributes and reads the `stringValue`.
- The Flink window example used `Time.minutes(1)`. Current Flink documentation shows `java.time.Duration` for tumbling window assigners, so the code now uses `TumblingEventTimeWindows.of(Duration.ofMinutes(1))`.
- The original aggregate call could not attach `window_end` reliably from a plain `AggregateFunction`. Added a `ProcessWindowFunction` combined with the aggregate so the output uses `context.window().getEnd()`.
- Updated the ClickHouse JDBC URL to the current official `jdbc:ch:http://...` URL style shown in ClickHouse Java integration documentation.

## Review Notes
- The exact percentile implementation stores all durations in each one-minute service window. This is correct for the tutorial, but high-volume production jobs should usually use an approximate quantile sketch or another bounded-state approach.
