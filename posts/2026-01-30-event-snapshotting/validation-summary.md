# Validation Summary: How to Implement Event Snapshotting

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Event sourcing
- Event snapshotting
- TypeScript
- PostgreSQL-style snapshot persistence
- JSON serialization
- Schema migration/versioning

## Sources Consulted
- TypeScript Handbook, Classes and parameter properties: https://www.typescriptlang.org/docs/handbook/2/classes.html
- PostgreSQL documentation, INSERT and ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html
- MDN Web Docs, JSON.stringify: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
- MDN Web Docs, Date.prototype.toJSON: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON
- Microsoft Learn, Event Sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Martin Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html

## Issues Found
- The bank account snapshot example stored `lastTransactionDate` as a `Date`, but the snapshot store serializes state with `JSON.stringify`. Date values are serialized to ISO strings and are not automatically restored as `Date` objects by `JSON.parse`, so the example would reload a string into a field typed as `Date | null`. Changed `lastTransactionDate` to `string | null` and converted event timestamps with `toISOString()`.
- The snapshot restoration test claimed to verify snapshot-plus-events behavior, but the shown repository only creates snapshots after 100 events and the test only appended two events before the first load. Added an explicit `snapshotStore.save(...)` call after the first load so the second load can actually restore from a snapshot and replay the later event.
- The Microsoft documentation link used the older `docs.microsoft.com` host. Updated it to the current Microsoft Learn URL.

## Review Notes
- The TypeScript snippets are illustrative and depend on locally defined `Database`, `EventStore`, `eventStore`, `db`, `repo`, and `snapshotStore` test fixtures.
- The SQL `ON CONFLICT (aggregate_id) DO UPDATE` pattern is valid PostgreSQL syntax, assuming `aggregate_id` has a unique index or constraint.
