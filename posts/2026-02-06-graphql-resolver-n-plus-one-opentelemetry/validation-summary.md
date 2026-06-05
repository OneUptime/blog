# Validation Summary: How to Monitor GraphQL Resolver Performance and N+1 Query Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- Apollo Server
- OpenTelemetry JavaScript API
- DataLoader
- TypeScript
- PostgreSQL-style parameterized queries

## Sources Consulted
- Apollo Server custom plugin documentation: https://www.apollographql.com/docs/apollo-server/integrations/plugins
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- DataLoader official documentation: https://github.com/graphql/dataloader

## Issues Found
- Apollo Server plugin lifecycle hooks were shown as synchronous for `requestDidStart` and `executionDidStart`. Updated them to `async` to match Apollo Server's current plugin lifecycle guidance.
- The database call counting snippet imported an unused `context` symbol, stored custom state on the span object, and could throw when there was no active span. Replaced this with a `WeakMap<Span, number>` and an explicit no-active-span guard.
- The DataLoader tracing snippet ended the span only on the success path. Wrapped the batch body in `try`/`finally` so the span is ended even if the database query fails.
- The DataLoader snippet assumed `db.query` returned an array directly. Updated it to read `rows` from the query result, matching common PostgreSQL client behavior.
- The alerting snippet referenced an undefined `childCount` variable. Replaced it with a field-key counter example and adjusted the surrounding wording from child spans to resolver spans.

## Review Notes
The post is technically sound after the fixes. The examples are still intentionally illustrative and assume the application has already initialized an OpenTelemetry SDK/exporter and has a request-scoped DataLoader setup.
