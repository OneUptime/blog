# Validation Summary: How to Write Flink Streaming Jobs

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Flink DataStream API
- Apache Flink Kafka connector
- Apache Flink FileSink
- Apache Flink state, checkpointing, watermarks, and windows
- Apache Flink Kubernetes Operator
- Java
- Maven and Gradle
- Kafka

## Sources Consulted
- Apache Flink 1.18 Kafka connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kafka/
- Apache Flink 1.18 FileSystem connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/filesystem/
- Apache Flink checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Flink CheckpointConfig API documentation: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/environment/CheckpointConfig.html
- Apache Flink 1.18 metrics documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/metrics/
- Apache Flink Kubernetes Operator job management documentation: https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/docs/custom-resource/job-management/
- Apache Flink downloads and connector compatibility page: https://flink.apache.org/downloads/

## Issues Found
- The Kafka source example used `OffsetsInitializer.OffsetsInitializerReset.EARLIEST`, which is not the documented Java API. Changed it to import and use Kafka's `OffsetResetStrategy.EARLIEST`.
- The FileSink example used the deprecated long overload of `DefaultRollingPolicy.withMaxPartSize`. Changed it to `MemorySize.ofMebiBytes(1024)`, matching the official Flink example.
- The keyed state example incremented `counters.get(event.getType())` without handling the first record for a key/type, which could throw a `NullPointerException`. Added a null-safe first-count update.
- The checkpointing example used the deprecated `setCheckpointingMode` API. Changed it to `setCheckpointingConsistencyMode` with the documented `org.apache.flink.core.execution.CheckpointingMode` import.
- The metrics example used `DescriptiveStatisticsHistogram` without showing a supported dependency/import path. Replaced it with the official Dropwizard histogram wrapper pattern and added the `flink-metrics-dropwizard` dependency to Maven and Gradle snippets.

## Review Notes
The article is version-specific to Flink 1.18. The examples are broadly accurate for that generation of Flink APIs, but Flink 1.18 is no longer the latest Apache Flink release as of this review date. Future updates should consider refreshing the post to a currently supported Flink line and the matching connector versions.
