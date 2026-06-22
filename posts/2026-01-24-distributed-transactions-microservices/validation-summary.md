# Validation Summary: How to Handle Distributed Transactions in Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microservices
- Distributed transactions
- Saga pattern
- Transactional outbox pattern
- Debezium Change Data Capture
- Event sourcing
- CQRS
- JavaScript
- Java and Spring Framework annotations
- Go `database/sql`
- PostgreSQL row locking
- Python
- Apache Kafka consumer idempotency

## Sources Consulted
- Microservices.io Saga pattern: https://microservices.io/patterns/data/saga.html
- Microservices.io Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- PostgreSQL `SELECT` documentation for `FOR UPDATE SKIP LOCKED`: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- Go official `database/sql` transaction guide: https://go.dev/doc/database/execute-transactions
- Debezium Outbox Event Router documentation: https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- Python `abc` module documentation: https://docs.python.org/3/library/abc.html
- Spring Framework transaction management documentation: https://docs.spring.io/spring-framework/reference/data-access/transaction.html

## Issues Found
- The choreography saga example published `PaymentCompleted` without `items`, but the inventory service read `event.items`. Added `items: event.items` to the published payment event so the inventory reservation step receives the data it needs.
- The Go outbox relay used `FOR UPDATE SKIP LOCKED` through `db.QueryContext` without an explicit transaction. PostgreSQL row locks are held until the current transaction ends, and Go's `database/sql` transaction guide requires `BeginTx` plus operations on `sql.Tx` when multiple statements must share one transaction. Updated the relay to begin a transaction, query through `tx.QueryContext`, mark rows through `tx.ExecContext`, check row iteration errors, and commit after processing.
- The Python event sourcing usage example called `repository.save(order)`, which cleared pending events, then called `order.get_pending_events()` again to publish events. Updated `OrderRepository.save` to return the saved events and changed the command handler to publish that returned list.
- The Python event base class used `@abstractmethod` but did not inherit from `ABC`, so Python would not enforce the abstract method contract. Updated `Event` to inherit from `ABC` and added the missing `_deserialize_event` helper that `get_events` calls.

## Review Notes
The Java and Python examples remain illustrative snippets and omit surrounding application types, imports, dependency injection fields, and storage schema that a complete project would need. The idempotent Kafka consumer example uses an in-memory set, which demonstrates the concept but should be replaced by durable storage for production multi-instance consumers.
