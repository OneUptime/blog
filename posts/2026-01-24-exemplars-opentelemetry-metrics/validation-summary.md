# Validation Summary: How to Handle Exemplars in OpenTelemetry Metrics

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Metrics and Exemplars
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OTLP HTTP exporters
- Prometheus and Grafana exemplar visualization
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry SDK environment variables specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript Node.js SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript `@opentelemetry/sdk-metrics` package API / README: https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python metrics view documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Python tracing instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go metric SDK package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go exemplar package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric/exemplar
- Prometheus HTTP API exemplar documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars
- Grafana Prometheus exemplar documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/#exemplars

## Issues Found
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`, which is not the current JavaScript SDK 2.x public resource creation API. Updated it to `resourceFromAttributes(...)`.
- The Node.js example imported `View`, `Aggregation`, and `ExplicitBucketHistogramAggregation` from the top-level `@opentelemetry/sdk-metrics` package, but current SDK 2.x public examples use `ViewOptions` with `AggregationType`. Updated the view syntax accordingly.
- The Node.js example defined `views` but did not pass them to `NodeSDK`, so the custom histogram bucket configuration would not be applied. Added `views` to the `NodeSDK` configuration.
- The Node.js comments implied `recordMinMax` enabled exemplar collection. Corrected the comments because `recordMinMax` controls histogram min/max recording; exemplar sampling is separate.
- The Python example used one generic `OTEL_EXPORTER_OTLP_ENDPOINT` value as if it included both signal-specific HTTP paths. Updated it to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` with signal-specific defaults.
- The Python application code referenced `trace.Status` and `trace.StatusCode`, which are not the documented import style. Updated the example to import `Status` and `StatusCode` from `opentelemetry.trace`.
- The Go example described an exemplar filter but did not configure one. Added `sdkmetric.WithExemplarFilter(exemplar.TraceBasedFilter)` and the required import, while noting that trace-based filtering is the default.
- The Prometheus section implied PromQL itself queries exemplars alongside metrics. Updated it to clarify that PromQL queries the metric series, while Grafana or the Prometheus exemplar API can request exemplars for the same time range.
- The custom TypeScript exemplar filter example used unsupported/unstable public API assumptions and private span internals. Replaced it with the standard `OTEL_METRICS_EXEMPLAR_FILTER` configuration values: `trace_based`, `always_on`, and `always_off`.
- Updated troubleshooting and propagation wording to reflect the default trace-based exemplar filter, which requires an active sampled span.

## Review Notes
- The post is technically valid after edits. Some SDK exemplar APIs remain version-sensitive, especially JavaScript metrics internals and custom exemplar reservoir/filter support, so future updates should re-check examples against the exact OpenTelemetry SDK versions used by readers.
