# Validation Summary: How to Implement Stateful Processing with Kafka Streams

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- Kafka Streams DSL
- Kafka Streams Processor API
- Kafka Streams state stores and changelog topics
- RocksDB-backed state stores
- Interactive Queries
- Java
- Maven
- Jackson JSON serialization

## Sources Consulted
- Apache Kafka 3.7.2 Kafka Streams `KStream` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Apache Kafka 3.7.2 deprecated API list: https://kafka.apache.org/37/javadoc/deprecated-list.html
- Apache Kafka 3.7.2 `StateStore` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/processor/StateStore.html
- Apache Kafka 3.7.2 `StateStoreContext` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/processor/StateStoreContext.html
- Apache Kafka 3.7.2 `RocksDBConfigSetter` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/state/RocksDBConfigSetter.html
- Apache Kafka 3.7.2 `StreamsConfig` Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/StreamsConfig.html
- Apache Kafka Streams Interactive Queries documentation: https://kafka.apache.org/43/streams/developer-guide/interactive-queries/
- Apache Kafka Streams state store factory Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/state/Stores.html
- Apache Kafka downloads and release information: https://kafka.apache.org/community/downloads/

## Issues Found
- Replaced deprecated `branch()` in the stateless operations list with `split().branch()`, because `KStream.branch(...)` is deprecated in Kafka Streams 3.7.x.
- Added `StreamsConfig.APPLICATION_SERVER_CONFIG` to the base stream configuration so the distributed interactive query example has the required discoverable RPC endpoint setting.
- Updated the RocksDB configuration example to close the user-created `BlockBasedTableConfig` in `RocksDBConfigSetter.close(...)`, matching the Kafka Streams lifecycle guidance for RocksDB objects.
- Fixed the custom aggregation snippet by adding missing Kafka Streams imports, replacing undefined serde helper methods with a concrete Jackson-based serde helper, and adding JavaBean getters/setters required by the code and JSON serialization.
- Fixed interactive query and REST examples by adding missing imports and using UTF-8 byte lengths when writing HTTP response bodies.
- Fixed distributed query snippet imports for `KafkaStreams`, `KeyQueryMetadata`, `HostInfo`, store query APIs, and `Serdes`.
- Updated the custom state store initializer from deprecated `ProcessorContext` to `StateStoreContext` and made byte/string conversion use `StandardCharsets.UTF_8`.
- Updated the processor registration snippet to use the current Processor API overload with `Named` and typed input consumption.
- Fixed the Processor API example by adding missing imports, disambiguating Kafka Streams `Record` from `java.lang.Record`, and guarding against null keys before writing to a key-value state store.
- Added missing imports to the standby replica, state restore listener, logging configuration, and metrics snippets.

## Review Notes
The dependency example still uses Kafka Streams 3.7.0, while newer Kafka releases are available as of 2026-06-21. The reviewed APIs were checked against Kafka Streams 3.7.x documentation and adjusted to avoid deprecated 3.7-era APIs where the post used them.
