# Validation Summary: How to Build the Outbox Pattern in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- Entity Framework Core
- SQL Server
- PostgreSQL
- MassTransit
- RabbitMQ
- Transactional outbox pattern
- Background services

## Sources Consulted
- Microsoft Learn: EF Core indexes and filtered indexes - https://learn.microsoft.com/en-us/ef/core/modeling/indexes
- Microsoft Learn: EF Core SQL queries and `FromSqlRaw` parameterization - https://learn.microsoft.com/en-us/ef/core/querying/sql-queries
- Microsoft Learn: EF Core transactions - https://learn.microsoft.com/en-us/ef/core/saving/transactions
- Microsoft Learn: EF Core `ExecuteDelete` - https://learn.microsoft.com/en-us/ef/core/saving/execute-insert-update-delete
- Microsoft Learn: SQL Server table hints, including `UPDLOCK` and `READPAST` - https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table
- PostgreSQL documentation: `SELECT ... FOR UPDATE SKIP LOCKED` - https://www.postgresql.org/docs/current/sql-select.html
- MassTransit documentation: transactional outbox configuration - https://masstransit.io/documentation/configuration/middleware/outbox
- MassTransit documentation: transactional outbox behavior - https://masstransit.io/documentation/patterns/transactional-outbox

## Issues Found
- The manual EF Core mapping configured the table name as `outbox_messages`, but did not map property columns to the snake_case names used later in raw SQL. Added explicit `HasColumnName` mappings for the outbox fields and updated the filtered index filter to match `processed_at`.
- The PostgreSQL `FOR UPDATE SKIP LOCKED` example started the EF transaction after querying the rows, so the row locks would not be held during message publishing and marking. Moved `BeginTransactionAsync` before the raw SQL query.
- The SQL Server `UPDLOCK`/`READPAST` snippet did not show an explicit transaction around the lock-select. Added a transaction before the query so the locks are held while processing.
- The MassTransit example used delivery option names that do not match the current documented bus outbox option sample. Replaced them with `UseBusOutbox(options => options.MessageDeliveryLimit = 100)`.
- The MassTransit section said table creation was automatic without showing the required DbContext entity registration. Added the documented `AddInboxStateEntity`, `AddOutboxMessageEntity`, and `AddOutboxStateEntity` calls and adjusted the wording to say EF migrations create the tables from that configuration.
- The idempotent consumer example queried with `context.MessageId` but recorded a newly generated ID when `MessageId` was null, which could make the idempotency check ineffective. Changed it to use one stable `eventId` value for both lookup and insert.
- The cleanup snippet said it deleted rows in batches, but the `ExecuteDeleteAsync` query performs one set-based delete. Updated the comment to describe the actual behavior.

## Review Notes
The post is technically relevant and the overall explanation of the transactional outbox pattern is accurate. The custom outbox processor still demonstrates at-least-once delivery, so the idempotent consumer guidance remains important. In a production implementation, teams should also consider retry limits, poison-message handling, observability, and avoiding long database transactions while waiting on a message broker.
