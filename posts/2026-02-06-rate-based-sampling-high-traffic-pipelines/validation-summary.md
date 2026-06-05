# Validation Summary: How to Implement Rate-Based Sampling for High-Traffic Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector probabilistic sampling processor
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector internal telemetry
- OTLP/HTTP JSON
- Prometheus and PromQL
- Python aiohttp
- Go custom Collector processor concepts
- golang.org/x/time/rate

## Sources Consulted
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Tail sampling processor internal telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- Probabilistic sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- Metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Go rate package documentation: https://pkg.go.dev/golang.org/x/time/rate
- Referenced OneUptime links were opened and verified as reachable.

## Issues Found
- The probabilistic sampler was described as rate control. Changed this to volume reduction because the processor samples by probability and does not enforce spans per time unit.
- The tail sampling examples were described as sequential fallback/tiered policies. Updated the explanation to state that tail sampling samples a trace when any non-drop policy returns a sample decision.
- The "dynamic rate adjustment" language implied adaptive processor behavior that was not present in the configuration. Reworded the section as endpoint-specific static rate policies.
- The endpoint default rate policy would also match checkout/search traffic and bypass endpoint-specific limits. Updated the default policy to exclude those endpoint routes.
- Several YAML snippets referenced undefined components. Added missing receivers, exporters, and batch processor definitions where snippets included full service pipelines.
- The custom Go processor had unused imports, copied too much span data, and did not implement the per-service rates shown in its configuration. Removed unused imports, copied only allowed spans, and added per-service rate lookup.
- The monitoring section used a metrics pipeline and metric names that do not match current tail sampling internal telemetry. Replaced it with Collector internal telemetry configuration and documented tail sampling metric names.
- PromQL alert examples used nonexistent metrics. Replaced them with documented tail sampling counters.
- The Python load-test sent a simplified payload that was not a valid OTLP/HTTP JSON trace export. Replaced it with a valid `resourceSpans`/`scopeSpans`/`spans` payload using 32-character trace IDs, 16-character span IDs, string-encoded nanosecond timestamps, and integer status enum values.
- The backend query example used a vendor-specific trace search endpoint and an undefined `$sampled` variable. Replaced it with a Prometheus HTTP API query for the observed sampling rate.

## Review Notes
- YAML snippets and Python code blocks were parsed successfully after edits.
- `gofmt` was not available in the local environment, so the Go snippet could not be checked with the Go toolchain.
- Tail sampling processor metrics are internal Collector telemetry. Prometheus metric names can vary if custom telemetry readers add unit or type suffixes; the post config sets `without_type_suffix` and `without_units` to keep the documented names.
