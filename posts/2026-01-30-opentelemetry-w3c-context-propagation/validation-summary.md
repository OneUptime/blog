# Validation Summary: How to Build OpenTelemetry W3C Context Propagation

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- W3C Trace Context specification (traceparent / tracestate headers)
- OpenTelemetry JS SDK (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/core`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- OpenTelemetry Python SDK (propagation API, Flask)
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/propagation`)
- Custom TextMapPropagator / CompositePropagator
- Express middleware patterns
- Nginx header pass-through

## Sources Consulted
- W3C Trace Context (Level 1) Recommendation — https://www.w3.org/TR/trace-context/ (verified header format, version `00`, 32-hex trace-id, 16-hex parent-span-id, 8-bit trace-flags, 32 list-member tracestate cap, 512-character combined-header limit, recommendation date 6 Feb 2020)
- OpenTelemetry JS SDK package registry — verified that `@opentelemetry/exporter-trace-otlp-http` is the correct trace OTLP/HTTP exporter package (no `@opentelemetry/exporter-otlp-http` exists)
- OpenTelemetry JS API reference — `SpanKind` enum values (INTERNAL=0, SERVER=1, CLIENT=2, PRODUCER=3, CONSUMER=4), `propagation.inject` / `propagation.extract`, `context.with`, `trace.setSpan`, `trace.setSpanContext`
- OpenTelemetry JS Core — `W3CTraceContextPropagator`, `CompositePropagator` exports
- OpenTelemetry Python docs — `opentelemetry.propagate.extract`, `tracer.start_as_current_span(context=...)`
- OpenTelemetry Go docs — `otel.GetTextMapPropagator().Extract`, `propagation.HeaderCarrier`

## Issues Found
1. **Incorrect OTLP exporter package name.** The post originally referenced `@opentelemetry/exporter-otlp-http`, which is not a published OpenTelemetry JS package. The correct package for OTLP/HTTP trace export is `@opentelemetry/exporter-trace-otlp-http`. Fixed in both the `npm install` block in Section 5 and the corresponding `import` statement in `telemetry.ts`.

## Review Notes
- The Resource construction pattern (`new Resource({...})`) used in Section 5 works under `@opentelemetry/resources` 1.x. Newer 2.x releases prefer the `resourceFromAttributes()` factory; the current snippet remains valid for the broadly-deployed 1.x line, so no change was made.
- The tracestate rules state "Total header size should not exceed 512 bytes." The W3C spec phrases this as 512 characters; since tracestate is ASCII, the practical effect is identical. Not flagged as an error.
- The tracestate key-character description ("lowercase, alphanumeric, with optional underscores") is incomplete — the spec also permits `-`, `*`, and `/` — but the statement is not factually wrong for the most common case, so it was left as-is to avoid scope creep beyond fixing errors.
- The unused `propagate` import in the Python example is a stylistic nit, not a technical error.
- All trace ID / span ID hex lengths, the version byte (`00`), the sampled flag (`01`), and the W3C Recommendation date (2020) are correct. SpanKind.SERVER = 1 is correct. The custom propagator implementation, composite propagator usage, and cross-language extraction examples all align with current OpenTelemetry APIs.
