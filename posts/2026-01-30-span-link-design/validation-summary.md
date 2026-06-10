# Validation Summary: How to Implement Span Link Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (specification and concept of span links)
- OpenTelemetry Python SDK (`opentelemetry-api`, `opentelemetry-sdk`)
- OpenTelemetry JavaScript / TypeScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`)
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`, `go.opentelemetry.io/otel/attribute`, `go.opentelemetry.io/otel/trace`)
- W3C Trace Context
- Jaeger (querying)
- Grafana Tempo / TraceQL (querying)

## Sources Consulted
- OpenTelemetry Specification on Span Links: https://opentelemetry.io/docs/specs/otel/trace/api/#specifying-links
- OpenTelemetry Concepts — Traces (Span links): https://opentelemetry.io/docs/concepts/signals/traces/#span-links
- OpenTelemetry JS API `SpanStatusCode` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/status.ts
- OpenTelemetry Python `SpanContext` source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/span.py
- OpenTelemetry Go `trace.Link` and `WithLinks`: https://pkg.go.dev/go.opentelemetry.io/otel/trace#Link
- W3C Trace Context spec: https://www.w3.org/TR/trace-context/

## Issues Found
1. **Incorrect `SpanStatusCode` numeric value in the TypeScript example.**
   - Original: `span.setStatus({ code: 0 }); // OK status`
   - Problem: In `@opentelemetry/api`, `SpanStatusCode.UNSET = 0`, `SpanStatusCode.OK = 1`, `SpanStatusCode.ERROR = 2`. Using `code: 0` does **not** set OK — it leaves the status as UNSET (the default), so the inline comment misled readers and the code did not do what the comment claimed.
   - Fix: Changed to `span.setStatus({ code: 1 }); // OK status (SpanStatusCode.OK)` and updated the ERROR-status comment to `// ERROR status (SpanStatusCode.ERROR)` for clarity. The numeric value for ERROR (`2`) was already correct.

## Review Notes
- The Python `SpanContext` example correctly uses keyword arguments (`trace_id`, `span_id`, `is_remote`, `trace_flags`), all of which are valid parameters in `opentelemetry.trace.SpanContext`. `TraceFlags(0x01)` (sampled) is correct.
- The Python `messages.index(message)` call inside the loop is O(n²) and would misbehave if messages contained duplicates; using `enumerate()` would be cleaner. Functional, but a future polish opportunity.
- The TypeScript code uses `provider.addSpanProcessor(...)` which still works but is being phased out in newer SDK versions (v1.30+) in favor of passing `spanProcessors` to the `NodeTracerProvider` constructor. Not incorrect today, but worth modernising in a future revision.
- The Go fan-out example writes to distinct `results[index]` slots from each goroutine, so there is no data race on the slice elements. Looks correct.
- The Jaeger and Grafana Tempo query snippets are illustrative rather than literal — exact link-querying syntax in both backends evolves and depends on version/feature flags. The snippets are clearly framed as examples and would not mislead a reader into a strict copy-paste expectation, so they were left as-is.
- Internal links (OpenTelemetry concepts, W3C Trace Context, OpenTelemetry instrumentation docs) all point at valid, canonical resources.
