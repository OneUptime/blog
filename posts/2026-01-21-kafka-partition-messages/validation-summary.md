# Validation Summary: How to Partition Messages Effectively in Kafka

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Apache Kafka
- Kafka producer partitioning
- Kafka Java client
- confluent-kafka Python client
- KafkaJS
- Kafka AdminClient
- Kafka CLI tools
- Java
- Python
- Node.js

## Sources Consulted
- Apache Kafka Java API documentation for `org.apache.kafka.clients.producer.Partitioner`: https://kafka.apache.org/39/javadoc/org/apache/kafka/clients/producer/Partitioner.html
- Apache Kafka documentation and command-line tool reference: https://kafka.apache.org/documentation/
- Confluent Kafka CLI tools documentation for `kafka-log-dirs.sh` and `kafka-consumer-groups.sh`: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- KafkaJS producer documentation for custom partitioners: https://kafka.js.org/docs/producing
- Apache Kafka KIP-794, Strictly Uniform Sticky Partitioner: https://cwiki.apache.org/confluence/display/KAFKA/KIP-794%3A%2BStrictly%2BUniform%2BSticky%2BPartitioner

## Issues Found
- The default keyed partitioning formula was incomplete because Kafka makes the Murmur2 result positive before applying modulo. Updated it to `toPositive(murmur2(keyBytes)) % numPartitions`.
- Several Java examples used `Math.abs(hash % numPartitions)`, which can still be problematic for negative hash edge cases and is less direct than Java's non-negative modulo helper. Replaced these with `Math.floorMod(...)`.
- The basic Java custom partitioner described a random choice as round-robin. Updated the comment to say random partitioning.
- The Java priority partitioner could divide by zero when the topic had no non-reserved partitions. Added a guard that caps reserved partitions to the actual topic partition count and falls back safely when all partitions are reserved.
- The Java region partitioner could return hard-coded partition IDs that do not exist on smaller topics. Added filtering so region-specific ranges only use valid topic partitions.
- The Python examples used Python's built-in `hash()`, which is randomized between interpreter processes and can change key-to-partition mapping after restarts. Replaced it with a stable SHA-256 based helper and returned actual partition IDs from metadata.
- The Python priority partitioner had the same potential zero-division issue as the Java version when all partitions were reserved for high priority. Added a safe fallback.
- The KafkaJS example imported `Partitioners` but did not use it. Removed the unused import.
- The KafkaJS region partitioner assumed hard-coded region partitions existed. Updated it to filter against `partitionMetadata` partition IDs and to return actual partition IDs.
- The Java `SpreadPartitioner` snippet omitted imports required for the displayed code to compile. Added imports for `Partitioner`, `Cluster`, `Map`, and `Random`.

## Review Notes
The examples remain illustrative rather than complete production implementations. In production, custom partitioners should also consider available partitions, behavior during metadata changes, and whether spreading a hot key intentionally relaxes per-key ordering guarantees.
