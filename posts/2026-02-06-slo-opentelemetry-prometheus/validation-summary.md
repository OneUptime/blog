# Validation Summary: How to Use Service Level Objectives with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OTLP
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus remote write
- Grafana
- Alertmanager

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/prometheusexporter
- OpenTelemetry Collector Prometheus remote write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/prometheusremotewriteexporter
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming practices: https://prometheus.io/docs/practices/rules/
- Prometheus remote write receiver HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver

## Issues Found
- The post used non-standard `http_server_request_total` and `http_server_request_errors_total` counters for OpenTelemetry HTTP availability examples. Updated the examples to use the stable OpenTelemetry HTTP server duration histogram count, exposed through Prometheus translation as `http_server_request_duration_seconds_count`, with 5xx responses selected via the normalized `http_response_status_code` label.
- The latency examples used `http_server_request_duration_bucket{le="200"}` and `http_server_request_duration_count`. OpenTelemetry's stable HTTP duration metric uses seconds, and the default Prometheus translation includes the `_seconds` unit suffix, so the examples now use `http_server_request_duration_seconds_bucket{le="0.2"}` and `http_server_request_duration_seconds_count`.
- The examples filtered by `service="payment-service"`, but the Collector's resource-to-telemetry conversion normalizes the OpenTelemetry `service.name` resource attribute to `service_name` in Prometheus labels. Updated the SLO definition and PromQL examples accordingly.
- The Collector remote write example targeted Prometheus' `/api/v1/write` endpoint without noting that Prometheus must enable its built-in remote write receiver. Added the `--web.enable-remote-write-receiver` note and `tls.insecure: true` for the HTTP endpoint.
- Corrected the diagram label from `Alert Manager` to the Prometheus project name `Alertmanager`.

## Review Notes
`promtool` was not installed in the workspace, so the recording rules could not be checked with Prometheus' local rule checker. The rule syntax and configuration fields were reviewed manually against the official documentation.
