# Validation Summary: How to Implement the Transactional Outbox Pattern in Go

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- Go `database/sql`
- PostgreSQL
- Transactional outbox pattern
- Message brokers such as Kafka and RabbitMQ

## Sources Consulted
- Go `database/sql` package documentation: https://pkg.go.dev/database/sql
- Go documentation, "Executing transactions": https://go.dev/doc/database/execute-transactions
- PostgreSQL `SELECT` documentation for `FOR UPDATE SKIP LOCKED`: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- Microservices.io transactional outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Microservices.io idempotent consumer pattern: https://microservices.io/patterns/communication-style/idempotent-consumer.html

## Issues Found
- The relay example used `FOR UPDATE SKIP LOCKED` through `db.QueryContext` without an explicit transaction. In PostgreSQL, row locks taken by `SELECT ... FOR UPDATE` are transaction-scoped, so the locks would be released when the single statement completed. This made the claim about multiple relay instances not processing the same messages inaccurate. I changed `processBatch` to start a transaction, query with `tx.QueryContext`, update rows with `tx.ExecContext`, and commit after processing so the locks are held for the intended work.
- The relay code did not check `rows.Err()` after iteration and left the result set open while later statements ran on the same transaction. I added `rows.Err()` handling and close the rows before publishing/updating.
- The retry helper used `fmt.Errorf`, but the relay import block did not include `fmt`. I added the missing import.

## Review Notes
The implementation is a basic polling relay and correctly describes the outbox pattern's at-least-once delivery behavior. In production, holding a database transaction open while publishing to a broker can increase lock duration; a common refinement is to add an explicit claim state or lease column so workers claim rows quickly, commit, and publish outside the claiming transaction.
