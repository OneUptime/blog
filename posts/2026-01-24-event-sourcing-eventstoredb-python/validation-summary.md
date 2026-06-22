# Validation Summary: How to Build Event-Sourced Apps with EventStoreDB in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Event sourcing
- EventStoreDB/KurrentDB
- KurrentDB Python client
- Docker
- CQRS projections
- Catch-up subscriptions

## Sources Consulted
- KurrentDB Python client getting started: https://docs.kurrent.io/clients/python/
- KurrentDB Python appending events documentation: https://docs.kurrent.io/clients/python/v1.0/appending-events
- KurrentDB Python reading events documentation: https://docs.kurrent.io/clients/python/v1.0/reading-events
- KurrentDB/EventStoreDB Docker installation documentation: https://docs.kurrent.io/server/v23.10/quick-start/installation
- KurrentDB database configuration documentation: https://docs.kurrent.io/server/v26.0/configuration/db-config
- kurrentdbclient package/API inspection for version 1.3.3

## Issues Found
- The post used the older `esdbclient` package and `EventStoreDBClient` imports. Updated the installation command, imports, type hints, client class, and connection string to the current official `kurrentdbclient` package and `KurrentDBClient` API.
- The Docker command used EventStoreDB environment variables with the older image and persisted data to `/var/lib/eventstore`. Updated it to the current KurrentDB Docker image/flags and the current Linux data path `/var/lib/kurrentdb`.
- The subscription example was labeled as a persistent subscription while using `subscribe_to_all()`, which is a catch-up subscription API. Updated the comments and class docstring to call it a catch-up subscription.
- The `subscribe_to_all()` stream prefix filter was incomplete. Added `filter_by_stream_name=True` and `filter_by_prefix=True` so `filter_include=['order-']` filters stream names by prefix with the current Python client API.
- The repository swallowed all exceptions when streams were missing. Changed the examples to catch `NotFoundError`, the documented exception for nonexistent streams.
- The stored `NewEvent` objects did not use the domain event ID. Added `id=event.event_id` so EventStoreDB/KurrentDB idempotent append behavior uses the domain event identifier.
- `OrderItemRemoved` did not include enough data for projections to update totals correctly. Added `quantity` and `unit_price` to the removal event, emitted those values from the aggregate, and updated the projection to subtract item count and total amount.

## Review Notes
The Python code fences were syntax-checked with Python 3. The examples still assume a tutorial-style package layout and a running local KurrentDB/EventStoreDB-compatible server; no live database integration test was run.
