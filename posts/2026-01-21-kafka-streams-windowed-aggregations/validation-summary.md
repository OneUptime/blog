# Validation Summary: How to Build Windowed Aggregations with Kafka Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Kafka Streams DSL
- Java
- Time windows, sliding windows, and session windows
- Windowed aggregations and state stores
- Suppression and interactive queries

## Sources Consulted
- Apache Kafka 4.3.0 Javadocs: TimeWindows - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka 4.3.0 Javadocs: SlidingWindows - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/SlidingWindows.html
- Apache Kafka 4.3.0 Javadocs: SessionWindows - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html
- Apache Kafka 4.3.0 Javadocs: SessionWindowedKStream - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/SessionWindowedKStream.html
- Apache Kafka 4.3.0 Javadocs: KGroupedStream - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/KGroupedStream.html
- Apache Kafka 4.3.0 Javadocs: Suppressed - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/Suppressed.html
- Apache Kafka 4.3.0 Javadocs: Suppressed.BufferConfig - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/Suppressed.BufferConfig.html
- Apache Kafka 4.3.0 Javadocs: ReadOnlyWindowStore - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/state/ReadOnlyWindowStore.html
- Apache Kafka 4.3.0 Javadocs: ReadOnlySessionStore - https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/state/ReadOnlySessionStore.html

## Issues Found
- The hopping window example used a non-existent `HoppingWindows` class. Kafka Streams represents tumbling and hopping aggregation windows with `TimeWindows`; hopping behavior is configured by calling `advanceBy(...)`. Updated the example to use `TimeWindows.ofSizeWithNoGrace(...).advanceBy(...)`.
- The suppression buffer limits example used `emitEarlyWhenFull()` with `Suppressed.untilWindowCloses(...)`. `untilWindowCloses` requires a strict buffer config because early emission would violate final-results semantics. Updated the example to use `shutDownWhenFull()`.
- The daily aggregation best-practices snippet called `.suppress(...)` directly on a `TimeWindows` object. Suppression applies to the resulting `KTable`, not the window specification. Updated the snippet to show `groupByKey().windowedBy(...).count().suppress(...)`.

## Review Notes
The examples rely on placeholder domain classes, serdes, and configuration helpers such as `Transaction`, `transactionSerde`, and `getConfig()`, so they are illustrative rather than standalone compilable programs. The custom window example uses Kafka Streams' generic `Windows` API with `TimeWindow` from an internal package; it may compile, but production code should prefer built-in public window types unless a custom implementation is carefully version-pinned and tested.
