# Validation Summary: How to Track Resource Utilization Trends and Forecast Capacity with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib hostmetrics receiver
- OpenTelemetry Python metrics API
- Prometheus remote write
- PromQL recording and alerting rules
- Python
- NumPy

## Sources Consulted
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector prometheusremotewrite exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusremotewriteexporter
- Prometheus remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus query basics and subquery documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery
- Prometheus query functions documentation for deriv: https://prometheus.io/docs/prometheus/latest/querying/functions/#deriv

## Issues Found
- The post described `hostmetrics` as built into the OpenTelemetry Collector generally. Updated the wording to specify the OpenTelemetry Collector Contrib distribution, which is where the receiver is documented.
- The Prometheus remote write example used `/api/v1/write` without mentioning that Prometheus must be started with `--web.enable-remote-write-receiver`. Added that requirement.
- The Prometheus queries filtered on `environment`, but the Collector config only added it as a resource attribute. Added `resource_to_telemetry_conversion.enabled: true` to the `prometheusremotewrite` exporter so those resource attributes become metric labels as used later in the post.
- The Python app metric was described and named as heap memory, but `psutil.Process().memory_info().rss` reports resident set size. Updated the surrounding text, metric name, description, and attribute value to say RSS/resident memory.
- The Prometheus alert expression divided by the trend slope without checking that the slope was positive or that the projected crossing time was in the future. Added guards so downward trends or already-negative projected times do not satisfy the forecast warning.

## Review Notes
The Python code was checked with a local AST parse using `python3`. Full runtime execution was not performed because the OpenTelemetry and psutil packages are not installed in this environment. The PromQL and Collector configuration were reviewed against official documentation rather than executed locally.
