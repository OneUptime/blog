# Validation Summary: Build an End-to-End Alerting Pipeline from OpenTelemetry Metrics to PagerDuty

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Go SDK
- OpenTelemetry Collector
- Prometheus
- Prometheus alerting rules and PromQL
- Alertmanager
- PagerDuty Events API v2 integration through Alertmanager
- Docker Compose

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go OTLP metric gRPC exporter API: https://go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Go resource API: https://go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry HTTP semantic convention for `http.server.request.duration`: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query function documentation for `absent_over_time`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager API v2 behavior referenced from the Alertmanager OpenAPI documentation: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Go example imported `net/http` without using it and used `context.Background()` without importing `context`, so the snippet would not compile. I removed the unused import and added the missing `context` import.
- The alert rules grouped by `service_name`, but the Go metric provider did not set `service.name` explicitly. I added a resource with `service.name=api-server`, which the Collector's `resource_to_telemetry_conversion` setting exposes as `service_name`.
- The Prometheus alert rules referenced `http_server_request_duration_count` and `http_server_request_duration_bucket`. With the default OpenTelemetry-to-Prometheus translation, the `s` unit is expanded to a `_seconds` suffix, so the correct metric names are `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`. I updated the alert expressions accordingly.
- The `ServiceDown` alert used `absent_over_time` with `service_name!=""`, which cannot produce a useful per-service `service_name` label. I changed it to check the concrete `api-server` service, allowing Prometheus to derive the expected label for the alert annotation.
- The Alertmanager routes used the older `match` syntax. I updated them to the current `matchers` syntax shown in the official Alertmanager configuration documentation.
- The Docker Compose snippet used top-level `version: "3.8"`, which is obsolete in the current Compose Specification. I removed it.

## Review Notes
- `promtool` 3.11.3 validated the corrected Prometheus alert rules.
- `amtool` 0.32.1 validated the corrected Alertmanager configuration.
- `otel/opentelemetry-collector-contrib:latest` validated the Collector configuration.
- `docker compose config` validated the corrected Compose snippet.
- The Go snippet still omits production error handling around exporter and instrument creation to keep the example concise.
