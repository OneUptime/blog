# Validation Summary: Handle High-Cardinality Metrics in OpenTelemetry Without Blowing Your Budget

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK metrics
- OpenTelemetry Python SDK metric views
- OpenTelemetry Go SDK metric views
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector Cardinality Guardian processor
- Prometheus remote write exporter

## Sources Consulted
- OpenTelemetry Python SDK metric views documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry OTTL data point context reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector Cardinality Guardian processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cardinalityguardianprocessor/README.md

## Issues Found
- The Python view example imported `DropAggregation` without using it and passed `attribute_keys` as a list. Updated the snippet to import only `View` and use a set of attribute keys, matching the Python SDK view API.
- The Collector filter processor examples used older `include`/`exclude` and `datapoint` forms. Updated them to current OTTL `metric_conditions` syntax.
- Several transform processor examples used invalid or non-current OTTL paths and functions, including bare `attributes`, `ReplaceAllPatterns`, `LastIndex`, and `Hash`. Updated these to current `datapoint.attributes` paths and supported OTTL functions such as `replace_pattern`, `String`, `Substring`, `Concat`, and `SHA256`.
- The Go SDK view example imported an unused `otel` package, omitted the required `attribute` import, and used a non-current aggregation package path. Updated it to use `go.opentelemetry.io/otel/attribute` and `metric.AggregationExplicitBucketHistogram`.
- The metric sampling example used `probabilistic_sampler`, but the official processor supports traces and logs, not metrics. Replaced it with deterministic OTTL filtering for a numeric user ID cohort and explained the limitation.
- The cardinality limiter example referenced a non-existent `experimental_metricsgeneration/cardinality_limit` processor. Replaced it with the development-stage `cardinality_guardian` processor configuration and noted that it requires a custom Collector build. Also replaced the `groupbyattrs` cardinality-reduction claim with `aggregate_on_attributes`, because `groupbyattrs` moves selected attributes to resources rather than dropping all other dimensions.
- The cardinality monitoring snippet attempted to create a cardinality estimate with `set(attributes["_cardinality_estimate"], "true")`, which is invalid in metric context and does not count unique series. Replaced it with Collector throughput metrics and backend-side series count checks.

## Review Notes
The post is technically useful after correction, but several examples are version-sensitive because Collector processor configuration changed to newer OTTL-style forms. The Cardinality Guardian processor is development-stage and not included in standard Collector distributions, so production use requires a custom build and careful testing.
