# Validation Summary: How to Fix Memory Growth in Go Apps When OpenTelemetry Metric Cardinality

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- OpenTelemetry Go metrics API and SDK
- OpenTelemetry metric Views
- Go runtime memory statistics

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go attribute package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/attribute
- Go runtime package documentation: https://pkg.go.dev/runtime

## Issues Found
- The post described metric cardinality as unbounded. Current OpenTelemetry Go SDK documentation says the SDK applies a default cardinality limit of 2000, while older SDK versions or configurations can still have unbounded or too-high cardinality. Updated the wording to avoid implying current defaults are always unbounded.
- The post said a runtime memory endpoint could show how many unique attribute sets the meter is tracking. `runtime.ReadMemStats` reports Go allocator statistics, not OpenTelemetry SDK aggregation-state entries. Updated the wording to say the endpoint helps watch process memory while reproducing the workload.
- The cardinality limit example used `sdkmetric.Stream{CardinalityLimit: 1000}`, but the current `sdkmetric.Stream` type does not have a `CardinalityLimit` field. Replaced it with the current `sdkmetric.WithCardinalityLimit(1000)` `MeterProvider` option.
- The final sentence said Views enforce cardinality limits. Views can filter attributes, while cardinality limits are configured separately on the SDK. Updated the sentence to distinguish attribute filtering from cardinality limits.

## Review Notes
The code examples are illustrative snippets rather than complete compilable programs. The View `AttributeFilter` example uses the current `attribute.NewAllowKeysFilter` API, and the `WithCardinalityLimit` replacement matches current OpenTelemetry Go SDK documentation.
