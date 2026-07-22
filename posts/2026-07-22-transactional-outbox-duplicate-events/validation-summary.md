# Validation Summary: Transactional Outbox with At-Least-Once Delivery: Designing for Duplicate Events

## Status
validated

## Post Type
Technical guide / Distributed systems design guide

## Technologies Covered
- Transactional outbox pattern
- At-least-once message delivery
- PostgreSQL transactions, data-modifying CTEs, constraints, and `FOR UPDATE SKIP LOCKED`
- Lease-based polling publishers
- Change data capture (CDC)
- Debezium PostgreSQL connector and Outbox Event Router
- Apache Kafka producer idempotence and key-based partitioning
- Amazon SQS FIFO deduplication and message groups
- Idempotent consumers and inbox deduplication

## Sources Consulted
- [AWS Prescriptive Guidance: Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [PostgreSQL `SELECT`, data-modifying `WITH`, and row-locking documentation](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL `UPDATE` and `RETURNING` documentation](https://www.postgresql.org/docs/current/sql-update.html)
- [PostgreSQL constraints documentation](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL date/time functions documentation](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL logical decoding output-plugin documentation](https://www.postgresql.org/docs/current/logicaldecoding-output-plugin.html)
- [Debezium Outbox Event Router documentation](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [Debezium PostgreSQL connector documentation](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)
- [Debezium Outbox Quarkus Extension documentation](https://debezium.io/documentation/reference/stable/integrations/outbox.html)
- [Apache Kafka 4.3 producer configuration](https://kafka.apache.org/43/configuration/producer-configs/)
- [Apache Kafka 4.3 `KafkaProducer` API documentation](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [Amazon SQS FIFO exactly-once processing](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html)
- [Amazon SQS FIFO queue key terms](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html)

## Issues Found
1. **The table definition omitted columns used by the polling query.** The lease claim referenced `lease_owner` and `lease_until`, so executing the examples against the shown schema would fail. Added both nullable columns to the `CREATE TABLE` statement and updated the accompanying explanation.
2. **The parameter notation was not identified.** PostgreSQL does not interpret `:order_id`, `:event_id`, and similar tokens as native server-side parameter syntax. Clarified that these are application database-client bind placeholders.
3. **The ordering discussion could imply that the lease query preserves publish order.** The query's `ORDER BY` controls candidate selection, but PostgreSQL does not guarantee the order of rows emitted by `UPDATE ... RETURNING`, and concurrent claims can still violate aggregate-version order. Added the required caveat and identified earliest-version claiming or an aggregate-scoped lock as serialization options.
4. **The blanket insert-only guidance conflicted with the polling design's delivery-state updates.** Debezium's Outbox Event Router expects outbox changes to be inserts and treats updates as invalid operations, while the polling design updates lease and publication metadata. Revised the text to require immutable event identity and payload while distinguishing polling metadata updates from CDC insert-only event capture.

## Review Notes
- The transactional `UPDATE` plus outbox `INSERT ... SELECT` data-modifying CTE is valid PostgreSQL. Its `RETURNING` output correctly makes the updated version available to the insert, and a statement error aborts the transaction.
- PostgreSQL documents `SKIP LOCKED` as appropriate for avoiding contention among consumers of a queue-like table. The post correctly avoids holding the claim transaction open during broker I/O.
- PostgreSQL `now()` is the transaction-start timestamp, so the warning that timestamps do not establish commit order is correct.
- Debezium 3.6 documents the event ID header, aggregate ID message key, configurable routing, JSON and binary payload handling, insert-only expectation, and possible duplicate events during fault recovery. The post's stable-ID and idempotent-consumer guidance is consistent with those semantics.
- Kafka 4.3 documentation confirms that producer idempotence is limited to messages sent within a single producer session and does not deduplicate application-level re-sends across relay sessions.
- Amazon SQS FIFO documentation confirms the five-minute deduplication interval and strict ordering within a message group. These broker features do not replace durable consumer-side deduplication for later replay.
- All external links in the post resolved to the intended current official documentation during validation.
