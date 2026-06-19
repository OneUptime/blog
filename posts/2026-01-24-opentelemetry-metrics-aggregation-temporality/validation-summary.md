# Validation Summary: How to Handle Metrics Aggregation Temporality

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- Prometheus and OpenMetrics
- OTLP metric exporters
- Vendor OTLP metric backends including Datadog, New Relic, Dynatrace, Grafana Cloud, and Elastic

## Sources Consulted
- OpenTelemetry Metrics SDK exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Metrics data model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- OpenTelemetry JavaScript SDK metrics API documentation: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry JavaScript SDK source for MeterProvider and metric exporters: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry Python SDK and OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.export.html
- OpenTelemetry Python SDK source for OTLPMetricExporter and metric instruments: https://github.com/open-telemetry/opentelemetry-python
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go OTLP metric gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter
- OpenTelemetry Collector deltatocumulative processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/deltatocumulativeprocessor
- OpenTelemetry Collector cumulativetodelta processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/cumulativetodeltaprocessor
- Datadog OTLP metrics documentation: https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest/metrics/
- New Relic OTLP endpoint documentation: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/
- Dynatrace OTLP metrics ingest documentation: https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api/ingest-otlp-metrics/about-metrics-ingest
- Elastic APM OpenTelemetry metrics specification: https://github.com/elastic/apm/blob/main/specs/agents/metrics-otel.md

## Issues Found
- The JavaScript example used `MeterProvider.addMetricReader()`, which is not present in the current `@opentelemetry/sdk-metrics` API. Updated the example to pass metric readers via the `MeterProvider` constructor.
- The JavaScript example imported `Resource` and `SemanticResourceAttributes`, which are outdated for current OpenTelemetry JavaScript packages. Updated the example to use `resourceFromAttributes()` and `ATTR_SERVICE_NAME`.
- The JavaScript OTLP exporter example used `AggregationTemporality.DELTA` directly as the primary preference example. Updated it to use `AggregationTemporalityPreference.DELTA`, which is the current exporter preference enum.
- The Python `preferred_temporality` mapping used string instrument names. The API expects instrument classes as dictionary keys, so the mappings now use `Counter`, `Histogram`, `ObservableCounter`, `ObservableGauge`, `ObservableUpDownCounter`, and `UpDownCounter`.
- The Collector example said the Prometheus exporter automatically converts delta to cumulative and implied `enable_open_metrics` enabled temporality conversion. Updated the config to use the `deltatocumulative` processor for Prometheus and the `cumulativetodelta` processor for delta-oriented backends.
- The Prometheus JavaScript example used `meterProvider.addMetricReader(prometheusExporter)`. Updated it to construct `MeterProvider` with `readers: [prometheusExporter]`.
- The JavaScript histogram example placed `boundaries` on `createHistogram()`, but explicit bucket boundaries are configured through Views in the current SDK. Updated the example to use `AggregationType.EXPLICIT_BUCKET_HISTOGRAM` in a View.
- The JavaScript View example used an unimported/non-current `new SumAggregation()` form. Updated it to use `aggregation: { type: AggregationType.SUM }`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some backend preferences can change over time, so the article correctly continues to recommend checking backend documentation. Collector temporality conversion requires contrib processors and is stateful; future updates could mention the statefulness tradeoff in more detail.
