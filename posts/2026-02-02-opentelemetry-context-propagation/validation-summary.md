# Validation Summary: How to Use OpenTelemetry Context Propagation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK / API (JavaScript, Python, Go)
- W3C Trace Context (`traceparent` / `tracestate`)
- B3 propagation (Zipkin), Jaeger, AWS X-Ray propagators
- `@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/core`, `@opentelemetry/propagator-b3`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`
- `opentelemetry-sdk` / `opentelemetry-api` Python with `TraceContextTextMapPropagator`, `B3MultiFormat`, `CompositePropagator`
- HTTP (`axios`, Express, Python `requests`)
- gRPC (Python client/server interceptors)
- Kafka (`kafkajs`)
- RabbitMQ (`pika`)
- Celery (Python background tasks)
- BullMQ (Node.js queues)
- `go.opentelemetry.io/otel`

## Sources Consulted
- OpenTelemetry JavaScript API source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/index.ts
- OpenTelemetry JS API `trace` namespace (TraceAPI): confirmed `SpanKind` and `SpanStatusCode` are NOT properties of the `trace` object, they are top-level exports
- `@opentelemetry/sdk-node` `NodeSDKConfiguration` type definition (confirmed `serviceName` is a valid direct option)
- OpenTelemetry Python `opentelemetry.propagate` and `opentelemetry.trace.propagation.tracecontext` modules
- OpenTelemetry Python Celery instrumentation source (`opentelemetry-instrumentation-celery`) — uses signals, not decorators
- W3C Trace Context spec: https://www.w3.org/TR/trace-context/
- Go OpenTelemetry: `go.opentelemetry.io/otel/trace` package (confirmed `SpanKindClient`/`SpanKindServer` are package-level constants, so `trace.SpanKindClient` IS correct in Go)

## Issues Found
1. **JavaScript: `trace.SpanKind.X` and `trace.SpanStatusCode.X` are not valid.** In `@opentelemetry/api`, the `trace` namespace object (`TraceAPI`) only exposes tracer/span helpers (`getTracer`, `setSpan`, `getActiveSpan`, etc.). `SpanKind` and `SpanStatusCode` are separate top-level exports. The post used `trace.SpanKind.SERVER`, `trace.SpanKind.PRODUCER`, `trace.SpanKind.CONSUMER`, and `trace.SpanStatusCode.ERROR`, all of which evaluate to `undefined` at runtime. Fixed by adding `SpanKind` / `SpanStatusCode` to the destructured imports in each affected JS snippet (`http-client.js`, `http-server.js`, `kafka-producer.js`, `kafka-consumer.js`, `bullmq-producer.js`, `bullmq-worker.js`) and replacing all `trace.SpanKind.X` / `trace.SpanStatusCode.X` with the direct enum references.

2. **Python Celery decorator: `wrapper.request` would raise `AttributeError`.** The `traced_task` decorator tried to read `wrapper.request` from inside the wrapper. `wrapper` is a plain Python function with no `.request` attribute; Celery's `request` lives on the bound task instance (which is passed as the first argument when `@app.task(bind=True)` is used). Fixed by changing the wrapper signature to `def wrapper(self, *args, **kwargs)` and reading `self.request.headers` / `self.request.id`, then forwarding `self` to the wrapped function. Added a note that the outer `@app.task` must be declared with `bind=True`. Removed the trailing `wrapper.__wrapped__ = func` assignment, since `@wraps(func)` already sets that.

## Review Notes
- Go-side `trace.SpanKindClient` / `trace.SpanKindServer` references were left unchanged — in `go.opentelemetry.io/otel/trace` these are package-level constants accessed through the `trace` import alias, which is correct.
- The custom Python gRPC server interceptor pattern in section 5 is a simplified educational example. In production, prefer the official `opentelemetry-instrumentation-grpc` package; the manual `intercept_service` / `unary_unary_rpc_method_handler` flow shown can be brittle for streaming RPCs and metadata mutation edge cases, but it is workable for unary calls as illustrated.
- The Celery section's decorator approach is a working educational example after the fix, but the OpenTelemetry-recommended approach is `opentelemetry-instrumentation-celery`, which hooks Celery's `task_prerun` / `task_postrun` signals instead. Worth a footnote in a future revision.
- `messaging.destination` is the older semantic-convention attribute; the current OTel semantic conventions use `messaging.destination.name`. Both are still widely supported, so this was not changed, but it could be modernized in a future pass.
- Trace Flags description as "Sampling decisions and feature flags" is slightly loose — per W3C Trace Context, the 8-bit flags field currently only standardizes the sampled bit (and a random bit in newer drafts). Not factually wrong enough to warrant a code-impacting edit.
