# Validation Summary: How to Trace GraphQL Subscription WebSocket Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API
- GraphQL subscriptions
- GraphQL over WebSocket protocol
- `graphql-ws`
- `ws`
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Meter API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- `graphql-ws` `useServer` documentation: https://the-guild.dev/graphql/ws/docs/use/ws/functions/useServer
- `graphql-ws` `ServerOptions` callback documentation: https://the-guild.dev/graphql/ws/docs/server/interfaces/ServerOptions
- `graphql-ws` message type documentation: https://the-guild.dev/graphql/ws/docs/common/enumerations/MessageType
- `ws` `WebSocketServer` documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- npm package metadata for `graphql-ws` latest exports, checked with `npm view graphql-ws@latest version exports --json`
- npm package metadata for `@opentelemetry/api` latest version, checked with `npm view @opentelemetry/api@latest version --json`
- npm package metadata for `ws` latest version, checked with `npm view ws@latest version --json`

## Issues Found
- The `graphql-ws` import path used the older `graphql-ws/lib/use/ws` path. Current `graphql-ws` package exports expose `useServer` at `graphql-ws/use/ws`, so the import was updated.
- The `graphql-ws` callback signatures matched older examples that passed a message object. Current `ServerOptions` documents `onSubscribe(ctx, id, payload)`, `onNext(ctx, id, payload, args, result)`, and `onComplete(ctx, id, payload)`, so the integration snippet was updated to use `id` and `payload`.
- The OpenTelemetry tracing import included `SpanStatusCode` even though the code did not use it. The unused import was removed, and the stored span/context fields were typed with `Span` and `Context` instead of `any`.
- The duration metric snippet referenced `startTime` and `operationName` without showing where they came from. The subscription context now stores those values, and the metrics snippet records duration from the stored subscription context.
- The text said the span structure should avoid a single hours-long span, but the recommended structure intentionally includes a lifecycle parent span that can remain open for the subscription duration. The wording was changed to clarify that the problem is relying only on one long span without child event spans.
- The trace interpretation text said the parent span duration shows how long subscribers stay connected. Since the parent span tracks the subscription lifecycle rather than the WebSocket connection itself, this was changed to say it shows how long subscriptions stay active.

## Review Notes
The span and metric APIs used in the post are current as of `@opentelemetry/api` 1.9.1. The `ws` server example is valid because `WebSocketServer` supports `port` and `path`, with `path` accepting only matching connections. The `graphql-ws` message names `subscribe`, `next`, and `complete` are consistent with the documented protocol message types.
