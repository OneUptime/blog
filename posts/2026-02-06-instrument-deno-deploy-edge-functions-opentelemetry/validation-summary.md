# Validation Summary: How to Instrument Deno Deploy Edge Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno
- Deno Deploy
- Deno KV
- OpenTelemetry tracing, metrics, and context propagation
- OTLP over HTTP/protobuf
- OpenTelemetry Collector

## Sources Consulted
- Deno OpenTelemetry documentation: https://docs.deno.com/runtime/fundamentals/open_telemetry/
- Deno Deploy observability documentation: https://docs.deno.com/deploy/reference/observability/
- Deno API reference for Deno.openKv: https://docs.deno.com/api/deno/~/Deno.openKv
- Deno API reference for Deno.AtomicOperation: https://docs.deno.com/api/deno/~/Deno.AtomicOperation
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The post used unsupported `new Deno.opentelemetry.Tracer(...)` and `new Deno.opentelemetry.Meter(...)` constructors. Updated the examples to use the current official `npm:@opentelemetry/api@1` APIs: `trace.getTracer(...)` and `metrics.getMeter(...)`.
- Several custom spans were ended manually only on the happy path. Updated nested and KV examples to use `finally` blocks so spans are ended when operations throw.
- Error handling recorded exceptions without setting OpenTelemetry span status. Updated examples to set `SpanStatusCode.ERROR` when recording errors, consistent with OpenTelemetry guidance.
- The Deno KV atomic wrapper returned only `Deno.KvCommitResult`, but `AtomicOperation.commit()` can also return `Deno.KvCommitError` for failed checks. Updated the return type to `Promise<Deno.KvCommitResult | Deno.KvCommitError>`.
- The manual propagation example constructed a `traceparent` header by hand. Replaced it with `propagation.inject(context.active(), headers)` and kept the custom legacy correlation header, avoiding hard-coded trace flags and misleading parent-span handling.
- The metrics catch block accessed `error.constructor.name` directly on a TypeScript `unknown` catch value. Updated it to safely derive an error type.

## Review Notes
Could not run Deno type checking locally because `deno` is not installed in the review environment. The reviewed APIs and behavior were verified against current official documentation.
