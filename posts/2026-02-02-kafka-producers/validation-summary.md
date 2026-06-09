# Validation Summary: How to Build Kafka Producers in Various Languages

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Apache Kafka (broker / cluster concepts)
- Java with `org.apache.kafka:kafka-clients` 3.6.1
- Python with `confluent-kafka` (librdkafka wrapper) and Confluent Schema Registry / Avro
- Node.js / TypeScript with `kafkajs`, Zod for runtime schema validation
- Go with `github.com/confluentinc/confluent-kafka-go/v2/kafka`
- Producer configuration concepts: acks, idempotence, retries, batching, compression, partitioning, headers
- Mermaid diagrams for architecture, error-handling and monitoring flows

## Sources Consulted
- Apache Kafka client documentation and `ProducerConfig` constants — https://kafka.apache.org/documentation/
- `kafka-clients` 3.6.1 release on Maven Central — https://mvnrepository.com/artifact/org.apache.kafka/kafka-clients/3.6.1
- `Partitioner` interface contract — https://kafka.apache.org/36/javadoc/org/apache/kafka/clients/producer/Partitioner.html
- confluent-kafka-python `Producer` API (`produce`, `poll`, `flush`, `callback`/`on_delivery`) — https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka CONFIGURATION reference (acks, enable.idempotence, batch.size, linger.ms, queue.buffering.max.kbytes, retries) — https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md
- confluent-kafka-python Avro / Schema Registry serializers — https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html#avroserializer
- KafkaJS producer documentation (client + producer options, `send`, `sendBatch`, `CompressionTypes`) — https://kafka.js.org/docs/producing
- confluent-kafka-go v2 documentation and examples — https://pkg.go.dev/github.com/confluentinc/confluent-kafka-go/v2/kafka
- Zod schema validation library — https://zod.dev/

## Issues Found
- **Java custom partitioner — misleading "round robin" comment.** In the `PriorityPartitioner` example, the no-key branch used `Math.random()` to choose a partition while the comment described it as "round robin among non-premium partitions". True round-robin requires per-call state (typically an `AtomicInteger` counter); `Math.random()` produces a uniform random distribution. Updated the comment to "random selection among non-premium partitions" so the description matches the implementation. The behavior of the code is unchanged.

## Review Notes
- The Java `kafka-clients` 3.6.1 example is current; the `Partitioner` interface signature, `ProducerConfig` constants, and the idempotence + `acks=all` + `retries>0` constraint are all correctly applied.
- The confluent-kafka-python `produce()` call accepts both `callback=` and `on_delivery=` (they are aliases); the post's use of `callback=` is valid.
- `queue.buffering.max.kbytes: 1048576` is annotated as "1GB" — 1,048,576 KB equals 1 GiB, which is the librdkafka default and is accurate enough for a recommendation comment.
- KafkaJS Snappy compression (`CompressionTypes.Snappy`) requires the separate `kafkajs-snappy` codec package to be installed and registered at runtime; the post does not call this out. It is not strictly an error — the constant is exported by KafkaJS — but readers copying the snippet may hit a runtime error on first send if they have not installed the codec. A future revision could add a one-line note.
- The Go example correctly uses `confluent-kafka-go/v2` import path, `kafka.PartitionAny`, the `Events()` channel for async delivery reports, and a per-message `deliveryChan` for the synchronous wrapper. All API usage matches v2.
- The "Configuration Recommendations by Use Case" table is presented as guidance and uses informal units (e.g., "1KB", "64KB") rather than the raw byte values that `batch.size` actually accepts. This is acceptable for a recommendation table but worth noting if readers paste values directly.
- `retries=3` is used across all languages for illustration; the modern Kafka clients' default is effectively unbounded (`Integer.MAX_VALUE`) bounded by `delivery.timeout.ms`. The lower value is fine for an example but is not the production default.
