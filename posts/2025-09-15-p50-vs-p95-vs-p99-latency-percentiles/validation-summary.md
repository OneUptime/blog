# Validation Summary: P50 vs P95 vs P99 Latency Explained: What Each Percentile Tells You

## Status
validated

## Post Type
Guide / Conceptual explainer with a code example (latency percentiles for SLOs and observability)

## Technologies Covered
- Latency percentiles (P50, P95, P99, P99.9) and SLO concepts
- OpenTelemetry JS Metrics SDK (`@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/api`)
- Histogram aggregation techniques (HDR Histograms, t-digest, OTel explicit-bucket histograms)
- TypeScript / Node.js (`performance.now()`)

## Sources Consulted
- OpenTelemetry JS v2.0.0 release notes — https://github.com/open-telemetry/opentelemetry-js/releases/tag/v2.0.0
- opentelemetry-js-contrib issue #2646 (migrate from deprecated `addMetricReader` to `MeterProvider` constructor `readers` option) — https://github.com/open-telemetry/opentelemetry-js-contrib/issues/2646
- `@opentelemetry/sdk-metrics` API docs — https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-metrics.html
- OpenTelemetry Metrics SDK spec — https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- Independent recomputation of the worked example's average and percentiles (Python)

## Issues Found
- **Incorrect worked-example arithmetic (fixed).** The "10,000 requests" example claimed an average of ~118 ms and a P99 of ~600 ms, but the stated request counts (9,400 @ 50 ms / 500 @ 120 ms / 90 @ 600 ms / 10 @ 8,000 ms) actually produce an average of **66.4 ms** and a **P99 of 120 ms** (only 100 requests, the worst 1%, sit at or above 600 ms, so the 9,900th-ranked value is still 120 ms). This contradicted both the stated outputs and the post's own `floor(0.95 * N)` percentile definition, and it broke the pedagogical point that P99 exposes the tail. I adjusted the input distribution to **9,000 @ 50 ms / 600 @ 120 ms / 350 @ 600 ms / 50 @ 8,000 ms**, which yields a self-consistent average ≈ **113 ms**, P50 = 50 ms, P95 = 120 ms, and P99 = 600 ms — matching the author's intended narrative. Updated the average line and the P95 estimate ("around 120 ms") accordingly. Latency band values (50/120/600/8,000 ms) were kept unchanged.

## Review Notes
- The OpenTelemetry TypeScript example is correct for SDK 2.0: imports are accurate, and passing readers via the `MeterProvider({ readers: [...] })` constructor (with the comment noting `addMetricReader` was removed in 2.0) matches the official 2.0 API. `createHistogram`, `PeriodicExportingMetricReader`, `OTLPMetricExporter`, and `diag`/`DiagConsoleLogger` usage are all valid.
- Minor (not changed, not an error): the OTel HTTP server semantic convention `http.server.request.duration` is canonically defined with unit seconds (`s`); the example records milliseconds (`ms`). This is internally consistent within the example and fine for a teaching snippet, but readers adopting the stable semconv may prefer seconds.
- The `floor(0.95 * N)` "(1-index aware)" percentile definition is a reasonable nearest-rank approximation; it agrees with the corrected example.
- Conceptual claims (averages mislead on long-tailed distributions, histogram-based percentile aggregation vs. averaging pre-aggregated percentiles, P99 hardness causes, SLO/error-budget framing, alerting philosophy) are all technically sound. Internal OneUptime blog links left as-is.
