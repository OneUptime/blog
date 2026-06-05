# Validation Summary: How to Create a Multi-Region Service Comparison Dashboard from OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK and Metrics API
- OpenTelemetry resource and HTTP semantic conventions
- OpenTelemetry Collector
- Prometheus Remote Write exporter
- PromQL
- Kubernetes Deployments
- Grafana dashboards

## Sources Consulted
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry cloud attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector Resource Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Grafana dashboard settings documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/modify-dashboard-settings/

## Issues Found
- Updated the deployment environment resource attribute from `deployment.environment` to `deployment.environment.name`, matching current OpenTelemetry resource documentation.
- Added the required `spec.selector` and matching pod labels to the Kubernetes Deployment snippet so the `apps/v1` Deployment structure is valid.
- Corrected the Collector architecture wording. Forwarding to a central metrics store still creates cross-region telemetry traffic, so the post now says the application-to-collector path stays local.
- Replaced the deprecated `prometheusremotewrite` Collector exporter type with `prometheus_remote_write`.
- Added the declared `attributes` processor to the metrics pipeline and corrected its description. The attributes processor adds attributes; it does not measure collector receive-to-export latency.
- Updated the Python HTTP metric attributes from older names such as `http.method` and `http.status_code` to current stable semantic convention names: `http.request.method` and `http.response.status_code`.
- Made the Python request handler snippet internally consistent by calculating elapsed time, creating the response before reading its status code, recording errors, and returning the response.
- Corrected the PromQL metric names for OpenTelemetry metrics exported to Prometheus with the default translation strategy. Duration metrics with unit `s` are exported with `_seconds`, so histogram bucket and count series now use names such as `http_server_request_duration_seconds_bucket`.

## Review Notes
The dashboard guidance is generally accurate. The dependency latency query assumes dependency metrics are recorded with a `dependency.name` attribute, which is a reasonable custom attribute but not shown in detail in the post.
