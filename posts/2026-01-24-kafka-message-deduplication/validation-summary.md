# Validation Summary: How to Handle Kafka Message Deduplication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka producers and consumers
- Kafka transactions and exactly-once semantics
- Kafka Streams
- Java
- JDBC / SQL
- Redis
- Jedis

## Sources Consulted
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka `KafkaProducer` Javadocs: https://docs.confluent.io/platform/current/clients/javadocs/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka consumer configuration documentation for `isolation.level`: https://docs.confluent.io/platform/current/installation/configuration/consumer-configs.html
- Apache Kafka Streams `KStream.processValues` Javadocs: https://www.javadoc.io/static/org.apache.kafka/kafka-streams/4.1.1/org/apache/kafka/streams/kstream/KStream.html
- Apache Kafka Streams `FixedKeyProcessor` and `FixedKeyProcessorContext` Javadocs: https://www.javadoc.io/static/org.apache.kafka/kafka-streams/4.1.1/org/apache/kafka/streams/processor/api/FixedKeyProcessor.html
- Apache Kafka Streams `StreamsConfig.EXACTLY_ONCE_V2` Javadocs: https://www.javadoc.io/static/org.apache.kafka/kafka-streams/4.1.1/org/apache/kafka/streams/StreamsConfig.html
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Redis `SETNX` command documentation: https://redis.io/docs/latest/commands/setnx/
- Jedis `SetParams` Javadocs: https://www.javadoc.io/doc/redis.clients/jedis/jedis-3.6.2/redis/clients/jedis/params/SetParams.html

## Issues Found
- The in-memory deduplication example attempted to override `removeEldestEntry` on `LinkedHashSet`, but that hook exists on `LinkedHashMap`, not `LinkedHashSet`. Changed the cache to use a `LinkedHashMap`-backed `Set`.
- The in-memory consumer caught processing failures and then still committed the batch offsets, which would prevent the failed record from being reprocessed. Changed the catch block to rethrow after logging so offsets are not committed for the failed record.
- The database-backed deduplication example checked for an existing message and inserted the processed marker after processing, which leaves a race between concurrent consumers. Changed it to atomically insert the message ID first inside the database transaction and skip processing when the insert conflicts.
- The Redis example used `SETNX` followed by `EXPIRE`, which is not the current recommended Redis pattern and is not atomic with TTL assignment. Changed it to `SET key value NX EX ttl` via Jedis `SetParams`.
- The Redis batch example used `MGET` followed by `SETEX`, which can allow concurrent consumers to process the same message. Changed it to atomically claim each message with `SET NX EX` before processing.
- The Kafka Streams example used the older `transformValues` / `ValueTransformerWithKey` style. Updated it to the current `processValues` / `FixedKeyProcessor` API while preserving the same windowed state store deduplication behavior.

## Review Notes
- Kafka idempotent producers prevent duplicates caused by producer retries for a producer session; they do not replace business-level idempotency keys or consumer-side deduplication for duplicate logical events.
- Kafka transactions provide exactly-once guarantees for Kafka read-process-write pipelines. External side effects still need their own idempotency or transactional coordination.
- The examples remain illustrative snippets and omit surrounding imports, constructors, schema definitions, and production concerns such as rebalance handling and bounded retry/backoff.
