# Validation Summary: How to Build Event Partitioning Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- KafkaJS
- TypeScript
- Event-driven architecture
- Consumer groups and partition assignment

## Sources Consulted
- Apache Kafka 4.3 Design: producer partitioning and semantic keys: https://kafka.apache.org/43/design/design/
- Apache Kafka 4.3 Operations: partition counts and modifying topics: https://kafka.apache.org/43/operations/basic-kafka-operations/
- KafkaJS Producing Messages documentation: https://kafka.js.org/docs/producing
- KafkaJS Consuming Messages documentation: https://kafka.js.org/docs/consuming
- Confluent Kafka partition key guide: https://www.confluent.io/learn/kafka-partition-key/

## Issues Found
- The time-based partitioning section said time buckets provide predictable distribution and retention. In Kafka, a single key such as `hour-{bucket}` maps to one partition, so the active time bucket can become a hot partition, and Kafka retention is controlled by topic/log configuration rather than message key. Updated the wording to describe grouping by processing window and added the capacity caveat.
- The composite key example imported `createHash` from `crypto` but did not use it. Removed the unused import.
- The hot-partition mitigation section implied sub-partitioning by `eventId` maintains ordering for high-volume entities. Because this changes the key for one entity across multiple sub-keys, strict per-entity ordering is relaxed. Updated the text and code comment to make that tradeoff explicit.
- The consumer example described an in-memory offset map as supporting exactly-once semantics. KafkaJS documentation states stronger atomic semantics require storing offsets with processing results, such as in an external datastore transaction, or using transactions where applicable. Updated the comment to describe observability or custom checkpointing instead.

## Review Notes
The KafkaJS API usage is current for KafkaJS 2.2.x: `producer.send`, message keys, headers, `Partitioners.DefaultPartitioner`, `consumer.run`, and `eachMessage` are documented APIs. The snippets omit producer connection setup, so they should be read as focused excerpts rather than complete standalone programs.
