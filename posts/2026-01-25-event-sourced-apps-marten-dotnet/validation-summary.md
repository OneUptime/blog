# Validation Summary: How to Build Event-Sourced Apps with Marten in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- ASP.NET Core
- Marten
- PostgreSQL
- Event Sourcing
- CQRS

## Sources Consulted
- Marten Bootstrapping documentation: https://martendb.io/configuration/hostbuilder
- Marten Appending Events documentation: https://martendb.io/events/appending
- Marten Querying Event and Stream Data documentation: https://martendb.io/events/querying
- Marten Projections documentation: https://martendb.io/events/projections/
- Marten Aggregate Projections documentation: https://martendb.io/events/projections/aggregate-projections.html
- Marten Multi-Stream Projections documentation: https://martendb.io/events/projections/multi-stream-projections
- Marten Async Projections Daemon documentation: https://martendb.io/events/projections/async-daemon.html
- Marten CQRS Command Handler Workflow documentation: https://martendb.io/scenarios/command_handler_workflow.html

## Issues Found
- The setup snippet configured only `AccountProjection`, but the post later queried `DailyTransactionReport`. I registered `DailyTransactionProjection` so the reporting read model is actually built.
- The post described async projections but did not enable Marten's async daemon. I added `.AddAsyncDaemon(DaemonMode.Solo)` after registering the async projection, matching Marten's documented requirement for asynchronous projections.
- The `GetAccountAsync` comment said it queried current state without replaying events, but the code used `AggregateStreamAsync`, which performs live aggregation from the stream. I corrected the comment.
- The concurrency example used `FetchStreamStateAsync` plus `Append(accountId, expectedVersion, event)`. Current Marten documentation strongly recommends `FetchForWriting` for CQRS command handlers, and the explicit expected-version append overload has append-mode caveats in Marten 9. I changed the example to use `FetchForWriting`, `stream.AppendOne`, and `ConcurrencyException`.

## Review Notes
The snippets are written as blog examples and omit using directives, package version pins, and full application registration for services/controllers. Those omissions are acceptable for the tutorial format. I could not compile the snippets locally because the `dotnet` CLI is not installed in this environment; API validation was performed against current official Marten documentation.
