# Validation Summary: How to Build Event Sourcing Implementation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Event sourcing
- CQRS-style read projections
- TypeScript
- Event stores
- Snapshots
- Event replay
- PostgreSQL JSONB
- EventStoreDB
- Apache Kafka

## Sources Consulted
- TypeScript Handbook: Classes and member visibility: https://www.typescriptlang.org/docs/handbook/2/classes.html
- MDN Web Docs: `Crypto.randomUUID()`: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
- Node.js documentation: Crypto module and `randomUUID`: https://nodejs.org/api/crypto.html
- Microsoft Learn: Event Sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Microsoft Learn: CQRS pattern and event sourcing relationship: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- PostgreSQL documentation: JSON types and JSONB: https://www.postgresql.org/docs/current/datatype-json.html
- Apache Kafka documentation: event retention concepts: https://kafka.apache.org/documentation/

## Issues Found
- The later repository, projection, and replay examples called `EventStore.getAllEvents()`, but the `EventStore` example did not define that method. Added `getAllEvents()` to return a copy of the global event log in append order.
- The snapshot repository example accessed `cart.id` and `cart.version`, but both were private in the `ShoppingCart` class. Changed the aggregate to expose `id` through a readonly constructor property and `version` through a getter backed by private state.
- The snapshot repository example called `ShoppingCart.fromSnapshot()`, `cart.applyEvent()`, and `cart.toSnapshot()`, but those methods were missing. Added implementations so the snapshot section is internally complete and type-checks.

## Review Notes
- Verified the extracted TypeScript snippets with `tsc --noEmit --target ES2020 --lib ES2020,DOM --moduleResolution node --skipLibCheck`.
- The in-memory event store remains appropriate as a demonstration, but it is not durable and does not provide database-level atomicity or cross-process concurrency control.
- `crypto.randomUUID()` is a current API for UUID generation in modern Node.js and secure browser contexts; older runtimes or insecure browser contexts need an alternative.
