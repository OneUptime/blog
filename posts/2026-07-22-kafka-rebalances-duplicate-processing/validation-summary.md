# Validation Summary: Why Kafka Consumer Rebalances Cause Duplicate Processing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka 4.3 consumer groups and rebalance protocols
- Kafka Java consumer and producer APIs
- Consumer offsets and at-least-once delivery
- Asynchronous consumer processing and partition fencing
- Kafka transactions and read-committed isolation
- PostgreSQL transactions, unique constraints, and `INSERT ... ON CONFLICT`
- Idempotent consumer and relational inbox patterns

## Sources Consulted
- Apache Kafka 4.3.1 `KafkaConsumer` API: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka 4.3.1 `ConsumerRecords` API: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRecords.html
- Apache Kafka 4.3.1 `ConsumerRebalanceListener` API: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka 4.3 consumer configuration: https://kafka.apache.org/43/configuration/consumer-configs/
- Apache Kafka 4.3 consumer rebalance protocol: https://kafka.apache.org/43/operations/consumer-rebalance-protocol/
- Apache Kafka 4.3 message delivery semantics: https://kafka.apache.org/43/design/design/#message-delivery-semantics
- Apache Kafka 4.3.1 `KafkaProducer` API: https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- PostgreSQL 18 `INSERT` and `ON CONFLICT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL 18 transaction isolation documentation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL 18 explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- Java SE 25 `Duration` API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/Duration.html
- Java SE 25 `Properties` API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Properties.html

## Issues Found
- The asynchronous completion guidance could be read as requiring numerically consecutive Kafka offsets, but offsets can contain gaps after compaction or transactional records. Changed the guidance to advance over a completed prefix of records in delivery order and to track records actually returned by `poll()`.
- The description of `ConsumerRecords.nextOffsets()` said it covered records returned by the poll. Corrected it to the API's precise behavior: it returns next offsets for partitions whose positions advanced during the poll.
- The stale-worker guidance did not distinguish local generation invalidation from authoritative cross-consumer fencing, and it did not state that lease validation must be atomic with the effect. Clarified that local generations discard invalidated results, while a database lease or monotonic fencing token must be checked in the same transaction as the business update when authoritative fencing is required.

## Review Notes
- The Java snippet is intentionally partial and assumes surrounding declarations and imports. The Kafka and Java APIs it uses are current and non-deprecated in Kafka 4.3.1 and Java SE 25.
- The PostgreSQL snippet uses named bind-parameter notation and assumes a unique constraint on `(consumer_name, event_id)`. Its comment correctly requires application control flow to run the business update only when `RETURNING` yields a row.
- All external documentation links in the post resolved to the intended Kafka 4.3.1 or current PostgreSQL documentation.
