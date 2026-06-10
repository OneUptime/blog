# Validation Summary: How to Implement Span Naming Conventions

## Status
validated

## Post Type
Guide / Best-practice tutorial — instructive piece on designing and enforcing span naming conventions in OpenTelemetry-based distributed tracing systems.

## Technologies Covered
- OpenTelemetry (`@opentelemetry/api`) JavaScript/TypeScript SDK
- HTTP server/client tracing (Express middleware, `fetch` wrapper)
- Database tracing (PostgreSQL, MongoDB, Redis, Elasticsearch examples)
- Messaging tracing (Kafka, RabbitMQ, AWS SQS examples)
- gRPC tracing (`@grpc/grpc-js` style client/server interceptors)
- OpenTelemetry semantic conventions (HTTP, database, messaging, RPC)
- TypeScript

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry JavaScript API reference (`@opentelemetry/api`) for `Tracer.startSpan`, `SpanKind`, `Span.setAttribute`, `Span.setStatus`, `Span.recordException`, `Span.updateName`, `propagation.inject/extract`, `context.with`, `context.active`, `trace.setSpan`.

## Issues Found
No technical errors that prevent the code from running or that would mislead a reader on the OpenTelemetry SDK surface. All API calls (`tracer.startSpan`, `SpanKind.{SERVER,CLIENT,PRODUCER,CONSUMER,INTERNAL}`, `SpanStatusCode.ERROR`, `span.setAttribute`, `span.setStatus`, `span.recordException`, `span.updateName`, `span.end`, `propagation.inject`, `propagation.extract`, `context.with`, `context.active`, `trace.setSpan`) are syntactically correct and use current, non-deprecated APIs as published in `@opentelemetry/api`.

No edits were applied to the post.

## Review Notes
The post is functionally correct, but its presented "conventions" diverge from the latest stable OpenTelemetry semantic conventions in three places. The author presents these as a pragmatic, internally consistent set of patterns for a team to adopt, and they are widely used in production (and historically by several auto-instrumentation libraries). Code following them will work correctly — spans will simply be named differently from what current OTel auto-instrumentation emits. Worth noting in case a future revision wants to bring them into strict alignment:

1. **HTTP span names** — Current OTel spec is `{method} {target}` (e.g., `GET /users/{id}`), with no `HTTP` prefix. The post uses `HTTP {method} {route}` throughout (e.g., `HTTP GET /api/orders`). Per the spec, the `HTTP` literal is only used as a fallback when the method is non-standard (`_OTHER`).
2. **Database span names** — Current OTel spec recommends `{db.operation.name} {target}` (e.g., `SELECT users`). The post uses `{db.system}.{operation} {target}` (e.g., `postgresql.query users SELECT`), which places the system first and the operation last.
3. **Messaging span names** — Current OTel spec is `{messaging.operation.name} {destination}` (e.g., `publish orders`). The post reverses the order to `{destination} {operation}` (e.g., `orders publish`).
4. **gRPC span names** — Match the OTel spec correctly (`{package}.{service}/{method}`, e.g., `orders.v1.OrderService/CreateOrder`).

Additional minor observations (not errors):

- Several attribute names are from the older (now superseded) OTel HTTP/database/messaging conventions: `http.method`, `http.url`, `http.host`, `http.user_agent`, `http.status_code`, `db.system`, `db.operation`, `db.sql.table`, `db.statement`, `messaging.destination`, `messaging.destination_kind`, `net.peer.name`, `net.peer.port`, `net.peer.ip`. The stable conventions now use namespaced replacements such as `http.request.method`, `url.full`, `server.address`, `user_agent.original`, `http.response.status_code`, `db.system.name`, `db.operation.name`, `db.collection.name`, `db.query.text`, `messaging.destination.name`, `messaging.operation.type`, `network.peer.address`. The legacy names still work but are flagged for eventual removal.
- The Express server middleware sample in Section 4 reads `req.route?.path`, which is generally `undefined` for middleware mounted with `app.use` because route matching happens after the middleware chain runs. The post acknowledges this by demonstrating `span.updateName(...)` inside the route handler in Section 11, so the overall pattern is sound.
- In Section 6 (`consumeMessage`), the inner `processSpan` lacks its own try/catch around `handleMessage`; an exception is recorded on the outer `receiveSpan` rather than the `processSpan`. This is a minor logical asymmetry rather than a correctness bug.
- Several illustrative snippets (gRPC interceptors, the Kafka consumer) omit imports for `InterceptingCall`, `context`, and `propagation` to keep the focus on naming. Readers should infer the required imports from the working examples earlier in the post.
- Custom attributes like `messaging.message.payload_size_bytes`, `db.query.duration_ms`, `db.rows_affected`, `db.statement.params.count`, `db.redis.key_pattern`, and `cache.key_pattern` are not part of the OTel spec but are valid custom attributes and clearly labelled as such by context.
