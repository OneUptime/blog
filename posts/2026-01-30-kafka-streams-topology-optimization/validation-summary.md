# Validation Summary: How to Build Kafka Streams Topology Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka Streams
- Kafka Streams DSL
- Kafka Streams Processor API
- RocksDB state stores
- Kafka Streams interactive queries
- Kafka Streams metrics and configuration
- Java

## Sources Consulted
- Apache Kafka 4.3 Javadocs: KStream API, including `selectKey`, `groupBy`, `groupByKey`, and `repartition`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Apache Kafka 4.3 Javadocs: `StreamPartitioner`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/processor/StreamPartitioner.html
- Apache Kafka 4.3 Javadocs: `Repartitioned`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/Repartitioned.html
- Apache Kafka Streams developer guide: configuring Streams applications and RocksDB config setter: https://kafka.apache.org/41/streams/developer-guide/config-streams/
- Apache Kafka 4.3 Javadocs: `TopologyDescription`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/TopologyDescription.html
- Apache Kafka 3.3 Javadocs: `KafkaStreams.addStreamThread()` and `removeStreamThread()`: https://kafka.apache.org/33/javadoc/org/apache/kafka/streams/KafkaStreams.html
- Apache Kafka 4.3 Javadocs: deprecated API list, including deprecated cache config aliases and removed/changed APIs: https://kafka.apache.org/43/javadoc/deprecated-list.html
- Apache Kafka 4.3 Javadocs: `Suppressed.BufferConfig`: https://kafka.apache.org/43/javadoc/org/apache/kafka/streams/kstream/Suppressed.BufferConfig.html

## Issues Found
- The repartitioning example incorrectly implied that `selectKey(...).groupByKey()` caused more repartitioning than `groupBy(...)` when changing to a new key. Kafka Streams documents `groupBy(...)` as semantically equivalent to `selectKey(...).groupByKey()` and creating an internal repartition topic when a new key is selected. I changed the example to show a truly unnecessary `selectKey((key, value) -> key)` when the stream is already keyed correctly, and added a note that `groupBy(...)` and `selectKey(...).groupByKey()` are equivalent when rekeying is needed.
- The sub-topology description said sub-topologies are based on repartitioning boundaries and can be scaled independently. Kafka documents sub-topologies as connected processor graphs that may be linked through topics and executed as tasks. I updated the wording to describe connected processor graphs, topic boundaries, tasks, and partition-level parallelism.
- The RocksDB tuning snippet created a new `BlockBasedTableConfig` and did not implement `RocksDBConfigSetter.close(...)`. Kafka's official example recommends reusing the existing table config to preserve defaults and closing user-created RocksDB objects. I updated the snippet to use `options.tableFormatConfig()`, a reusable `LRUCache`, and `close(...)`.
- The dynamic scaling snippet said "add 2 more threads" but called `addStreamThread()` once. I changed the comment to "add one more thread."
- The at-least-once comment said it "requires idempotent consumers." At-least-once processing can produce duplicate downstream outputs, so idempotence is a downstream processing concern when duplicates matter. I updated the wording accordingly.
- The custom partitioner example used the old `StreamPartitioner.partition(...)` API returning `Integer`, and it used `KStream.through(...)`, which is not present in the current Kafka 4.3 `KStream` API. I updated the example to implement `partitions(...)` returning `Optional<Set<Integer>>`, use `Math.floorMod(...)` to avoid negative partition numbers, and apply it with `repartition(Repartitioned.with(...).withStreamPartitioner(...))`.

## Review Notes
The post is technically relevant and remains a useful Kafka Streams optimization guide after the corrections. Some snippets are illustrative and omit surrounding domain classes, serdes, and imports; this is acceptable for a blog guide, but a future improvement would be to state the Kafka Streams version target explicitly because several APIs changed across Kafka 3.x and 4.x.
