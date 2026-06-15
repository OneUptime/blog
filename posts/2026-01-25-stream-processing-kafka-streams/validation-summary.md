# Validation Summary: How to Build Stream Processing Apps with Kafka Streams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Java
- Stream processing
- Stateful aggregations and windowing
- Stream-table and stream-stream joins
- Interactive queries
- Kafka Streams exception handling

## Sources Consulted
- Apache Kafka Streams Architecture: https://kafka.apache.org/43/streams/architecture/
- Apache Kafka Streams DSL API: https://kafka.apache.org/43/streams/developer-guide/dsl-api.html
- Apache Kafka Streams configuration reference: https://kafka.apache.org/43/streams/developer-guide/config-streams/
- Kafka Streams `KStream` Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Kafka Streams `BranchedKStream` Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/BranchedKStream.html
- Kafka Streams `StreamsConfig` Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Kafka Streams `ProductionExceptionHandler` Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/ProductionExceptionHandler.html
- Kafka Streams `ProcessingExceptionHandler` Javadocs: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/ProcessingExceptionHandler.html
- Kafka Streams Interactive Queries: https://kafka.apache.org/43/streams/developer-guide/interactive-queries/

## Issues Found
- The architecture diagram incorrectly showed the same input partitions feeding multiple stream tasks. Updated it so partitions P0-P3 are assigned to tasks T1-T4 one-to-one for the simple single-topic topology shown.
- The text said "Each partition becomes a task," which is too broad for Kafka Streams topologies with multiple input topics. Reworded it to clarify that this applies to a simple topology reading one input topic.
- The stateless transformation example used the deprecated `KStream.branch()` API. Replaced it with the current `split().branch(...).defaultBranch(...)` API and `Branched.withConsumer(...)`.
- The stateful aggregation example used `KeyValueStore<Bytes, byte[]>` without importing `Bytes` or `KeyValueStore`. Added the required imports.
- The windowed aggregation example declared `KStream<String, Long>` from `builder.stream("page-views")` without specifying a `Long` value serde. Updated it to use `Consumed.with(Serdes.String(), Serdes.Long())`.
- The interactive query example opened a full-scan iterator without closing it. Added `all.close()` after the scan is created.
- The error handling section used deprecated Kafka Streams configuration constants for deserialization and production exception handlers. Updated them to `DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG` and `PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG`.
- The custom production exception handler used a deprecated `handle(...)` signature. Replaced the example with a current `ProcessingExceptionHandler.handleError(...)` example using `ProcessingExceptionHandler.Response.resume(...)`.

## Review Notes
The examples still use simplified helper methods such as `parseAmount`, `mergeJson`, and `addField`; those are acceptable placeholders for a tutorial, but a production implementation should use a JSON parser and explicit schemas/serdes rather than string matching.
