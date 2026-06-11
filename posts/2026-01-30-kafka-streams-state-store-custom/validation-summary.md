# Validation Summary: How to Build Kafka Streams State Store Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Streams
- Kafka Streams state stores
- Java
- Interactive Queries
- TopologyTestDriver
- Kafka Streams metrics

## Sources Consulted
- Apache Kafka Streams `KeyValueStore` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/state/KeyValueStore.html
- Apache Kafka Streams `StateStore` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/processor/StateStore.html
- Apache Kafka Streams `StateStoreContext` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/processor/StateStoreContext.html
- Apache Kafka Streams `KeyValueBytesStoreSupplier` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/state/KeyValueBytesStoreSupplier.html
- Apache Kafka Streams Interactive Queries documentation: https://docs.confluent.io/platform/current/streams/developer-guide/interactive-queries.html
- Apache Kafka Streams `KafkaStreams` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/KafkaStreams.html
- Apache Kafka Streams testing documentation: https://kafka.apache.org/documentation/streams/developer-guide/testing.html

## Issues Found
- The custom in-memory store mixed typed `K`/`V` storage with a `KeyValueBytesStoreSupplier`, which must return a raw `KeyValueStore<Bytes, byte[]>`. Updated the store to use `Bytes` keys and `byte[]` values, and rely on `Stores.keyValueStoreBuilder` for typed serialization.
- The state store examples used the old `ProcessorContext` lifecycle for store initialization. Updated them to use `StateStoreContext`.
- The iterator's `peekNextKey()` advanced the underlying iterator, which violates the expected peek behavior. Added buffering so peeking does not consume the next record.
- The store supplier accepted a `loggingEnabled` flag but did not use it. Removed the unused flag and moved changelog configuration to the `StoreBuilder` via `withLoggingEnabled` / `withLoggingDisabled`.
- The persistent-store section claimed to use memory-mapped files, but the code used `RandomAccessFile` and `FileChannel`. Updated the description to say append-only file-based backend.
- The persistent-store example accepted an arbitrary base directory. Updated it to derive the store directory from `StateStoreContext.stateDir()` and the store name.
- The persistent-store range query cast keys to `Comparable` at runtime. Added a generic bound requiring comparable, serializable keys.
- The batching restore callback referenced private deserialization helpers through a wildcard-typed store, so it would not compile. Updated it to restore raw `Bytes` and `byte[]` records.
- The queryable-store example missed the `StateStore` import and referenced an undefined `CompositeKeyValueIterator`. Added the missing import and iterator implementation.
- The application example used the store supplier logging flag instead of configuring the store builder, and omitted `application.server`, which is required for host metadata in interactive queries. Updated both.
- The processor and unit test used mismatched store names. Added a processor constructor that accepts the store name and updated the test wiring.
- The interactive query example used the older `metadataForKey` style. Updated it to `queryMetadataForKey` and `KeyQueryMetadata`.
- The unit test example had missing imports and outdated supplier construction. Updated the imports and store builder setup.
- The metrics wrapper extended the old generic store type. Updated it to extend the corrected raw bytes store.

## Review Notes
The examples are still intentionally simplified and omit production concerns such as transactional durability, compaction, corruption handling, robust remote query forwarding, and full metric lifecycle cleanup. Those caveats are acceptable for a tutorial, but a production custom store should be tested against the exact Kafka Streams version in use.
