# Validation Summary: How to Build a Cost-Effective Observability Platform with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Go SDK
- OTLP/gRPC
- Collector processors: filter, transform, tail sampling, probabilistic sampling, metricstransform, cumulativetodelta, batch, memory_limiter, resourcedetection
- Collector exporters: OTLP, file, Prometheus Remote Write, AWS S3, Prometheus internal telemetry
- Prometheus metrics and remote write
- Python cost modeling

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector exporter registry: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- OpenTelemetry Collector AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awss3exporter
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- OpenTelemetry transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- Prometheus Remote Write 1.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec/

## Issues Found
- The filter processor example used a non-OTTL `matches` operator. Changed it to `IsMatch(...)`, which is the documented OTTL regex function.
- The tail sampling example nested a `probabilistic` block inside a `latency` policy. Changed it to an `and` policy with separate latency and probabilistic sub-policies.
- The metrics pipeline used `deltatocumulative` while the text described delta temporality for cost reduction. Changed the example to `cumulativetodelta` with an include filter.
- The gateway logs pipeline referenced an undefined `filter` processor. Added a `filter/logs` processor and updated the pipeline reference.
- A metricstransform comment incorrectly said `aggregate_labels` converts histograms to summaries. Updated the wording to describe label aggregation accurately.
- The file exporter example used a directory-like path and described object storage directly. Changed it to a concrete rotated file path and clarified that files are written for later object-storage upload.
- The storage-tier example used deprecated `prometheusremotewrite` naming. Changed it to `prometheus_remote_write`.
- The S3 exporter example used an invalid `s3` exporter shape. Changed it to the documented `awss3` exporter with nested `s3uploader` settings.
- OTLP exporters used `zstd` compression as a general recommendation. Changed OTLP examples to `gzip`, which is the standardized OTLP compression value, while keeping `zstd` where the file and AWS S3 exporter docs support it.
- The Go SDK example imported an unused package, used an older semantic convention package, called `TraceState()` on `context.Context`, and used deprecated `trace.WithSpanLimits`. Updated imports, used `oteltrace.SpanContextFromContext(...)`, switched to current `semconv.DeploymentEnvironmentName`, and changed to `trace.WithRawSpanLimits`.
- The metrics optimization example used `metricstransform` value rewrites as regex rewrites, but that processor's `value_actions` are exact value mappings. Changed it to a transform processor example using OTTL `IsMatch`.
- The metrics filter example used older include/exclude-style filtering. Changed it to OTTL metric conditions.
- The Collector internal telemetry config used the ignored `service.telemetry.metrics.address` field. Changed it to the documented `readers` pull Prometheus configuration.
- Dashboard examples referenced non-current or nonstandard Collector internal metrics. Replaced them with documented `otelcol_processor_incoming_items`, `otelcol_processor_outgoing_items`, and `otelcol_exporter_sent_spans` examples.

## Review Notes
The Go toolchain is not installed in this workspace, so the Go snippet could not be compiled locally. The API corrections were checked against the current official Go package documentation instead.
