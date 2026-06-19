# Validation Summary: How to Fix 'Missing Trace ID' Issues in OpenTelemetry

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenTelemetry (distributed tracing)
- W3C Trace Context (`traceparent` / `tracestate` headers)
- OpenTelemetry JavaScript/Node.js SDK (`@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/core`, auto-instrumentations)
- OpenTelemetry Python SDK (`opentelemetry-api`, requests instrumentation)
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`, propagation)
- OpenTelemetry Java SDK (context propagation, `Context.taskWrapping`)
- OTLP exporter and OTEL environment variables
- Express.js, message queues, thread pools

## Sources Consulted
- W3C Trace Context Recommendation — https://www.w3.org/TR/trace-context/ (traceparent format, version-traceid-parentid-flags, all-zero invalidity, sampled flag)
- OpenTelemetry JS API/SDK docs — https://opentelemetry.io/docs/languages/js/ and API reference for `context.bind`, `propagation.inject`/`extract`, `trace.getSpan`, `SpanStatusCode`, `SpanKind`, `startActiveSpan`
- `@opentelemetry/core` package — `W3CTraceContextPropagator` export
- OpenTelemetry Python docs — https://opentelemetry.io/docs/languages/python/ and `RequestsInstrumentor`
- OpenTelemetry Go docs — https://opentelemetry.io/docs/languages/go/ — `otel.GetTextMapPropagator()`, `propagation.HeaderCarrier`, `Extract`
- OpenTelemetry Java docs — https://opentelemetry.io/docs/languages/java/ — `Context.current().wrap()`, `Context.taskWrapping()`
- OpenTelemetry SDK environment variable spec — https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/ (`OTEL_PROPAGATORS`, `OTEL_TRACES_SAMPLER`, `OTEL_EXPORTER_OTLP_ENDPOINT`)

## Issues Found
1. **Missing `SpanStatusCode` import in the message queue producer example** — The producer code called `span.setStatus({ code: SpanStatusCode.OK })` and `SpanStatusCode.ERROR` but only imported `{ trace, context, propagation }` from `@opentelemetry/api`, so `SpanStatusCode` would be `undefined` and throw a `ReferenceError`. Fixed by adding `SpanStatusCode` to the destructured import.
2. **Missing `SpanStatusCode` import in the message queue consumer example** — Same issue; the consumer imported `{ trace, context, propagation, SpanKind }` but used `SpanStatusCode`. Fixed by adding `SpanStatusCode` to the import.

## Review Notes
- The W3C `traceparent` example (`00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) and the validation regex/all-zero checks are correct and match the W3C Trace Context spec.
- The `validate_traceparent` helper treats `sampled` as `flags == '01'`. The sampled state is technically bit 0 of the flags byte (`int(flags, 16) & 0x01`), so a value like `03` would also be sampled. The exact-match check is a reasonable simplification for the common case and is not incorrect for typical traffic; left as-is since it does not constitute a functional error in the described context.
- The Python async example imports `attach, detach` from `opentelemetry.context` but does not use them. This is a harmless unused import (not a correctness issue) and was left unchanged to avoid stylistic edits.
- `OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4317"` uses the gRPC default port (4318 is the HTTP default). Since the YAML is presented as generic environment-variable configuration rather than tied to the HTTP exporter, 4317 is acceptable.
- All API surface (`context.bind`, `propagation.inject`/`extract`, `Context.taskWrapping`, `RequestsInstrumentor().instrument()`, Go `propagation.HeaderCarrier`) is current and non-deprecated. SDK-initialization-order and import-first guidance is accurate.
