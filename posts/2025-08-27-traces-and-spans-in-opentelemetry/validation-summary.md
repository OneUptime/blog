# Validation Summary: OpenTelemetry Traces & Spans Explained (Node.js/TypeScript Examples)

## Status
validated

## Post Type
Tutorial / Guide (conceptual explanation + Node.js/TypeScript implementation patterns)

## Technologies Covered
- OpenTelemetry (distributed tracing concepts: traces, spans, span kinds, context propagation, sampling)
- OpenTelemetry JavaScript/TypeScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, OTLP HTTP trace exporter, samplers)
- OpenTelemetry Collector (tail sampling processor)
- Node.js / TypeScript
- Express
- W3C Trace Context (`traceparent` / `tracestate`)

## Sources Consulted
- OpenTelemetry JS Exporters docs — https://opentelemetry.io/docs/languages/js/exporters/
- `@opentelemetry/exporter-trace-otlp-http` (npm) — https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http
- OpenTelemetry JS Resources docs — https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/semantic-conventions` (npm) — https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry Collector tail sampling processor README — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Sampling concepts — https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
1. **Incorrect/deprecated OTLP exporter package name.** The post installed and imported `@opentelemetry/exporter-otlp-http`, which is the old legacy package name (deprecated and unmaintained since ~2022). The current package that exports `OTLPTraceExporter` for HTTP is `@opentelemetry/exporter-trace-otlp-http`. Using the old name would either fail to resolve or pull a stale, non-functional package. Fixed both occurrences:
   - The `npm install` dependency list.
   - The `import { OTLPTraceExporter } from '...'` line in `telemetry.ts`.

## Review Notes
- `new Resource({ ... })` with `SemanticResourceAttributes.SERVICE_NAME` (etc.) is technically deprecated in recent `@opentelemetry/resources` / `@opentelemetry/semantic-conventions` releases in favor of `resourceFromAttributes({ [ATTR_SERVICE_NAME]: ... })`. It still functions in the SDK versions current at the time of writing, so it was left as-is, but readers on the newest SDK may want to migrate to the `resourceFromAttributes` + `ATTR_*` constants API.
- The Collector tail-sampling YAML is accurate: `decision_wait`, `num_traces`, and the `status_code` (`status_codes: [ERROR]`), `latency` (`threshold_ms`), and `probabilistic` (`sampling_percentage`) policies all match the contrib tailsamplingprocessor configuration.
- Span-kind guidance, events vs. links vs. logs distinctions, context propagation via `context.with` / W3C `traceparent`, `startActiveSpan`, `propagation.inject`, and `isSpanContextValid` usage are all consistent with the official `@opentelemetry/api` semantics.
- Conceptual content (anatomy of a span, naming best practices, anti-patterns, sampling trade-offs) is accurate.
