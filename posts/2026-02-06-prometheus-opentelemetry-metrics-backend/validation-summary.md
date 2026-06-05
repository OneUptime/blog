# Validation Summary: How to Set Up Prometheus as an OpenTelemetry Metrics Backend

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Prometheus
- OpenTelemetry metrics
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- PromQL alerting rules
- YAML configuration

## Sources Consulted
- Prometheus official guide, "Using Prometheus as your OpenTelemetry backend": https://prometheus.io/docs/guides/opentelemetry/
- Prometheus official configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry specification, Prometheus exporter: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry specification, Prometheus and OpenMetrics compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python API documentation for `PeriodicExportingMetricReader`: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html

## Issues Found
- The Prometheus OTLP receiver configuration used non-existent `otlp.protocols.grpc/http.endpoint` fields and implied Prometheus listens on `4317`/`4318`. Prometheus' current OTLP receiver accepts OTLP metrics over HTTP on the web endpoint path. Updated the section to use `--web.enable-otlp-receiver` and `promote_resource_attributes`.
- The Prometheus startup command used the old feature flag `--enable-feature=otlp-write-receiver`. Updated it to the current `--web.enable-otlp-receiver` flag documented by Prometheus.
- The Python example used the OTLP gRPC exporter pointed at `localhost:4317`, but Prometheus' native OTLP receiver expects OTLP/HTTP. Updated the example to use `opentelemetry.exporter.otlp.proto.http.metric_exporter.OTLPMetricExporter` and the Prometheus OTLP HTTP metrics endpoint.
- The Python counter was named `http_requests_total`, while the post also explained that `_total` is added during Prometheus translation. Renamed the OpenTelemetry instrument to `http_requests` and clarified that it is exposed as `http_requests_total`.
- The metric mapping table listed `Summary` as an OpenTelemetry metric type. Removed that row because it is not an OpenTelemetry SDK instrument mapping in this context.

## Review Notes
- The collector Prometheus exporter fields shown in the post, including `endpoint`, `namespace`, `send_timestamps`, `resource_to_telemetry_conversion`, and `enable_open_metrics`, match the current exporter documentation.
- The attributes processor example uses supported `delete` and `upsert` actions with `from_attribute`.
- The alerting examples are syntactically plausible Prometheus alerting rules, assuming the referenced metrics and promoted `service_name` label exist.
