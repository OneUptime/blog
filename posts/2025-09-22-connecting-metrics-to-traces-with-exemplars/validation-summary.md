# Validation Summary: Connecting Metrics ↔ Traces with Exemplars in OpenTelemetry

## Status
validated

## Post Type
Guide / Tutorial (hands-on conceptual guide with code examples)

## Technologies Covered
- OpenTelemetry (metrics + traces)
- Exemplars (metric → trace correlation)
- Histograms and the `TraceBased` exemplar filter
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-metrics`)
- OpenTelemetry Collector
- OTLP (OpenTelemetry Protocol)

## Sources Consulted
- OpenTelemetry Metrics SDK specification (ExemplarFilter / ExemplarReservoir, default `TraceBased`): https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry exemplars guidance (trace-based filter attaches trace_id/span_id for measurements recorded within a sampled span): https://opentelemetry.io/docs/languages/dotnet/metrics/exemplars/
- OpenTelemetry JavaScript Client repo (sdk-metrics API surface): https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry JavaScript docs: https://opentelemetry.io/docs/languages/js/
- Go exemplar package docs (TraceBased filter semantics — span/trace ID empty when no sampled span): https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric/exemplar

## Issues Found
No technical issues found.

- The core claim — that recording a measurement within an active (sampled) span context causes the SDK to automatically attach a trace_id/span_id exemplar — is accurate and matches the spec's default `TraceBased` exemplar filter behavior.
- The Node.js (TypeScript) example uses current, non-deprecated APIs: `new MeterProvider()`, `meterProvider.getMeter('web')`, `meter.createHistogram(name, { description, unit })`, `trace.getTracer()`, `context.with(trace.setSpan(context.active(), span), ...)`, and `histogram.record(value)`. All are syntactically correct.
- The pseudocode pattern (start span → record histogram within context → end span) is correct.
- Guidance on histograms being the natural instrument for bucket exemplars, OTLP carrying exemplars end-to-end, and Collector preservation is accurate.
- The Mermaid diagram is valid and correctly represents the metrics/traces flow through the Collector to a backend.

## Review Notes
- Precision caveat (not an error): exemplars are attached under the default `TraceBased` filter only when the active span is *sampled*. The post says "recorded while span is active → exemplar attached," which is a reasonable simplification; an unsampled span yields empty trace/span IDs. Worth keeping in mind but acceptable for a hands-on guide.
- The bullet "counters/gauges don't surface bucket exemplars" is correct in the sense that only histograms have buckets. Per the spec, counters can technically carry exemplars too, but they lack the bucket UX the post focuses on; the framing is fine for the latency/size correlation use case.
- The Node.js snippet is illustrative and omits wiring a `MetricReader`/OTLP exporter to the `MeterProvider` (so it would not actually export as-is). This is intentional for brevity — the post explicitly defers exporter setup to the "Notes" and Collector sections — so it is not flagged as an error.
