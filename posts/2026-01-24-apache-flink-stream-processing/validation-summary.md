# Validation Summary: How to Handle Apache Flink Stream Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink DataStream API
- Apache Flink windowing and watermarks
- Apache Flink keyed state and state TTL
- Apache Flink checkpointing and state backends
- Apache Flink Kafka source and sink connectors
- Apache Flink Async I/O
- Apache Flink metrics
- Java
- Apache Kafka

## Sources Consulted
- Apache Flink DataStream Kafka Connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/
- Apache Flink Windows documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/
- Apache Flink Generating Watermarks documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/event-time/generating_watermarks/
- Apache Flink Working with State documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/
- Apache Flink State Backends documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/state_backends/
- Apache Flink Checkpoints documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/
- Apache Flink Async I/O documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/asyncio/
- Apache Flink Metrics documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/metrics/
- Apache Flink Java API documentation for CheckpointingMode: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/core/execution/CheckpointingMode.html
- Apache Flink Java API documentation for CheckpointConfig: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/environment/CheckpointConfig.html

## Issues Found
- The windowing examples used `Time.minutes(...)`, while current Flink window assigners use `java.time.Duration`. Updated tumbling, sliding, and session window examples to use `Duration`.
- The global window example reused a `WindowFunction` typed for `TimeWindow`, which does not compile for `GlobalWindow`. Added a separate `CountGlobalEventsFunction` typed for `GlobalWindow`.
- The watermark example used `DataStream<EventCount>` for a result that needs `SingleOutputStreamOperator<EventCount>` to access side output late data. Updated the type, added an `OutputTag`, and changed allowed lateness to `Duration`.
- The state TTL example configured TTL on an unused descriptor and did not attach TTL to the main keyed state descriptors. Moved TTL setup before state registration and enabled TTL on the value, map, and list state descriptors.
- The state backend example used the older direct `setStateBackend(new EmbeddedRocksDBStateBackend())` style. Updated it to configure RocksDB through `StateBackendOptions.STATE_BACKEND` and `env.configure(config)`, matching current documentation.
- The Kafka exactly-once example used the deprecated `org.apache.flink.streaming.api.CheckpointingMode` import and an incorrect externalized checkpoint cleanup method/name. Updated it to `org.apache.flink.core.execution.CheckpointingMode`, `setExternalizedCheckpointRetention`, and `ExternalizedCheckpointRetention.RETAIN_ON_CANCELLATION`.
- Added missing imports to the snippets for APIs used directly in the examples.
- Added a null guard before writing to `event.properties` during enrichment, because JSON input can set the map to null.

## Review Notes
The snippets are still tutorial-style examples and rely on placeholders such as `getEventStream`, `kafkaSource`, custom serializers, custom sinks, and domain classes. Those placeholders are acceptable for the post's scope, but a future runnable sample should include a full Maven/Gradle dependency set and complete class definitions. For Kafka exactly-once production usage, the Flink Kafka documentation also recommends using a unique transactional ID prefix and tuning Kafka `transaction.timeout.ms` relative to checkpoint and restart duration.
