# Validation Summary: How to Configure Kafka Streams for Stateful Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Java
- RocksDB-backed state stores
- Kafka Streams changelog topics
- Windowed aggregations
- Exactly-once processing

## Sources Consulted
- Apache Kafka Streams configuration guide: https://kafka.apache.org/43/streams/developer-guide/config-streams/
- Apache Kafka Streams architecture guide: https://kafka.apache.org/43/streams/architecture/
- Apache Kafka `StreamsConfig` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Apache Kafka `Materialized` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/Materialized.html
- Apache Kafka `TimeWindows` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka `KGroupedStream` Javadocs: https://kafka.apache.org/28/javadoc/org/apache/kafka/streams/kstream/KGroupedStream.html

## Issues Found
- The count aggregation materialized a named state store without explicitly setting the `Long` value serde, while the application default value serde was configured as `String`. Updated the `Materialized.as("event-counts-store")` example to specify `Serdes.String()` for keys and `Serdes.Long()` for count values, matching the `KTable<String, Long>` result.
- The windowed count example had the same implicit serde issue for a `Long` count value. Updated the materialized window store to specify `Serdes.String()` for keys and `Serdes.Long()` for values.
- The windowed aggregation snippet referred to `stream`, while the full example defined the input stream as `inputStream`. Updated the snippet to use `inputStream` for consistency with the preceding example.

## Review Notes
No additional technical issues found. The post uses current Kafka Streams APIs such as `StreamsConfig.EXACTLY_ONCE_V2` and `TimeWindows.ofSizeWithNoGrace(Duration)`. Note that `ofSizeWithNoGrace` intentionally drops out-of-order records that arrive after the window end; production examples may prefer an explicit grace period depending on event-time requirements.
