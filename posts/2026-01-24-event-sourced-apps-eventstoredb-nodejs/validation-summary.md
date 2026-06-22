# Validation Summary: How to Build Event-Sourced Apps with EventStoreDB in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Event sourcing
- EventStoreDB
- EventStoreDB Node.js client
- Node.js
- TypeScript
- Docker
- CQRS read models and subscriptions

## Sources Consulted
- EventStoreDB/KurrentDB Node.js client getting started documentation: https://docs.kurrent.io/clients/node/legacy/v6.2/getting-started
- EventStoreDB/KurrentDB Node.js client appending events documentation: https://docs.kurrent.io/clients/node/legacy/v6.2/appending-events
- EventStoreDB/KurrentDB Node.js client reading events documentation: https://docs.kurrent.io/clients/node/legacy/v6.2/reading-events
- EventStoreDB/KurrentDB Node.js client catch-up subscriptions documentation: https://docs.kurrent.io/clients/node/legacy/v6.2/subscriptions
- EventStoreDB server Docker installation documentation: https://docs.kurrent.io/server/v23.10/quick-start/installation
- EventStoreDB Docker image help output for `eventstore/eventstore:latest`
- `@eventstore/db-client` 6.2.1 package TypeScript declarations from npm

## Issues Found
- The `subscribeToAll` example used a raw filter object with `filterOn` and `prefixes`. The current Node.js client documentation and package types expose helper functions such as `streamNameFilter({ prefixes: [...] })`; the raw object is incomplete under the exported `Filter` type because it omits `checkpointInterval`. Updated the example to import and use `streamNameFilter`.
- The final `app.ts` example imported `OrderItem` from `./domain/aggregates/order`, but that module does not export `OrderItem`. Updated the import to get `OrderItem` from `./domain/events/order-events`, where it is defined and exported.
- The connection and repository snippets included unused imports (`jsonEvent` in `eventstore-client.ts` and `JSONEventType` in `order-repository.ts`). Removed them to keep the TypeScript examples clean.

## Review Notes
- The Docker flags, insecure local connection string, append expected revision options, stream reading options, and use of catch-up subscriptions align with the official EventStoreDB/KurrentDB documentation for the `@eventstore/db-client` 6.2.x line.
- The official docs now present EventStoreDB under KurrentDB branding and mark the `@eventstore/db-client` package as the legacy Node.js client line, but `@eventstore/db-client` 6.2.1 remains the current npm release for that package as of this review.
