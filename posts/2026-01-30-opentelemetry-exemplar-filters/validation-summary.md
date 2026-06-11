# Validation Summary: How to Implement OpenTelemetry Exemplar Filters

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry exemplars and exemplar filters
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector OTLP receiver/exporter configuration

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry SDK environment variables specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Go metric SDK package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go exemplar package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric/exemplar
- OpenTelemetry JavaScript SDK package documentation and published type definitions: https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- OpenTelemetry Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html

## Issues Found
- The JavaScript examples imported `AlwaysOnExemplarFilter`, `AlwaysOffExemplarFilter`, `TraceBasedExemplarFilter`, and `ExemplarFilter` from `@opentelemetry/sdk-metrics`, but those are not top-level public exports in the current JavaScript package. Replaced those snippets with spec-level `OTEL_METRICS_EXEMPLAR_FILTER` examples and clarified that SDK support varies.
- The JavaScript `MeterProvider` examples used an unsupported `exemplarFilter` option. Removed the option and clarified that current JavaScript `MeterProviderOptions` does not expose a stable custom exemplar filter hook.
- The Node.js setup used deprecated `metricReader` and `new Resource(...)`. Updated the snippet to `metricReaders` and `resourceFromAttributes(...)`.
- The custom filter section used TypeScript APIs that are not available as stable JavaScript SDK configuration. Replaced it with a Python custom `ExemplarFilter`, which is supported by the current Python SDK.
- The Python snippet imported `ExemplarFilter` from a private `_internal` path and ignored the context argument when reading the active span. Updated it to import from `opentelemetry.sdk.metrics` and call `get_current_span(context)`.
- The Go snippet did not match the current Go SDK API: Go exemplar filters are `func(context.Context) bool`, not value/attribute-aware objects. Replaced the sample with a compiling context-based filter and `metric.WithExemplarFilter(...)`.
- Updated wording that implied a `true` filter result directly attaches an exemplar. The filter only makes a measurement eligible; the exemplar reservoir makes the final storage decision.
- Fixed a TypeScript catch block that assumed `error.message` is available on an `unknown` catch value.

## Review Notes
The post now reflects that custom exemplar filter capabilities are SDK-specific. Python exposes a public custom filter hook with value and attributes; Go exposes a context-only filter; current OpenTelemetry JavaScript does not expose a stable custom filter option on `MeterProviderOptions`.
