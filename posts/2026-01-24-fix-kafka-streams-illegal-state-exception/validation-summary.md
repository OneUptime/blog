# Validation Summary: How to Fix 'IllegalStateException' in Kafka Streams

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Java
- Kafka Streams Processor API
- Kafka Streams interactive queries
- Kafka Streams state stores
- Spring-style REST controller examples

## Sources Consulted
- Apache Kafka 4.0 KafkaStreams Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/KafkaStreams.html
- Apache Kafka 4.0 Processor API Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/processor/api/Processor.html
- Apache Kafka 4.0 ProcessorContext Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/processor/api/ProcessorContext.html
- Apache Kafka 4.0 InvalidStateStoreException Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/errors/InvalidStateStoreException.html
- Apache Kafka 4.0 StreamsNotStartedException Javadoc: https://kafka.apache.org/40/javadoc/org/apache/kafka/streams/errors/StreamsNotStartedException.html
- Apache Kafka Streams configuration reference: https://kafka.apache.org/40/streams/developer-guide/config-streams/
- Confluent Kafka Streams Processor API guide: https://docs.confluent.io/platform/current/streams/developer-guide/processor-api.html

## Issues Found
- State-store interactive query examples used `KeyValueStore` for `KafkaStreams.store(...)`. Changed them to `ReadOnlyKeyValueStore`, which is the correct public query facade for `QueryableStoreTypes.keyValueStore()`.
- Store query failures were described as `IllegalStateException`. Changed the relevant examples and diagrams to `InvalidStateStoreException`, the Kafka Streams exception used for invalid or unavailable state stores.
- The processor `init()` example implied `context.getStateStore()` itself is too early and that querying there necessarily throws `IllegalStateException`. Updated the text to clarify that getting the store handle in `init()` is valid, while record-dependent reads should happen in `process()` or punctuation callbacks.
- The topology example claimed `stream.to(...)` after `streams.start()` throws `IllegalStateException`. Updated it to explain that operations added after `build()` are too late for the already-built topology, while calling `start()` twice is the actual `IllegalStateException` case.
- The state-directory lock example showed failure at construction time. Updated it to start both instances, since the lock conflict occurs when two same-application instances on the same machine try to use the same state directory.
- The unique state directory example used a random UUID for every run. Changed it to use a stable instance ID so restarts do not unnecessarily discard reusable local state.
- The shutdown section said `streams.close()` does not wait. Corrected it to use `streams.close(Duration.ZERO)` for the non-waiting example; `close()` blocks until stream threads stop.
- The uncaught exception handler examples used an outdated two-argument lambda. Updated them to the current `StreamsUncaughtExceptionHandler` single-argument lambda and used `Thread.currentThread()` for thread name logging.
- The error handling section described the uncaught exception handler as a deserialization error handler. Updated the wording because deserialization errors are handled by deserialization exception handler configuration, while `setUncaughtExceptionHandler` handles unexpected stream thread errors.

## Review Notes
The examples are illustrative snippets and omit imports, class wrappers, and checked exception handling in some places. The main Kafka Streams API usage and lifecycle guidance is now consistent with current Apache Kafka 4.0 documentation.
