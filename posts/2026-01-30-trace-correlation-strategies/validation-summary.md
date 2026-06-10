# Validation Summary: How to Build Trace Correlation Strategies

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/core`, `@opentelemetry/sdk-trace-web`)
- W3C Trace Context (`traceparent`, `tracestate`, `baggage` headers)
- TypeScript / Node.js
- Express.js middleware patterns
- Winston and Pino logging libraries
- Apache Kafka (producer/consumer trace propagation)
- SQL (PostgreSQL-style JSON attribute queries)
- Mermaid diagrams
- Stripe API (idempotency keys, OTLP-unaware third-party integration)

## Sources Consulted
- OpenTelemetry JS API reference: https://open-telemetry.github.io/opentelemetry-js/
- `@opentelemetry/api` source on GitHub: https://github.com/open-telemetry/opentelemetry-js/tree/main/api
- OpenTelemetry exporter package listings on npm (`@opentelemetry/exporter-metrics-otlp-http`)
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry SDK Metrics docs (`MeterProvider` constructor options, exemplar behavior)
- OpenTelemetry API changelog for `Span.addLink` (added in `@opentelemetry/api` 1.9.0)

## Issues Found

1. **Incorrect OTLP metrics exporter package name** (section 3, Implementing Exemplars in OpenTelemetry). The import used `@opentelemetry/exporter-otlp-http`, which is not a published package — the OTLP HTTP exporters are split per-signal. Changed the import to `@opentelemetry/exporter-metrics-otlp-http`, which is the correct package for the `OTLPMetricExporter`.

2. **Invalid `SpanKind` access pattern** (section 6, Correlation ID Gateway). The code used `kind: trace.SpanKind.SERVER`, but `SpanKind` is a top-level export of `@opentelemetry/api`, not a property of the `trace` namespace (which exposes tracer functions like `getTracer`, `getSpan`, `setSpan`). Added `SpanKind` to the imports and changed the reference to `SpanKind.SERVER` so the code actually compiles and resolves to the correct enum value.

3. **Wrong `SpanStatusCode` value for the success path** (Putting It All Together, success branch). The code called `rootSpan.setStatus({ code: 0 })` after a successful checkout, but per the OpenTelemetry API enum `SpanStatusCode.UNSET = 0`, `SpanStatusCode.OK = 1`, `SpanStatusCode.ERROR = 2`. Code `0` would leave the span status unset rather than mark it OK. Changed to `code: 1` to correctly mark the span as OK on success (consistent with the existing `code: 2` used on errors).

## Review Notes
- The W3C Trace Context format breakdown (version byte, 32-char trace ID, 16-char parent span ID, 8-bit trace flags, `01` = sampled) matches the W3C spec exactly.
- `Span.addLink(link)` (used in the correlation gateway and legacy bridge) is available as of `@opentelemetry/api` 1.9.0 — readers on older API versions will need to upgrade or pass `links` via the `startSpan` options instead.
- The `MeterProvider({ readers: [...] })` constructor pattern is correct; `readers` is a supported field on `MeterProviderOptions` alongside `resource` and `views`.
- The middleware example wraps `next` in `context.with`, which only sets the active context for the synchronous portion of `next()`. For deeply async Express handlers, teams typically rely on the auto-instrumentation's context manager (AsyncLocalStorage on Node.js) — the manual pattern shown works, but readers should be aware that long-lived async chains need a proper ContextManager to propagate context across `await` boundaries.
- The Stripe example reuses the OpenTelemetry trace ID as the Stripe `Idempotency-Key`. This is unusual but works — Stripe accepts up to 255 chars and trace IDs are 32 hex chars. Worth noting that retries within the same trace would deduplicate correctly, but distinct user retries (different trace) would not.
- Using `'0000000000000000'` as a fallback span ID for `addLink` is technically the "invalid" span ID per W3C; some SDK implementations may reject the link. Acceptable for an illustrative example.
- The article doesn't pin specific package versions, so future readers should consult the OpenTelemetry JS release notes for the most current APIs.
