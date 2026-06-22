# Validation Summary: How to Handle Late-Arriving Data in Kafka Streams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka Streams DSL
- Kafka Streams windowing and grace periods
- Kafka Streams timestamp extractors
- Kafka Streams suppression
- Kafka Streams session windows
- Micrometer metrics
- Java

## Sources Consulted
- Apache Kafka Streams core concepts: https://kafka.apache.org/43/streams/core-concepts/
- Apache Kafka TimeWindows Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka TimestampExtractor Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/processor/TimestampExtractor.html
- Apache Kafka Suppressed Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/Suppressed.html
- Apache Kafka Suppressed.BufferConfig Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/Suppressed.BufferConfig.html
- Apache Kafka SessionWindows Javadocs: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html
- Apache Kafka StreamsConfig Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Micrometer Distribution Summaries documentation: https://docs.micrometer.io/micrometer/reference/concepts/distribution-summaries.html

## Issues Found
- The post described late data and grace period closure using wall-clock arrival/processing time. Kafka Streams determines lateness for windowed operations using stream time, and drops a record when stream time is greater than the window end plus grace. Updated the explanation and timeline to use stream time.
- The tags and description referenced watermarks, but Kafka Streams documentation describes stream time and grace periods rather than a watermark API for these DSL examples. Replaced "Watermark" with "Stream Time".
- The timestamp extractor examples could return `partitionTime` even when it is `-1`, which Kafka Streams treats as an invalid timestamp. Added fallbacks to a valid record timestamp or current time.
- The suppression buffer example used `emitEarlyWhenFull()` with `untilWindowCloses()`. `untilWindowCloses()` requires a strict buffer because emitting early would violate the final-results guarantee. Changed the example to use `shutDownWhenFull()`.
- The suppression buffer example chained `.maxBytes(...)` as an instance method, but the current API uses `.withMaxBytes(...)` for chained constraints. Updated the snippet.
- The historical reprocessing example used deprecated `StreamsConfig.CACHE_MAX_BYTES_BUFFERING_CONFIG`. Replaced it with `StreamsConfig.STATESTORE_CACHE_MAX_BYTES_CONFIG`.
- The historical suppression example passed `BufferConfig.maxBytes(...)` directly to `untilWindowCloses()`, but that returns an eager buffer unless converted to a strict buffer. Added `.shutDownWhenFull()`.
- The Micrometer metrics example used `Histogram` and `registry.histogram(...)`, which are not the standard Micrometer core API for recording arbitrary latency values. Replaced it with `DistributionSummary` and `registry.summary(...)`.
- The late-data tracking section implied it could monitor dropped Kafka Streams window records directly. Adjusted the wording to make it an application-level latency routing pattern before windowed processing.

## Review Notes
The code examples remain illustrative snippets with placeholder application types and helpers such as `Event`, `eventSerde`, `getConfig()`, and processing methods. They are technically aligned with current Kafka Streams APIs, but a production article could add complete imports and runnable project context in the future.
