# Validation Summary: How to Fix 'Data Inconsistency' Across Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microservices data consistency
- Saga pattern
- Event sourcing
- Transactional outbox pattern
- Idempotent consumers
- Python async code examples
- Redis idempotency keys
- PostgreSQL row locking with `FOR UPDATE SKIP LOCKED`
- Distributed transactions and eventual consistency

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `typing` documentation: https://docs.python.org/3/library/typing.html
- PostgreSQL `SELECT` documentation: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Microservices.io Saga pattern: https://microservices.io/patterns/data/saga.html
- Microservices.io Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Microservices.io Idempotent Consumer pattern: https://microservices.io/patterns/communication-style/idempotent-consumer.html
- Microsoft Azure Event Sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Martin Fowler on Event Sourcing: https://martinfowler.com/articles/201701-event-driven.html

## Issues Found
- The Python snippets used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced these calls with `datetime.now(UTC)` and added the required `UTC` imports.
- The choreography, outbox, idempotency, and consistency checker examples referenced modules or names that were not imported (`datetime`, `uuid`, `json`, and `Any`). Added the missing imports and removed unused imports where appropriate.
- The event sourcing example raised `ConcurrencyError` and `InvalidOperationError` without defining them. Added minimal custom exception classes so the example is internally complete.
- The orchestration saga created an order with `items` but did not preserve those items in the saga context, causing the inventory reservation step to reserve an empty list. Added `items` to the context returned by `_create_order`.
- The outbox publisher used `FOR UPDATE SKIP LOCKED` without keeping the fetch and mark-published operations inside an explicit transaction. Updated the publisher to run the batch inside a transaction, consistent with PostgreSQL row-lock behavior.
- The idempotent consumer decorator used a check-then-set flow that could race under concurrent duplicate delivery, and it used `json` without importing it. Updated the Redis logic to atomically claim processing with `SET ... NX EX`, mark the final result, and clear the processing marker on failure.

## Review Notes
The code examples are illustrative and still assume application-provided services, repositories, message brokers, Redis clients, and database schema exist. The outbox pattern remains an at-least-once publication pattern, so downstream consumers still need idempotency as the post describes.
