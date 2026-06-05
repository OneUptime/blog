# Validation Summary: How to Migrate from StatsD to OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Metrics
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- StatsD and DogStatsD
- Python
- Node.js
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector StatsD receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/statsdreceiver
- OpenTelemetry Collector OTLP exporter configuration: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics export API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Python OTLP metric exporter source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/exporter/otlp/proto/http/metric_exporter.html
- OpenTelemetry JavaScript OTLP gRPC metrics exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-grpc.html
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry naming guidelines: https://opentelemetry.io/docs/specs/semconv/general/naming/
- Datadog Python DogStatsD documentation: https://datadoghq.dev/datadogpy/
- hot-shots Node.js StatsD client documentation: https://github.com/brightcove/hot-shots
- StatsD project documentation: https://github.com/statsd/statsd

## Issues Found
- The Collector `statsd` receiver example used `histogram.explicit`, which is not the current StatsD receiver schema. Changed it to `histogram.explicit_buckets` with a `matcher_pattern` and `buckets`, and added `max_size` as shown in the receiver documentation.
- The OTLP exporter example used an `http://` endpoint while also setting `tls.insecure: false`. Since `http://` indicates an insecure gRPC connection, changed the example endpoint to `https://your-backend:4317`.
- The StatsD counter mapping said both StatsD and OpenTelemetry counters are monotonically increasing. StatsD counters may be decremented in common clients, while OpenTelemetry `Counter` is monotonic. Updated the table to recommend `Counter` for monotonic values and `UpDownCounter` for decrementing counters.
- The gauge mapping was too narrow. Updated it to include gauge callbacks, synchronous gauges where available, and `UpDownCounter` for additive gauge-style changes.
- The OpenTelemetry duration examples used `ms` as the instrument unit. OpenTelemetry semantic conventions recommend seconds for durations. Changed Python and Node.js examples to use unit `s` and record `elapsed_ms / 1000` or `responseMs / 1000`.
- The metric naming note recommended unit suffixes in metric names. OpenTelemetry guidance recommends units in instrument metadata rather than metric name suffixes. Updated the wording accordingly.

## Review Notes
The migration flow is technically sound. The StatsD receiver is a Collector contrib component and is documented as beta for metrics; future posts could call out that status and the receiver's recommendation to run in agent mode rather than as a horizontally scaled shared deployment.
