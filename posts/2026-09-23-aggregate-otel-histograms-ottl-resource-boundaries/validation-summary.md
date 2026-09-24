# Validation Summary: How to Aggregate OTel Histograms in OTTL Within Service and Resource Boundaries

## Status
validated

## Post Type
Technical guide with a Collector YAML configuration and a worked histogram aggregation example.

## Technologies Covered
- OpenTelemetry metrics and OTLP resource, instrumentation scope, and data-point identity
- OpenTelemetry Collector Contrib v0.160.0 and the transform processor
- OpenTelemetry Transformation Language (OTTL)
- Explicit and exponential histograms, aggregation temporality, and single-writer semantics
- OTLP HTTP receiver, debug exporter, and Prometheus translation

## Sources Consulted
- [Transform processor documentation, v0.160.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#aggregate_on_attributes) — configuration, metric context, supported aggregation functions, and optional attribute-list semantics.
- [OTTL aggregation function implementation, v0.160.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/internal/metrics/func_aggregate_on_attributes_metrics.go) — per-metric invocation and local aggregation groups.
- [Aggregation utility implementation, v0.160.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/internal/coreinternal/aggregateutil/aggregate.go) — grouping keys, attribute filtering, histogram merging, and timestamp handling.
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#opentelemetry-protocol-data-model) — resource/scope identity, histogram buckets, and temporality.
- [Single-writer principle](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#single-writer) — stream ownership and overlapping-writer consequences.
- [OTLP receiver documentation, v0.160.0](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/receiver/otlpreceiver/README.md) — HTTP protocol and endpoint configuration.
- [Debug exporter documentation, v0.160.0](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/exporter/debugexporter/README.md) — detailed verbosity.
- [HTTP metric semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) — metric name, histogram type, seconds unit, and HTTP attribute names.
- [Prometheus and OpenMetrics compatibility](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/) — cumulative bucket translation and resource-to-label mapping.

## Issues Found
- The grouping explanation omitted min/max presence and data-point flags. In v0.160.0 these are grouping keys for both histogram types, so identical attributes, bounds, and timestamps alone do not guarantee a merge. Added these conditions to the explanation and worked example.
- The general reference to histogram shape could imply that exponential bucket offsets and lengths must match. Clarified that exponential grouping uses scale instead of explicit bounds and permits differing offsets and lengths.
- The fixture expectation did not explicitly require compatible points in one metric object and scope. Tightened that prerequisite so the expected single output point per resource agrees with the function's invocation boundary.

## Review Notes
- The YAML parses successfully. Its receiver, processor, exporter, and pipeline references agree, and its OTTL statement follows the versioned documentation. No deprecated API or configuration field was identified in the example. There are no terminal commands to review.
- Independently checked the arithmetic: elementwise bucket addition gives [3, 7, 1], their total is 11, and the two sums total 3.4.
- The allowlist removes every unlisted point attribute, including any dimensions besides route. The post correctly distinguishes an empty list from an omitted list and explains that resource attributes are separate.
- The implementation confirms that grouping state is local to the current metric invocation. The transformation does not combine separate resource/scope containers or retain cross-request state.
- Delta start timestamps participate in grouping; cumulative start timestamps do not. The producer-side alignment advice remains appropriate. Zero threshold is not a grouping key or reconciled by this implementation, supporting the post's explicit compatibility requirement.
- The configuration deliberately uses error_mode: propagate for diagnostics. Runtime statement errors can fail the payload; this behavior is documented and is not a configuration error.
- The cited versioned documentation and implementation are available. The review targets v0.160.0 and does not assume identical behavior in other releases.
- Validation was based on official documentation, source inspection, YAML parsing, and arithmetic checks. A Collector process and end-to-end OTLP/backend fixture were not run; destination-specific identity handling still requires the rollout checks described in the post.
