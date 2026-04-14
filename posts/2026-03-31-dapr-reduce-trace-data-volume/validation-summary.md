# Validation Summary: How to Reduce Trace Data Volume in Production Dapr Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Configuration CRD, tracing configuration)
- OpenTelemetry Collector (tail sampling processor, filter processor, attributes processor, transform processor, batch processor)
- Kubernetes (kubectl port-forward)
- OTTL (OpenTelemetry Transformation Language)

## Sources Consulted
- Dapr Configuration spec — tracing configuration fields (`samplingRate`, `otel.endpointAddress`, `otel.isSecure`, `otel.protocol`)
- OpenTelemetry Collector Contrib — `attributesprocessor` README (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md)
- OpenTelemetry Collector Contrib — `tailsamplingprocessor` README (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- OpenTelemetry Collector Contrib — `filterprocessor` README (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md)
- OpenTelemetry Collector Contrib — `transformprocessor` README (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md)
- OTTL functions reference — `truncate_all` (https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md)

## Issues Found

### Issue 1: Invalid attribute truncation syntax (Strategy 4)
**What was wrong:** The `attributesprocessor` config used `value: "${http.url:0:200}"` with the `update` action to truncate a URL attribute. The `attributesprocessor`'s `update` action only accepts static literal values — it does not support variable interpolation or substring operations. This config would either set the attribute to the literal string `${http.url:0:200}` or cause a config parsing error.

**What was changed:** Replaced the single `attributes` processor with two separate processors: `attributes/remove-bodies` (keeping the correct `delete` actions for removing HTTP body attributes) and `transform/truncate` (using the OTTL `truncate_all(attributes, 200)` function to correctly truncate all span attribute string values to 200 characters).

### Issue 2: Deprecated filter processor syntax (Strategy 3)
**What was wrong:** The filter processor config used the legacy `spans.exclude.match_type` / `span_names` syntax, which has been deprecated in favor of OTTL-based conditions.

**What was changed:** Updated to the current OTTL-based filter processor syntax using `error_mode: ignore` and `traces.span` with OTTL expressions (e.g., `'name == "/healthz"'`).

## Review Notes
- The tail sampling processor config correctly uses OR-based multi-policy evaluation (any matching policy triggers sampling). The comment "Sample 1% of everything else" is a slight simplification — the probabilistic policy actually applies to all traces, not just the remainder — but the net effect is as described since error/slow traces are already captured by the other policies.
- The Dapr Configuration CRD fields (`apiVersion: dapr.io/v1alpha1`, `spec.tracing.samplingRate` as string, `otel.endpointAddress`, `otel.isSecure`, `otel.protocol`) are all correct.
- The volume estimation math is correct (1000 req/s × 5 services × 2 spans = 10,000 spans/s × 1 KB = 10 MB/s × 86,400 s = 864 GB/day).
- The OTel Collector internal metrics endpoint (port 8888) and metric name (`otelcol_exporter_sent_spans`) are correct.
