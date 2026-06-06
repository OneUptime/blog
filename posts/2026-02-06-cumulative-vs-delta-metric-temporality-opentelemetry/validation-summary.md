# Validation Summary: How to Understand Cumulative vs Delta Metric Temporality in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python SDK and OTLP exporter
- OpenTelemetry Java SDK and OTLP exporter
- OpenTelemetry Collector processors
- Prometheus and Prometheus remote write
- OTLP metric temporality

## Sources Consulted
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry OTLP Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python MetricReader source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/metrics/_internal/export.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java AggregationTemporalitySelector Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-sdk-metrics/1.55.0/io/opentelemetry/sdk/metrics/export/AggregationTemporalitySelector.html
- OpenTelemetry Collector cumulativetodelta processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/cumulativetodeltaprocessor
- OpenTelemetry Collector deltatocumulative processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/deltatocumulativeprocessor
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/

## Issues Found
- The post claimed cumulative and delta representations encode the same information without qualification. Updated this to clarify that this applies to sums and histogram counts when streams are continuous and start times are preserved, and that cumulative histogram min/max cannot be exactly converted to delta min/max.
- The Python OTLP exporter example used API instrument classes through `metrics.Counter`, `metrics.UpDownCounter`, and `metrics.Histogram` as `preferred_temporality` keys. Updated the example to import `Counter`, `UpDownCounter`, and `Histogram` from `opentelemetry.sdk.metrics`, matching the Python SDK MetricReader configuration.
- The Python examples were missing imports for `metrics.set_meter_provider(...)` and `time.time()`. Added the missing imports.
- The Collector section implied delta-to-cumulative conversion was only a conceptual reverse transformation. Updated it to mention the current `deltatocumulative` processor and its stateful behavior.
- The serverless guidance overstated cumulative temporality as useless. Reworded it to explain that frequent resets can make rate calculations noisy or backend-dependent.
- The OTLP-native backend guidance said delta data points are smaller. Reworded it to the documented efficiency tradeoff: reduced client-side state and no need to compute differences for each cumulative stream.
- The reset section described reset detection only as value comparison. Added the OTLP `StartTimeUnixNano` nuance and limited the heuristic discussion to consumers that do not use start timestamps.
- The Java example omitted `java.time.Duration`, incorrectly described `deltaPreferred()` as delta for all instrument types, and referenced a non-existent `cumulativePreferred()` factory. Added the missing import, corrected the comment, and replaced `cumulativePreferred()` with `alwaysCumulative()` while also noting `lowMemory()`.
- The Prometheus section overstated that Prometheus has no delta temporality path. Updated it to clarify that the scrape/storage model is cumulative, and delta OTLP metrics must be converted to cumulative before storage.

## Review Notes
The code examples are illustrative and still assume surrounding application functions such as `process(request)` exist. The Collector examples require a Collector distribution that includes the referenced contrib processors and exporters.
