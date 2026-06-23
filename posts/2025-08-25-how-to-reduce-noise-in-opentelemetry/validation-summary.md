# Validation Summary: How to reduce noise in OpenTelemetry? Keep What Matters, Drop the Rest.

## Status
validated

## Post Type
Guide / Tutorial (opinionated best-practices guide with code and configuration examples)

## Technologies Covered
- OpenTelemetry (Collector, OTLP, SDK)
- OpenTelemetry Collector processors: `tail_sampling`, `batch`, `attributes`, `filter`, `memory_limiter`
- OpenTelemetry Node.js SDK (`@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-metrics`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/api`)
- OTLP exporters (HTTP)
- Node.js / TypeScript
- Pino logging library
- Express middleware
- Trace sampling (head-based and tail-based), SLOs, cardinality, log tiering

## Sources Consulted
- OpenTelemetry Collector Contrib — tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- "logging exporter has been replaced with debug exporter" announcement (Issue #11337): https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector troubleshooting docs (debug exporter): https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry tail sampling blog: https://opentelemetry.io/blog/2022/tail-sampling/

## Issues Found
1. **Deprecated/removed `logging` exporter** — The Collector pipeline used the `logging` exporter (`logging: verbosity: basic` and `exporters: [otlphttp, logging]`). The `logging` exporter was deprecated in Collector v0.86.0 and **removed in v0.111.0** (October 2024). For a post dated August 2025, this configuration would fail on a current Collector. Fixed by renaming the exporter to `debug` (the direct replacement, which also supports the `verbosity` option) in both the `exporters` block and the `traces` pipeline `exporters` list.

## Review Notes
- **`tail_sampling` policies are correct.** The `status_code` (`status_codes: [ERROR]`), `latency` (`threshold_ms`), `string_attribute` (`key` / `values`), and `probabilistic` (`sampling_percentage`) policy types and field names all match the current tailsamplingprocessor schema. Note that policies are OR-combined (a trace matching any policy is kept), which is consistent with the post's intent of keeping the "weird" traffic while head-sampling the rest.
- **Node SDK Resource API is functional but trending toward deprecation.** `new Resource({ ... })` and `SemanticResourceAttributes.SERVICE_NAME` work in widely-deployed SDK versions, but newer `@opentelemetry/resources` / `@opentelemetry/semantic-conventions` releases favor `resourceFromAttributes({...})` and the `ATTR_SERVICE_NAME` constant. The post pins no versions, so the existing code is left as-is; readers on the latest SDK may see deprecation warnings.
- `AggregationTemporality` is imported in the minimal SDK setup but never used — a harmless unused import, not a correctness error.
- `span.setStatus({ code: 2 })` correctly uses `SpanStatusCode.ERROR` (value `2`); `recordException` and `setAttribute` usage is correct.
- The `otlphttp` exporter with `encoding: json` and the `x-oneuptime-token` header matches OneUptime's documented OTLP ingestion pattern.
- Quantitative claims (sampling percentages, retention tiers, MTTR targets, the end-to-end example timings) are illustrative examples, not normative specifications, and are reasonable.
