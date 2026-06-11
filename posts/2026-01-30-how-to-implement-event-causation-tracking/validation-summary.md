# Validation Summary: How to Implement Event Causation Tracking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- TypeScript
- Node.js `crypto.randomUUID`
- Event-driven architecture
- PostgreSQL recursive CTEs, arrays, indexes, and partitioning
- node-postgres (`pg`)
- OpenTelemetry JavaScript API
- OpenTelemetry messaging semantic conventions
- ULID
- Mermaid diagrams

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- PostgreSQL `CREATE TABLE` documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL recursive query documentation: https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL table partitioning documentation: https://www.postgresql.org/docs/current/ddl-partitioning.html
- node-postgres query documentation: https://node-postgres.com/features/queries
- ULID JavaScript package README: https://github.com/ulid/javascript
- Related OneUptime blog links referenced by the post:
  - https://oneuptime.com/blog/post/2026-01-30-event-ordering-guarantees/view
  - https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view
  - https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view

## Issues Found
- The event metadata model did not include `causationIds`, even though later examples used it for fan-in scenarios. Added `causationIds?: string[]` to the metadata interfaces.
- The factory prose said there were two methods while the code included a third multi-cause method. Updated the prose to describe root, derived, and fan-in event creation.
- `createMultiCauseEvent` assumed all cause events shared a correlation ID but did not enforce it. Added validation to reject mixed-correlation causes.
- The in-memory causation graph only linked `causationId`, so multi-cause events were not represented fully. Updated graph construction to use both `causationId` and `causationIds`.
- The PostgreSQL schema used an immediate self-referential foreign key on `causation_id`, which conflicts with the later guidance about out-of-order event arrival. Changed the example to keep `causation_id` nullable without an immediate foreign key.
- The repository imported unused `PoolClient`. Removed the unused import.
- The repository method `findBysCausationId` had a typo. Renamed it to `findByCausationId`.
- The repository lacked a way to load the target event directly, which made the debugger fail for root events because it derived the correlation ID from ancestors. Added `findById` and updated the debugger to use the target event's correlation ID.
- Recursive ancestor and descendant queries only followed `causation_id`, missing multi-cause relationships stored in `causation_ids`. Updated the recursive joins to include `ANY(causation_ids)`.
- `rowToEvent` dropped `causation_ids`, losing fan-in lineage after reading from PostgreSQL. Preserved it as `metadata.causationIds`.
- The OpenTelemetry snippet used the older `messaging.operation` attribute while labeling it as standard. Updated it to current messaging semantic convention attributes `messaging.operation.name` and `messaging.operation.type`.
- The sibling-event lookup only compared a single primary cause. Updated it to consider all direct causes for multi-cause events.
- The missing-cause handling snippet claimed it would store the event anyway after a foreign-key failure but only logged the error. Updated it to rethrow unrelated errors and retry with a null direct causation reference for PostgreSQL foreign-key violation `23503`.
- The partitioning example used `LIKE events INCLUDING ALL`, which would copy the primary key/index definition and can violate PostgreSQL's rule that unique constraints on partitioned tables include the partition key. Changed it to copy defaults and constraints without indexes.

## Review Notes
The examples are still illustrative and omit application-specific pieces such as `EventPublisher` and actual database connection setup. The TypeScript and SQL patterns are now technically consistent with the documented APIs and the post's stated behavior.
