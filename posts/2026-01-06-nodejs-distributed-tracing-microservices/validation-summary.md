# Validation Summary: How to Implement Distributed Tracing in Node.js Microservices

## Status
validated

## Post Type
Tutorial / Guide — a hands-on walkthrough of implementing OpenTelemetry-based distributed tracing across Node.js microservices, covering context propagation over HTTP, gRPC, message queues (RabbitMQ/Kafka), and background jobs.

## Technologies Covered
- Node.js
- OpenTelemetry JS (`@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/core`, `@opentelemetry/sdk-trace-base`)
- `@opentelemetry/auto-instrumentations-node`
- OTLP HTTP trace exporter
- W3C Trace Context propagation standard
- Express
- gRPC (`@grpc/grpc-js`, `@grpc/proto-loader`)
- RabbitMQ (`amqplib`)
- Apache Kafka (`kafkajs`)

## Sources Consulted
- OpenTelemetry JS Resources docs — https://opentelemetry.io/docs/languages/js/resources/ (confirmed `resourceFromAttributes()` + `ATTR_SERVICE_NAME`/`ATTR_SERVICE_VERSION` is the current API; `new Resource()` removed in `@opentelemetry/resources` 2.0)
- OpenTelemetry JS semantic-conventions package docs / npm — https://www.npmjs.com/package/@opentelemetry/semantic-conventions (confirmed `SemanticResourceAttributes` deprecated as of 1.26.0 in favor of individual `ATTR_*` constants)
- `@opentelemetry/resources` API reference — https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- `@opentelemetry/sdk-node` NodeSDKConfiguration reference — https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- W3C Trace Context specification (traceparent format: version-traceid(32 hex)-parentid(16 hex)-flags)

## Issues Found
1. **Removed `Resource` API in `tracing.js`.** The post used `new Resource({ ... })` with `SemanticResourceAttributes.*` constants. The `Resource` class constructor was removed in `@opentelemetry/resources` 2.0 (the version line current as of this post's January 2026 date), and `SemanticResourceAttributes` was deprecated in semantic-conventions 1.26.0. Replaced with `resourceFromAttributes({ ... })` and the current `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants, plus the current `deployment.environment.name` attribute key. Imports updated accordingly.
2. **Missing `SpanStatusCode` import in the gRPC client example.** The snippet destructured only `{ trace, propagation, context }` from `@opentelemetry/api` but then referenced `SpanStatusCode.ERROR` / `SpanStatusCode.OK`, which would throw a `ReferenceError`. Added `SpanStatusCode` to the import.
3. **Missing `ROOT_CONTEXT` import in the Kafka example.** The Kafka producer/consumer block imported `{ trace, context, propagation, SpanStatusCode }` but the consumer used `propagation.extract(ROOT_CONTEXT, headers)`. Added `ROOT_CONTEXT` to the import.
4. **Missing `SpanStatusCode` import in the async-job example.** The snippet imported `{ trace, context, propagation, ROOT_CONTEXT }` but used `SpanStatusCode.OK` / `SpanStatusCode.ERROR`. Added `SpanStatusCode` to the import.

## Review Notes
- The W3C `traceparent` breakdown in the diagram is accurate (version `00`, 32-hex-char trace ID, 16-hex-char parent/span ID, sampled flag `01`).
- The core API usage is otherwise correct: `trace.getActiveSpan()`, `tracer.startActiveSpan()`, `tracer.startSpan()`, `propagation.inject()/extract()`, `context.with()`, and the custom gRPC metadata setter (`carrier.set(key, value)`) are all valid current APIs.
- Native `fetch` (undici) in the gateway example is propagated by `@opentelemetry/instrumentation-undici`, which is bundled in `@opentelemetry/auto-instrumentations-node`, so the "context propagated automatically" claim holds for current versions.
- The messaging attribute keys (`messaging.destination`, `messaging.operation`) reflect older messaging semantic conventions; the stabilized conventions now use `messaging.destination.name` and `messaging.operation.type`/`messaging.operation.name`. These were left as-is since they are illustrative custom attributes and not incorrect code, but could be modernized in a future revision.
- `db.rows_affected` is a custom (non-standard) attribute name; harmless but not a defined semantic convention.
- The `NodeSDK` `spanProcessor` (singular) option still functions but is superseded by the `spanProcessors` array option in current versions; left unchanged as it remains functional.
