# Validation Summary: How to Create Event Delivery Semantics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka delivery semantics
- KafkaJS producers, consumers, transactions, and offset commits
- TypeScript
- PostgreSQL transactions, row locking, and `ON CONFLICT`
- node-postgres (`pg`)
- Redis `SET` with `EX` and `NX`
- ioredis

## Sources Consulted
- KafkaJS Producing Messages documentation: https://kafka.js.org/docs/producing
- KafkaJS Transactions documentation: https://kafka.js.org/docs/transactions
- KafkaJS Consuming Messages documentation: https://kafka.js.org/docs/consuming
- Apache Kafka documentation: https://kafka.apache.org/documentation/
- Confluent Kafka delivery semantics documentation: https://docs.confluent.io/kafka/design/delivery-semantics.html
- PostgreSQL `INSERT` / `ON CONFLICT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` documentation: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL transactions documentation: https://www.postgresql.org/docs/current/tutorial-transactions.html
- node-postgres transactions documentation: https://node-postgres.com/features/transactions
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- Redis `SETNX` documentation: https://redis.io/docs/latest/commands/setnx/

## Issues Found
- The at-most-once KafkaJS producer called `producer.send()` without first connecting the producer. Added a `startProducer()` function that calls `producer.connect()` before starting the interval.
- The at-least-once consumer used `SELECT ... FOR UPDATE` to check a processed row before inserting the deduplication record. That does not lock a missing row, so concurrent consumers could both pass the check. Changed the code to claim the order ID with `INSERT ... ON CONFLICT (order_id) DO NOTHING RETURNING order_id`, relying on a unique constraint for race-safe deduplication.
- The exactly-once producer example imported `CompressionTypes` but did not use it. Removed the unused import.
- The consume-transform-produce KafkaJS example omitted `maxInFlightRequests: 1` on the transactional producer, which KafkaJS documents as required for exactly-once semantics. Added the option.
- The consume-transform-produce example sent offsets as part of the Kafka transaction but left normal consumer auto-commit enabled. Added `autoCommit: false` so offsets are committed through the transaction instead of the regular consumer commit path.
- The consume-transform-produce example assumed every batch had at least one message when computing the next offset. Added an empty-batch guard.
- The outbox publisher used `SELECT ... FOR UPDATE SKIP LOCKED` without explicitly starting a transaction. In PostgreSQL, row locks are released at transaction end, and a standalone statement would release them before the rows are updated. Added `BEGIN`, `COMMIT`, and `ROLLBACK` around the select, publish, and update loop.

## Review Notes
The examples are still illustrative and assume supporting schema constraints, especially a unique constraint on `processed_orders.order_id`. Kafka exactly-once semantics apply to Kafka records and transactional offset commits; side effects in external systems still need idempotency or database-level transaction patterns.
