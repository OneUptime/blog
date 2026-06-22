# Validation Summary: How to Fix 'StreamsException' in Kafka Streams

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Java
- Kafka Streams exception handlers
- Kafka Streams Processor API
- Dead letter queues
- Micrometer metrics

## Sources Consulted
- Apache Kafka 4.3.0 Javadocs: `DeserializationExceptionHandler` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/DeserializationExceptionHandler.html
- Apache Kafka 4.3.0 Javadocs: `ProductionExceptionHandler` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/ProductionExceptionHandler.html
- Apache Kafka 4.3.0 Javadocs: `ProcessingExceptionHandler` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/ProcessingExceptionHandler.html
- Apache Kafka 4.3.0 Javadocs: `StreamsConfig` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Apache Kafka 4.3.0 Javadocs: `FixedKeyProcessor` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/api/FixedKeyProcessor.html
- Apache Kafka 4.3.0 Javadocs: `FixedKeyProcessorContext` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/api/FixedKeyProcessorContext.html
- Apache Kafka 4.3.0 Javadocs: `FixedKeyRecord` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/api/FixedKeyRecord.html
- Apache Kafka 4.3.0 Javadocs: `RecordMetadata` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/api/RecordMetadata.html
- Apache Kafka 4.3.0 Javadocs: `StreamsUncaughtExceptionHandler.StreamThreadExceptionResponse` - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/errors/StreamsUncaughtExceptionHandler.StreamThreadExceptionResponse.html
- Confluent Kafka Streams DSL documentation - https://docs.confluent.io/platform/current/streams/developer-guide/dsl-api.html
- Confluent Kafka Streams Processor API documentation - https://docs.confluent.io/platform/current/streams/developer-guide/processor-api.html

## Issues Found
- Updated `DeserializationExceptionHandler` example from deprecated `handle(ProcessorContext, ...)` and `DeserializationHandlerResponse.CONTINUE` to current `handleError(ErrorHandlerContext, ...)` with `Response.resume()`.
- Replaced deprecated `StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG` with `StreamsConfig.DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG`.
- Replaced deprecated `KStream.branch(...)` array-style branching with current `split(...).branch(...).defaultBranch(...)` returning a branch map.
- Updated `ProductionExceptionHandler` example from deprecated `handle(ProducerRecord, ...)` and `ProductionExceptionHandlerResponse` to current `handleError(ErrorHandlerContext, ...)` with `Response.retry()` / `Response.resume()`.
- Replaced deprecated `StreamsConfig.DEFAULT_PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG` with `StreamsConfig.PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG`.
- Corrected the uncaught exception handler comment from "Deserialization errors" to "Serialization errors" because the example checks `SerializationException`.
- Corrected state-store wording to describe `InvalidStateStoreException` subclasses rather than a non-current `StateStoreNotAvailableException` example.
- Removed the obsolete `StateStoreMigratedException` catch from the state store snippet and handled `InvalidStateStoreException` directly.
- Replaced deprecated `ValueTransformer` examples with current `FixedKeyProcessor`, `FixedKeyProcessorContext`, `FixedKeyRecord`, and `processValues(...)` usage.
- Fixed the retry snippet so `callExternalService(...)` declares both checked exceptions caught by the example.

## Review Notes
The snippets remain illustrative and omit some surrounding imports, helper method implementations, and application wiring. The retry example uses `Thread.sleep(...)` inside stream processing, which is technically valid Java but can reduce throughput and should be used cautiously in production.
