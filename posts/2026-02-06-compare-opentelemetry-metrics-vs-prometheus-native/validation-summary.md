# Validation Summary: How to Compare OpenTelemetry Metrics vs Prometheus Native Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- Prometheus metrics
- PromQL
- Go
- Kubernetes service discovery and relabeling
- Prometheus remote write

## Sources Consulted
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Go metric API: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go SDK metric package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry OTLP metric gRPC exporter: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry process metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Prometheus compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus/OpenMetrics compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus native histograms: https://prometheus.io/docs/specs/native_histograms/
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus

## Issues Found
- The post described OpenTelemetry as using a push-based data model. Updated the wording to distinguish the data model from common push-based OTLP export pipelines, while preserving the note that pull exporters are supported.
- The post stated that Prometheus always uses cumulative metrics. Updated this to specify that Prometheus counters and classic histogram buckets are cumulative, while avoiding overgeneralizing gauges and other sample types.
- The OpenTelemetry Go example used older HTTP attribute names (`http.method` and `http.status_code`). Updated them to current semantic convention names (`http.request.method` and `http.response.status_code`).
- The Collector Prometheus receiver example replaced `__address__` with only the annotation port, which would produce an invalid scrape address. Updated the relabel rule to preserve the discovered pod host and replace only the port.
- The Collector pipeline referenced the `batch` processor without defining it. Added a `processors` section with `batch`.
- The post described the Collector as a drop-in replacement for Prometheus scraping. Updated this to say it centralizes Prometheus scraping in the Collector, which is more accurate.
- The OpenTelemetry histogram section claimed exponential histograms are the default in many SDKs and showed a regular histogram instrument as if that selected exponential aggregation. Updated the example to configure `AggregationBase2ExponentialHistogram` with an SDK view.
- The post said Prometheus native histograms were still evolving without noting current stability. Updated it to state that native histograms are stable in current Prometheus versions but require explicit scrape or remote write configuration.
- The naming section labeled `http.server.request.count` as an OpenTelemetry semantic convention. Updated the example to use a custom counter name and current semantic convention examples such as `http.server.request.duration` and `process.memory.usage`.

## Review Notes
The Go examples are intentionally simplified and ignore errors from constructors and `ListenAndServe`, which is acceptable for a comparison blog post but should be handled in production code. The PromQL example assumes the OpenTelemetry-to-Prometheus export path preserves or maps service identity into a queryable label; exact label names can vary by exporter/backend configuration.
